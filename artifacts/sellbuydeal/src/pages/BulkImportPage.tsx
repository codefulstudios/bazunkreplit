import { useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type ZipPicture={filename:string;mime:string;dataUrl:string};
async function readCsvZip(file:File):Promise<{csv:string;images:Record<string,ZipPicture>}>{
 if(file.size>15_000_000)throw Error("ZIP must be under 15 MB");
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break;}}
 if(end<0)throw Error("Invalid ZIP archive");
 const count=view.getUint16(end+10,true),directory=view.getUint32(end+16,true);
 if(count<1||count>150||directory>=bytes.length)throw Error("ZIP contains too many files or is invalid");
 let offset=directory;
 const entries:{name:string;method:number;size:number;packed:number;local:number;flags:number}[]=[];
 const decoder=new TextDecoder();
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw Error("Invalid ZIP directory");
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),packed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),nameLen=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  if(offset+46+nameLen+extra+comment>bytes.length)throw Error("Invalid ZIP filename");
  const name=decoder.decode(bytes.slice(offset+46,offset+46+nameLen));
  entries.push({name,method,size,packed,local,flags});offset+=46+nameLen+extra+comment;
 }
 const validName=(name:string)=>!name.startsWith("/")&&!name.includes("\\")&&!name.split("/").some(part=>part===".."||part==="__MACOSX");
 const csvFiles=entries.filter(e=>validName(e.name)&&e.name.toLowerCase().endsWith(".csv"));
 if(csvFiles.length!==1)throw Error("ZIP must contain exactly one CSV file");
 const extract=async(entry:typeof entries[number],maxSize:number):Promise<Uint8Array>=>{
  if(entry.flags&1)throw Error("Encrypted ZIP entries are unsupported");
  if(entry.size>maxSize||entry.packed>15_000_000)throw Error("ZIP entry too large: "+entry.name);
  if(entry.method!==0&&entry.method!==8)throw Error("Unsupported ZIP compression");
  const p=entry.local;
  if(p+30>bytes.length||view.getUint32(p,true)!==0x04034b50)throw Error("Invalid ZIP entry");
  const begin=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true);
  if(begin+entry.packed>bytes.length)throw Error("Truncated ZIP entry");
  const compressed=bytes.slice(begin,begin+entry.packed);
  if(entry.method===0){if(compressed.length!==entry.size)throw Error("ZIP size mismatch");return compressed;}
  if(typeof DecompressionStream==="undefined")throw Error("ZIP extraction is unsupported by this browser");
  const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat)).getReader();
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maxSize){await reader.cancel();throw Error("Extracted ZIP entry exceeds limit");}chunks.push(value);}
  if(total!==entry.size)throw Error("ZIP size mismatch");
  const output=new Uint8Array(total);let pos=0;for(const chunk of chunks){output.set(chunk,pos);pos+=chunk.length;}return output;
 };
 const csv=decoder.decode(await extract(csvFiles[0],1_000_000));
 const images:Record<string,ZipPicture>={};
 const imageEntries=entries.filter(e=>validName(e.name)&&/\.(jpg|jpeg|png|webp)$/i.test(e.name));
 if(imageEntries.length>100)throw Error("ZIP supports at most 100 images");
 for(const entry of imageEntries){
  const content=await extract(entry,3_145_728);
  const mime=/\.png$/i.test(entry.name)?"image/png":/\.webp$/i.test(entry.name)?"image/webp":"image/jpeg";
  const valid=mime==="image/png"?[137,80,78,71,13,10,26,10].every((b,i)=>content[i]===b):mime==="image/jpeg"?content[0]===255&&content[1]===216:decoder.decode(content.slice(0,4))==="RIFF"&&decoder.decode(content.slice(8,12))==="WEBP";
  if(!valid)throw Error("Invalid image: "+entry.name);
  const filename=entry.name.split("/").pop()!,key=filename.toLowerCase();
  if(images[key])throw Error("Duplicate image filename: "+filename);
  let binary="";for(let i=0;i<content.length;i+=8192)binary+=String.fromCharCode(...content.slice(i,i+8192));
  images[key]={filename,mime,dataUrl:"data:"+mime+";base64,"+btoa(binary)};
 }
 return {csv,images};
}
type Row = Record<string,string>;
type Checked = { row: Row; line: number; errors: string[] };
const columns = ["sku","title","description","price","currency","category","quantity","condition","image_url","ship_origin","ship_zone","shipping_price","handling_charge","tags"];
function parseCSV(source: string): string[][] {
  const result:string[][]=[];let record:string[]=[];let value="";let quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"'){if(quoted&&source[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===","&&!quoted){record.push(value);value="";}
    else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&source[i+1]==="\n")i++;record.push(value);if(record.some(v=>v.trim()))result.push(record);record=[];value="";}
    else value+=c;
  }
  if(quoted)throw Error("Unclosed quoted CSV field");
  record.push(value);if(record.some(v=>v.trim()))result.push(record);
  return result;
}
function validate(source:string):Checked[]{
  const records=parseCSV(source.replace(/^\uFEFF/,""));
  if(!records.length)throw Error("CSV is empty");
  const headers=records.shift()!.map(h=>h.trim().toLowerCase());
  if(new Set(headers).size!==headers.length)throw Error("Duplicate CSV column headings");
  for(const required of ["title","price","category"])if(!headers.includes(required))throw Error("Missing column: "+required);
  if(records.length>500)throw Error("Import up to 500 listings at a time");
  const skus=new Set<string>();
  return records.map((cells,i)=>{
    const row:Row={};headers.forEach((key,j)=>row[key]=(cells[j]||"").trim());
    const errors:string[]=[];
    if(cells.length>headers.length)errors.push("Too many columns");
    if(!row.title||row.title.length>180)errors.push("Title must be 1–180 characters");
    if(!row.category)errors.push("Category required");
    if(!/^\d+(\.\d{1,2})?$/.test(row.price)||Number(row.price)<=0||Number(row.price)>1000000)errors.push("Invalid price");
    if(row.quantity&&(!/^\d+$/.test(row.quantity)||Number(row.quantity)>100000))errors.push("Invalid quantity");
    if(row.currency&&!["USD","GBP","EUR"].includes(row.currency.toUpperCase()))errors.push("Currency must be USD, GBP or EUR");
    if(row.image_url&&!/^https:\/\//i.test(row.image_url)&&!/^[^/\\\\]+\.(jpg|jpeg|png|webp)$/i.test(row.image_url))errors.push("Image must be an HTTPS URL or image filename");
    if(row.sku){if(skus.has(row.sku))errors.push("Duplicate SKU in CSV");skus.add(row.sku);}
    for(const key of ["shipping_price","handling_charge"])if(row[key]&&(!/^\d+(\.\d{1,2})?$/.test(row[key])||Number(row[key])>100000))errors.push("Invalid "+key);
    return {row,line:i+2,errors};
  });
}
export default function BulkImportPage(){
  const {getToken,isSignedIn}=useAuth();const {user}=useUser();
  const [items,setItems]=useState<Checked[]>([]);const [error,setError]=useState("");
  const [running,setRunning]=useState(false);const [results,setResults]=useState<string[]>([]);
  const [region,setRegion]=useState<"us"|"uk">("us");
  const [publish,setPublish]=useState(false);
  const [zipImages,setZipImages]=useState<Record<string,ZipPicture>>({});
  async function choose(file?:File){
    setItems([]);setResults([]);setError("");setZipImages({});
    if(!file)return;
    if(!/\.(csv|zip)$/i.test(file.name)||file.size>(file.name.toLowerCase().endsWith(".zip")?15_000_000:2_000_000)){setError("Choose a CSV under 2 MB or ZIP under 15 MB.");return;}
    try{const archive=file.name.toLowerCase().endsWith(".zip")?await readCsvZip(file):{csv:await file.text(),images:{} as Record<string,ZipPicture>};setZipImages(archive.images);setItems(validate(archive.csv));}catch(e){setError(e instanceof Error?e.message:"Invalid CSV");}
  }
  async function run(){
    if(running||!items.length||items.some(x=>x.errors.length))return;
    const email=user?.primaryEmailAddress?.emailAddress;
    if(!email){setError("Sign in with a verified seller email.");return;}
    setRunning(true);setError("");const messages:string[]=[];
    try{
      const token=await getToken();if(!token)throw Error("Sign in again.");
      const uploaded=new Map<string,string>();const imageKeys=Object.keys(zipImages);
      for(const item of items){
        const r=item.row;
        try{
          let imageUrl=r.image_url||null;
          const explicit=r.image_url&&!/^https:\/\//i.test(r.image_url)?r.image_url.split("/").pop()!.toLowerCase():"";
          const match=(explicit&&zipImages[explicit]?explicit:"")||(r.sku?imageKeys.find(k=>k.replace(/\.(jpg|jpeg|png|webp)$/i,"")===r.sku.toLowerCase()):"");
          if(match){
            if(!uploaded.has(match)){
              const picture=zipImages[match];
              const upload=await fetch("/api/seller/products/media-upload",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({filename:picture.filename,dataUrl:picture.dataUrl})});
              if(!upload.ok)throw Error("Image upload failed for "+picture.filename);
              const media=await upload.json();uploaded.set(match,String(media.url));
            }
            imageUrl=uploaded.get(match)!;
          }
          const response=await fetch("/api/listings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({
            title:r.title,description:r.description||r.title,price:r.price,currency:(r.currency||"USD").toUpperCase(),
            category:r.category,quantity:Number(r.quantity||"1"),condition:r.condition||"brand-new",
            image:imageUrl,sellerEmail:email,marketplaceRegion:region,status:publish?"active":"draft",
            sku:r.sku||undefined,shipOrigin:r.ship_origin||"USA",shipZone:r.ship_zone||"international",
            shippingPrice:r.shipping_price||"0",handlingCharge:r.handling_charge||"0",tags:r.tags||undefined
          })});
          if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.message||body.error||"HTTP "+response.status);}
          messages.push("Row "+item.line+": created");
        }catch(e){messages.push("Row "+item.line+": FAILED — "+(e instanceof Error?e.message:"Unknown error"));}
        setResults([...messages]);
      }
    }catch(e){setError(e instanceof Error?e.message:"Import failed");}
    finally{setRunning(false);}
  }
  const invalid=items.filter(x=>x.errors.length).length;
  const template=columns.join(",")+"\n"+"PHOTO-001,Beach portrait,Printed 8x10 photograph,19.99,USD,Adult Media,10,brand-new,https://example.com/photo.jpg,USA,international,0,0,portrait";
  return <><Navbar/><main className="mx-auto max-w-5xl px-4 py-12 text-slate-900 dark:text-white">
    <Link href="/sell" className="text-orange-500">← Back to selling</Link>
    <h1 className="mt-5 text-3xl font-black">Bulk product import</h1>
    <p className="mt-2 text-slate-600 dark:text-slate-300">Upload a CSV, check every row, then import to your own seller account. Imports default to drafts.</p>
    <a className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 font-bold text-white" href={"data:text/csv;charset=utf-8,"+encodeURIComponent(template)} download="bazunk-import-template.csv">Download CSV template</a>
    <div className="mt-6 rounded-xl border border-slate-300 p-5 dark:border-slate-600">
      <label className="block font-bold">Select CSV or image ZIP<input className="mt-2 block w-full" type="file" accept=".csv,.zip,text/csv,application/zip" onChange={e=>void choose(e.target.files?.[0])}/></label>
      <label className="mt-4 block">Marketplace region <select className="ml-2 rounded border bg-white p-2 text-slate-900" value={region} onChange={e=>setRegion(e.target.value as "us"|"uk")}><option value="us">USA</option><option value="uk">UK</option></select></label>
      <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/> Publish immediately instead of saving drafts</label>
      <p className="mt-3 text-sm text-slate-500">Upload a CSV or a ZIP containing one CSV and JPG, PNG or WebP images named after their SKU. Maximum 100 images per ZIP. Existing seller SKUs are skipped.</p>
    </div>
    {error&&<p role="alert" className="mt-4 text-red-600">{error}</p>}
    {items.length>0&&<section className="mt-6"><h2 className="text-xl font-bold">Preview: {items.length} products · {invalid} invalid</h2>
      <div className="mt-3 max-h-96 overflow-auto rounded border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Row</th><th className="p-2">Title</th><th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Validation</th></tr></thead><tbody>{items.map(x=><tr key={x.line} className="border-t"><td className="p-2">{x.line}</td><td className="p-2">{x.row.title}</td><td className="p-2">{x.row.price}</td><td className="p-2">{x.row.quantity||1}</td><td className="p-2">{x.errors.length?<span className="text-red-600">{x.errors.join("; ")}</span>:<span className="text-green-600">Ready</span>}</td></tr>)}</tbody></table></div>
      <button type="button" disabled={running||invalid>0||!isSignedIn} onClick={()=>void run()} className="mt-4 rounded-lg bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-50">{running?"Importing…":publish?"Publish "+items.length+" listings":"Create "+items.length+" drafts"}</button>
    </section>}
    {results.length>0&&<section className="mt-6" aria-live="polite"><h2 className="font-bold">Import results ({results.length}/{items.length})</h2><ul className="mt-2 max-h-64 overflow-auto text-sm">{results.map((s,i)=><li key={i} className="py-1">{s}</li>)}</ul></section>}
  </main><Footer/></>;
}
