import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { RapidApiPanel } from "./RapidApiPanel";
import { useAdmin } from "@/context/AdminContext";

const sources = [
 {name:"CSV Products",href:"/admin/importers/csv",detail:"Bulk import seller listings from CSV as drafts"},
 {name:"Amazon",href:"/admin/importers/amazon",detail:"UK and USA product searches, imports and markup"},
 {name:"eBay",href:"/admin/importers/ebay",detail:"eBay searches, source-specific listing management and sync"},
 {name:"AliExpress",href:"/admin/importers/aliexpress",detail:"AliExpress search and import using the configured integration"},
 {name:"Gumtree",href:"/admin/importers/gumtree",detail:"Classified adverts and expiry controls"},
];
export function AdminImporterOverviewPage(){
 return <AdminLayout><div className="space-y-5 text-slate-900 dark:text-white">
  <div><h1 className="text-2xl font-black">Importers</h1><p className="text-slate-700 dark:text-slate-200">Each provider now has its own workspace. Choose a source to manage its searches and listings.</p></div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{sources.map(s=><Link key={s.href} href={s.href} className="block rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-5 hover:border-orange-500"><h2 className="font-bold text-lg">{s.name}</h2><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{s.detail}</p><span className="block text-orange-700 dark:text-orange-300 font-bold mt-4">Open importer →</span></Link>)}</div>
  <div className="flex flex-wrap gap-3"><Link href="/admin/importers/settings" className="rounded-lg bg-blue-700 text-white font-bold px-4 py-3">General settings</Link><Link href="/admin/importers/bulk-update" className="rounded-lg bg-orange-600 text-white font-bold px-4 py-3">Apply update to all</Link><Link href="/admin/importer-control" className="rounded-lg border border-slate-400 px-4 py-3 font-bold">Importer monitoring</Link></div>
 </div></AdminLayout>;
}
export function AdminImporterSettingsPage(){
 return <AdminLayout><div className="space-y-5"><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Importer general settings</h1><p className="text-slate-700 dark:text-slate-200">Manage shared API credentials here, rather than on every importer page.</p></div>
 <RapidApiPanel/>
 <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 p-5 text-slate-900 dark:text-white"><h2 className="font-bold">Provider configuration</h2><p className="text-sm mt-2">Provider credentials are configured on the Render API service; keys remain on the server.</p><p className="text-sm mt-2">Provider search and preview are not the same as publishing listings. Check source permissions and availability before advertising items.</p></div></div></AdminLayout>;
}
export function AdminImporterBulkUpdatePage(){
 const {authFetch}=useAdmin();
 const [markup,setMarkup]=useState("35");
 const [shipping,setShipping]=useState("3.99");
 const [amazon,setAmazon]=useState(true),[ebay,setEbay]=useState(true);
 const [busy,setBusy]=useState(false),[results,setResults]=useState<string[]>([]);
 async function apply(){
  const m=Number(markup),s=Number(shipping);
  if(!Number.isFinite(m)||m<0||m>500||!Number.isFinite(s)||s<0||s>10000){setResults(["Enter a markup between 0 and 500% and shipping between 0 and 10000."]);return;}
  if(!amazon&&!ebay){setResults(["Choose at least one supported provider."]);return;}
  if(!window.confirm("Apply this markup and shipping to ALL existing imports for selected sources? This updates live listing prices and cannot be automatically undone."))return;
  setBusy(true);setResults([]);
  const next:string[]=[];
  for(const [enabled,label,url] of [[amazon,"Amazon","/api/admin/bulk-markup"],[ebay,"eBay","/api/admin/bulk-markup-ebay"]] as const){
   if(!enabled)continue;
   try{const r=await authFetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markup:m,shipping:s})});const d=await r.json();next.push(label+": "+(r.ok?String(d.message||("Updated "+(d.updated??0)+" listings")):String(d.error||"Update failed")))}catch{next.push(label+": network error")}
   setResults([...next]);
  }
  setBusy(false);
 }
 return <AdminLayout><div className="max-w-3xl space-y-5 text-slate-900 dark:text-white">
  <h1 className="text-2xl font-black">Apply update to all</h1><p className="text-slate-700 dark:text-slate-200">Bulk-update markup and shipping on existing imported listings. This calls each existing provider's bulk-update endpoint; it does not trigger API searches.</p>
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 p-5 space-y-4">
   <h2 className="font-bold">Select importer sources</h2>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={amazon} onChange={e=>setAmazon(e.target.checked)}/> Amazon imports</label>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={ebay} onChange={e=>setEbay(e.target.checked)}/> eBay imports</label>
   <p className="text-sm text-slate-700 dark:text-slate-200">AliExpress and Gumtree are excluded until compatible, tested bulk-update endpoints exist. No unsupported provider will be silently modified.</p>
   <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm font-bold">Markup (%)<input type="number" min="0" max="500" step="0.01" value={markup} onChange={e=>setMarkup(e.target.value)} className="block w-full mt-1 rounded-lg border border-slate-400 bg-white text-slate-950 p-3"/></label><label className="text-sm font-bold">Shipping (£)<input type="number" min="0" max="10000" step="0.01" value={shipping} onChange={e=>setShipping(e.target.value)} className="block w-full mt-1 rounded-lg border border-slate-400 bg-white text-slate-950 p-3"/></label></div>
   <button disabled={busy||(!amazon&&!ebay)} onClick={apply} className="bg-orange-600 text-white font-bold rounded-lg px-5 py-3 disabled:opacity-50">{busy?"Applying updates…":"Review and apply to selected sources"}</button>
   {results.length>0&&<div role="status" className="text-sm space-y-1">{results.map((r,i)=><p key={i}>{r}</p>)}</div>}
  </div></div></AdminLayout>;
}

// Extract one CSV from a ZIP without accepting executable or nested archive content.

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
export function AdminCsvImporterPage(){
 const {authFetch}=useAdmin();
 const [csv,setCsv]=useState("");const [seller,setSeller]=useState("cczslater@gmail.com");const [region,setRegion]=useState("us");
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [result,setResult]=useState("");
 const [preview,setPreview]=useState<Record<string,string>[]>([]);\n const [zipImages,setZipImages]=useState<Record<string,ZipPicture>>({});
 function parse(text:string){
  const firstLine=text.replace(/^\uFEFF/,"").split(/\r?\n/,1)[0]||"";
  const delimiter=["\t",";",","].map(d=>({d,n:firstLine.split(d).length})).sort((a,b)=>b.n-a.n)[0].d;
  const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];
   if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(c===delimiter&&!quoted){row.push(field);field="";}
   else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field="";}
   else field+=c;
  }
  if(quoted)throw Error("Unclosed quoted field in CSV");
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  const aliases:Record<string,string>={name:"title",product:"title",product_name:"title",product_title:"title",listing_title:"title",item:"title",item_name:"title",sale_price:"price",unit_price:"price",amount:"price",cost:"price",price_usd:"price",price_gbp:"price",product_category:"category",category_name:"category",type:"category",stock:"quantity",inventory:"quantity",qty:"quantity",image:"image_url",image_link:"image_url",photo_url:"image_url",shipping_cost:"shipping_price"};
  const original=(rows.shift()||[]).map(x=>x.trim().replace(/^\uFEFF/,""));
  const headers=original.map(h=>{const key=h.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");return aliases[key]||key;});
  const missing=["title","price","category"].filter(x=>!headers.includes(x));
  if(missing.length||new Set(headers).size!==headers.length)throw Error("CSV columns detected: "+(original.join(", ")||"(none)")+". "+(missing.length?"Missing required fields: "+missing.join(", ")+". ":"")+"Use title, price, category (or equivalent headings). Each heading must be unique.");
  if(rows.length>100)throw Error("Maximum 100 rows per admin import");
  if(!rows.length)throw Error("CSV has headings but no product rows");
  return rows.map(cells=>Object.fromEntries(headers.map((h,i)=>[h,(cells[i]||"").trim()])));
 }
 async function load(file?:File){
  setPreview([]);setCsv("");setZipImages({});setResult("");setError("");if(!file)return;
  if(!/\.(csv|zip)$/i.test(file.name)||file.size>(file.name.toLowerCase().endsWith(".zip")?15_000_000:1_000_000)){setError("Choose a CSV under 1 MB or ZIP under 15 MB");return;}
  try{const archive=file.name.toLowerCase().endsWith(".zip")?await readCsvZip(file):{csv:await file.text(),images:{} as Record<string,ZipPicture>};const data=archive.csv.replace(/^\uFEFF/,"");setCsv(data);setPreview(parse(data));setZipImages(archive.images);}catch(e){setError(e instanceof Error?e.message:"Invalid CSV");}
 }
 async function submit(){
  if(busy)return;if(!csv){setError("Select a CSV file first. The preview will appear when its columns are valid.");return;}setBusy(true);setError("");setResult("");
  try{
   const rows=parse(csv);if(!rows.length)throw Error("No products found");
   const uploaded=new Map<string,string>(),keys=Object.keys(zipImages);
   for(const row of rows){
    const explicit=(row.image_url||"").trim().split("/").pop()?.toLowerCase()||"";
    const sku=(row.sku||"").trim().toLowerCase();
    const match=(explicit&&zipImages[explicit]?explicit:"")||(sku?keys.find(k=>k.replace(/\.(jpg|jpeg|png|webp)$/i,"")===sku):"");
    if(!match)continue;
    if(!uploaded.has(match)){
     const image=zipImages[match];
     const response=await authFetch("/api/admin/products/media-upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:image.filename,dataUrl:image.dataUrl})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok)throw Error("Image upload failed for "+image.filename+": "+(data.error||response.status));
     uploaded.set(match,data.url);
    }
    row.image_url=uploaded.get(match)!;
   }
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller.trim()))throw Error("Enter a seller email");
   const response=await authFetch("/api/admin/products/csv-listings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows,sellerEmail:seller.trim(),region})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Import failed");
   const failed=(data.results||[]).filter((x:{status:string})=>x.status==="error");setResult(data.created+" drafts created; "+data.skipped+" duplicates skipped. "+failed.length+" errors.");if(failed.length)setError(failed.slice(0,5).map((x:{line:number;message?:string})=>"Row "+x.line+": "+(x.message||"Import failed")).join(" | "));
  }catch(e){setError(e instanceof Error?e.message:"Import failed");}
  finally{setBusy(false);}
 }
 return <AdminLayout><div className="max-w-5xl space-y-5 text-slate-900 dark:text-white">
  <h1 className="text-2xl font-black">CSV Product Import</h1>
  <p>Import listings for a chosen seller. All imported products are saved as drafts, never published automatically. Existing seller SKUs are skipped.</p>
  <label className="block font-bold">Seller email<input value={seller} onChange={e=>setSeller(e.target.value)} placeholder="seller@example.com" className="mt-2 block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"/></label>
  <label className="block font-bold">Marketplace region<select value={region} onChange={e=>setRegion(e.target.value)} className="mt-2 block rounded-lg border border-slate-400 bg-white p-3 text-slate-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"><option value="us">USA</option><option value="uk">UK</option></select></label>
  <label className="block font-bold">CSV or ZIP file<input type="file" accept=".csv,.zip,text/csv,application/zip" className="mt-2 block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950 file:mr-4 file:rounded-md file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-orange-700" onChange={e=>void load(e.target.files?.[0])}/></label>
  <p className="text-sm">Upload a CSV directly or a ZIP containing one CSV. ZIP files are extracted and previewed before import; maximum 100 products and 100 images per batch.</p>\n  <p className="text-sm">Required columns: title, price, category. Optional: sku, description, currency, quantity, condition, image_url, ship_origin, ship_zone, shipping_price, handling_charge, tags. Images require hosted HTTPS URLs; ZIP images match by image_url filename or SKU (for example ABC123.jpg).</p>
  {Object.keys(zipImages).length>0&&<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{Object.keys(zipImages).length} images found in ZIP; matching images upload when importing.</p>}\n  {csv&&!preview.length&&!error&&<p role="status" className="font-semibold text-amber-700 dark:text-amber-300">No valid products were found. Check the CSV headings and rows.</p>}
  {preview.length>0&&<div className="rounded border border-slate-400 bg-white p-4 text-slate-950 dark:bg-slate-900 dark:text-white"><h2 className="font-bold">Preview ({preview.length})</h2><div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Title</th><th>Price</th><th>SKU</th></tr></thead><tbody>{preview.map((r,i)=><tr key={i} className="border-t"><td className="p-2">{r.title}</td><td className="p-2">{r.price}</td><td className="p-2">{r.sku}</td></tr>)}</tbody></table></div></div>}
  {error&&<p role="alert" className="rounded-lg border border-red-500 bg-red-50 p-3 font-semibold text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}{result&&<p role="status" className="font-bold">{result}</p>}
  <button type="button" disabled={busy} onClick={()=>void submit()} className="rounded-lg border-2 border-orange-800 bg-orange-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:cursor-wait disabled:border-slate-500 disabled:bg-slate-600 disabled:text-white">{busy?"Importing…":"Create "+(preview.length||"")+(preview.length?" ":"")+"draft listings"}</button>
  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">The button remains clickable so validation errors are shown instead of silently disabling it. A valid CSV preview is required before import.</p>
 </div></AdminLayout>;
}
