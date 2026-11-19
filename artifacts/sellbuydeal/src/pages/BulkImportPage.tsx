import { useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
    if(row.image_url&&!/^https:\/\//i.test(row.image_url))errors.push("Image must be an HTTPS URL");
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
  async function choose(file?:File){
    setItems([]);setResults([]);setError("");
    if(!file)return;
    if(!file.name.toLowerCase().endsWith(".csv")||file.size>2_000_000){setError("Choose a CSV file under 2 MB.");return;}
    try{setItems(validate(await file.text()));}catch(e){setError(e instanceof Error?e.message:"Invalid CSV");}
  }
  async function run(){
    if(running||!items.length||items.some(x=>x.errors.length))return;
    const email=user?.primaryEmailAddress?.emailAddress;
    if(!email){setError("Sign in with a verified seller email.");return;}
    setRunning(true);setError("");const messages:string[]=[];
    try{
      const token=await getToken();if(!token)throw Error("Sign in again.");
      for(const item of items){
        const r=item.row;
        try{
          const response=await fetch("/api/listings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({
            title:r.title,description:r.description||r.title,price:r.price,currency:(r.currency||"USD").toUpperCase(),
            category:r.category,quantity:Number(r.quantity||"1"),condition:r.condition||"brand-new",
            image:r.image_url||null,sellerEmail:email,marketplaceRegion:region,status:publish?"active":"draft",
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
      <label className="block font-bold">Select CSV<input className="mt-2 block w-full" type="file" accept=".csv,text/csv" onChange={e=>void choose(e.target.files?.[0])}/></label>
      <label className="mt-4 block">Marketplace region <select className="ml-2 rounded border bg-white p-2 text-slate-900" value={region} onChange={e=>setRegion(e.target.value as "us"|"uk")}><option value="us">USA</option><option value="uk">UK</option></select></label>
      <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/> Publish immediately instead of saving drafts</label>
      <p className="mt-3 text-sm text-slate-500">Image URLs must be publicly accessible HTTPS links. Local image ZIP upload is not supported in this version. Reimporting the same CSV can create duplicates; check existing SKUs before importing.</p>
    </div>
    {error&&<p role="alert" className="mt-4 text-red-600">{error}</p>}
    {items.length>0&&<section className="mt-6"><h2 className="text-xl font-bold">Preview: {items.length} products · {invalid} invalid</h2>
      <div className="mt-3 max-h-96 overflow-auto rounded border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Row</th><th className="p-2">Title</th><th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2">Validation</th></tr></thead><tbody>{items.map(x=><tr key={x.line} className="border-t"><td className="p-2">{x.line}</td><td className="p-2">{x.row.title}</td><td className="p-2">{x.row.price}</td><td className="p-2">{x.row.quantity||1}</td><td className="p-2">{x.errors.length?<span className="text-red-600">{x.errors.join("; ")}</span>:<span className="text-green-600">Ready</span>}</td></tr>)}</tbody></table></div>
      <button type="button" disabled={running||invalid>0||!isSignedIn} onClick={()=>void run()} className="mt-4 rounded-lg bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-50">{running?"Importing…":publish?"Publish "+items.length+" listings":"Create "+items.length+" drafts"}</button>
    </section>}
    {results.length>0&&<section className="mt-6" aria-live="polite"><h2 className="font-bold">Import results ({results.length}/{items.length})</h2><ul className="mt-2 max-h-64 overflow-auto text-sm">{results.map((s,i)=><li key={i} className="py-1">{s}</li>)}</ul></section>}
  </main><Footer/></>;
}
