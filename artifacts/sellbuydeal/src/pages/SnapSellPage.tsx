import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CATEGORIES } from "@/data/categories";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { Camera, ScanBarcode, WandSparkles, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, ImagePlus, Star, Trash2, BookOpen } from "lucide-react";

type Suggestion={title:string;description:string;category:string;subcategory:string;brand:string;model:string;tags:string[];attributes:Array<{key:string;value:string}>;warnings:string[]};
type Quality={score:number;recommendations:string[];checks:Array<{label:string;ok:boolean}>};
type Capabilities={enabled:boolean;barcode:boolean;aiWriting:boolean;aiPhoto:boolean;recognitionConfigured:boolean;limits:{photoMb:number;aiRequests24h:number;lookups24h:number};note:string};
export const SNAP_SELL_DRAFT_KEY="bazunk:snap-sell:draft:v1";
const empty=():Suggestion=>({title:"",description:"",category:"",subcategory:"",brand:"",model:"",tags:[],attributes:[],warnings:[]});
const field="block w-full min-h-11 rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none dark:border-slate-600 dark:bg-[#182b49] dark:text-white dark:placeholder:text-slate-300";
const label="space-y-1 text-sm font-bold text-slate-900 dark:text-white";
const action="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50";
async function resizePhoto(file:File):Promise<string>{
 if(!file.type.startsWith("image/"))throw Error("Please upload a photograph.");
 if(file.size>15*1024*1024)throw Error("Photo is too large (maximum 15MB original).");
 const src=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error("Cannot read this photograph"));image.src=src;});
  const max=1200,ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image processing is unavailable");
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL("image/jpeg",.78);
  if(data.length>2.8e6)throw Error("Photo cannot be reduced under 2MB; please try a smaller image.");
  return data;
 }finally{URL.revokeObjectURL(src);}
}
export function SnapSellPage(){
 const [,go]=useLocation();
 const {getToken,isSignedIn}=useClerkAuth();
 const [region]=useMarketplaceRegion();
 const [caps,setCaps]=useState<Capabilities|null>(null);
 const [image,setImage]=useState(""),[barcode,setBarcode]=useState(""),[notes,setNotes]=useState("");
 const [draft,setDraft]=useState<Suggestion>(empty);
 const [price,setPrice]=useState(""),[condition,setCondition]=useState("");
 const [shipping,setShipping]=useState(false),[quality,setQuality]=useState<Quality|null>(null);
 const [source,setSource]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState("");
 const [cameraSupported,setCameraSupported]=useState(false);
 const upload=useRef<HTMLInputElement>(null);
 const scanned=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  fetch("/api/snap-sell/capabilities",{cache:"no-store"}).then(r=>r.json()).then(setCaps).catch(()=>setError("Snap & Sell settings could not be loaded."));
  setCameraSupported(typeof (window as any).BarcodeDetector==="function");
 },[]);
 useEffect(()=>{
  let active=true;
  const timer=window.setTimeout(async()=>{
    if(!isSignedIn || !caps?.enabled || !draft.title)return;
    try{
      const token=await getToken();if(!token)return;
      const r=await fetch("/api/snap-sell/quality",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({title:draft.title,description:draft.description,photos:image?1:0,category:draft.category,condition,price:Number(price),shipping})});
      if(r.ok&&active)setQuality(await r.json());
    }catch{/* an optional quality check must not block manual editing */}
  },250);
  return()=>{active=false;window.clearTimeout(timer);};
 },[draft.title,draft.description,draft.category,image,condition,price,shipping,isSignedIn,getToken,caps?.enabled]);
 async function request(url:string,options:RequestInit={}){
  if(!isSignedIn)throw Error("Sign in to use Snap & Sell.");
  const token=await getToken();if(!token)throw Error("Please sign in again.");
  const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.body?{"Content-Type":"application/json"}:{}),...options.headers},cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"The service could not process that request.");
  return data;
 }
 function apply(values:Suggestion,origin:string){
  setDraft(prev=>({
   title:values.title||prev.title,description:values.description||prev.description,
   category:values.category||prev.category,subcategory:values.subcategory||prev.subcategory,
   brand:values.brand||prev.brand,model:values.model||prev.model,
   tags:values.tags?.length?values.tags:prev.tags,
   attributes:values.attributes?.length?values.attributes:prev.attributes,
   warnings:values.warnings||[]
  }));
  setSource(origin);
 }
 async function imageChange(files:FileList|null,tryBarcode=false){
  const file=files?.[0];if(!file)return;
  setError("");setBusy("photo");
  try{
   const data=await resizePhoto(file);
   if(tryBarcode){
    const ctor=(window as any).BarcodeDetector;
    if(!ctor){setError("Automatic barcode decoding isn't supported in this browser. Enter the number below or take a clearer picture.");}
    else {
     const bitmap=await createImageBitmap(file);
     try{
      const detector=new ctor({formats:["ean_13","ean_8","upc_a","upc_e","code_128","itf"]});
      const codes=await detector.detect(bitmap);
      const detected=String(codes?.[0]?.rawValue||"").replace(/[\s-]/g,"");
      if(detected){setBarcode(detected);setSource("Barcode detected: "+detected);}
      else setError("No readable barcode found. Try a closer image or enter the number manually.");
     }finally{bitmap.close();}
    }
   }else setImage(data);
  }catch(e){setError(e instanceof Error?e.message:"Unable to read the image");}
  finally{setBusy("");}
 }
 async function photoAnalyse(){
  if(!image)return;
  setBusy("analyse");setError("");
  try{
   const data=await request("/api/snap-sell/analyse",{method:"POST",body:JSON.stringify({photo:image,context:notes})});
   apply(data.suggestion,"AI photo recognition");
  }catch(e){setError(e instanceof Error?e.message:"Photo recognition unavailable");}
  finally{setBusy("");}
 }
 async function lookup(){
  if(!barcode.trim())return;
  setBusy("lookup");setError("");
  try{
   const data=await request("/api/snap-sell/lookup/"+encodeURIComponent(barcode.replace(/[\s-]/g,"")));
   apply(data.suggestion,data.source+" catalogue · "+data.code);
  }catch(e){setError(e instanceof Error?e.message:"Product lookup failed");}
  finally{setBusy("");}
 }
 async function improve(){
  if(!draft.title.trim())return;
  setBusy("write");setError("");
  try{
   const data=await request("/api/snap-sell/write",{method:"POST",
    body:JSON.stringify({title:draft.title,description:draft.description,notes})});
   apply({...data.suggestion,title:draft.title},"AI-assisted writing");
  }catch(e){setError(e instanceof Error?e.message:"Writing assistant unavailable");}
  finally{setBusy("");}
 }
 function continueToListing(){
  if(!draft.title.trim()){setError("Enter a product title first.");return;}
  if(!condition){setError("Please select your item’s actual condition before continuing.");return;}
  const validCategory=CATEGORIES.find(c=>c.name===draft.category||c.slug===draft.category);
  const validSub=validCategory?.subcategories.find(x=>x.name===draft.subcategory||x.slug===draft.subcategory);
  const payload={title:draft.title.trim(),description:draft.description.trim(),photos:image?[image]:[],
    price,condition,category:validCategory?.name||"",
    subcategory:validSub?.name||"",tags:draft.tags.join(", "),
    specifications:[...draft.attributes,...(draft.brand?[{key:"Brand",value:draft.brand}]:[]),...(draft.model?[{key:"Model",value:draft.model}]:[]),...(barcode?[{key:"Barcode / ISBN",value:barcode}]:[])],
    marketplaceRegion:region,source};
  try{sessionStorage.setItem(SNAP_SELL_DRAFT_KEY,JSON.stringify(payload));}
  catch{setError("Browser storage is full. Try a smaller photo or clear other tabs before continuing.");return;}
  go("/sell/direct");
 }
 const update=(key:keyof Suggestion,value:string)=>setDraft(prev=>({...prev,[key]:value}));
 return <div className="flex min-h-screen flex-col bg-[#f5f8ff] dark:bg-[#07172e]">
 <Navbar/>
 <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-7 sm:px-6">
  <header className="rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-fuchsia-600 p-6 text-white shadow-xl sm:p-8">
   <p className="text-xs font-black uppercase tracking-widest text-white">Bazunk seller studio</p>
   <h1 className="mt-2 flex items-center gap-3 text-3xl font-black sm:text-4xl"><Camera className="h-9 w-9"/>Snap & Sell</h1>
   <p className="mt-2 max-w-3xl text-sm font-semibold text-white sm:text-base">Snap a product photo, scan a barcode or ISBN, then edit the details and make a great listing. You control the final price, condition and publication.</p>
   <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">{["Recognise photos","Scan ISBN / EAN / UPC","Improve descriptions","Review before listing"].map(t=><span key={t} className="rounded-full bg-black/20 px-3 py-2">{t}</span>)}</div>
  </header>
  {!isSignedIn&&<p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">Sign in to use Snap & Sell. <button type="button" onClick={()=>go("/sign-in")} className="ml-2 underline">Sign in →</button></p>}
  {caps&&!caps.enabled&&<p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">Snap & Sell is currently disabled by the marketplace administrator. You can still use the regular <button type="button" onClick={()=>go("/sell/direct")} className="underline">Direct Sale form</button>.</p>}
  {caps?.enabled&&!caps?.aiPhoto&&<p className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100"><AlertTriangle className="mr-2 inline h-4 w-4"/>AI photo recognition isn't available until a provider is configured. Barcode/ISBN scanning and manual editing are independent and can still be used.</p>}
  {error&&<div role="alert" className="flex items-start gap-2 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100"><AlertTriangle className="h-5 w-5 shrink-0"/>{error}<button type="button" onClick={()=>setError("")} className="ml-auto underline">Dismiss</button></div>}
  <div className="grid items-start gap-5 lg:grid-cols-2">
   <div className="space-y-5">
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#102541]">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><ImagePlus className="h-5 w-5 text-orange-600"/>1. Add a product photo</h2>
      <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e=>void imageChange(e.target.files)} aria-label="Upload item photo"/>
      {image?<div className="relative overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 dark:border-slate-600">
        <img src={image} alt="Your item photograph" className="mx-auto max-h-80 w-full object-contain"/>
        <button type="button" onClick={()=>setImage("")} className="absolute right-2 top-2 flex gap-1 rounded-lg bg-red-700 p-2 text-sm font-bold text-white"><Trash2 className="h-4 w-4"/>Remove photo</button>
      </div>:<button type="button" onClick={()=>upload.current?.click()} disabled={!!busy||caps?.enabled===false} className="flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-400 bg-orange-50 p-4 text-center font-bold text-orange-900 hover:bg-orange-100 disabled:opacity-50 dark:bg-orange-950 dark:text-orange-100"><Camera className="h-10 w-10"/>Tap to take or upload a product photo<span className="text-xs font-semibold">JPEG, PNG or WebP. Your image is resized before analysis.</span></button>}
      <label className={label}>Optional product details to help recognition
       <textarea rows={2} maxLength={600} value={notes} onChange={e=>setNotes(e.target.value)} className={field} placeholder="e.g. Used game console, includes two controllers; scratches on case"/>
      </label>
      <button type="button" onClick={()=>void photoAnalyse()} disabled={!image||!!busy||!isSignedIn||!caps?.aiPhoto} className={action+" w-full bg-gradient-to-r from-purple-700 to-fuchsia-600"}><WandSparkles className="h-5 w-5"/>{busy==="analyse"?"Analysing your photo…":"Recognise item from photo"}</button>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Your photo is sent to the configured AI provider only when you press Recognise. It is not saved to Snap & Sell usage logs. Check all generated facts before selling.</p>
    </section>
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#102541]">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><ScanBarcode className="h-5 w-5 text-orange-600"/>2. Scan a barcode or ISBN</h2>
      <input ref={scanned} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Scan barcode photograph" onChange={e=>void imageChange(e.target.files,true)}/>
      <div className="flex flex-wrap gap-2">
       <button type="button" disabled={!!busy||!caps?.barcode} onClick={()=>scanned.current?.click()} className={action+" bg-blue-700"}><ScanBarcode className="h-4 w-4"/>Scan with camera/photo</button>
       <span className="self-center text-xs font-semibold text-slate-600 dark:text-slate-300">{cameraSupported?"Barcode decoding supported by browser":"Manual entry available if your browser cannot decode barcodes"}</span>
      </div>
      <label className={label}>EAN / UPC / ISBN number
       <input value={barcode} onChange={e=>setBarcode(e.target.value)} className={field} inputMode="numeric" placeholder="e.g. 9780140328721" maxLength={24}/>
      </label>
      <button type="button" disabled={!!busy||!barcode.trim()||!isSignedIn||!caps?.barcode} onClick={()=>void lookup()} className={action+" w-full bg-blue-700"}><BookOpen className="h-5 w-5"/>{busy==="lookup"?"Searching product catalogues…":"Look up product"}</button>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Looks up ISBN data from Open Library and UPC/EAN data from UPCitemdb. Catalogue matches may be unavailable or incomplete.</p>
    </section>
    {quality&&<section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#102541]">
     <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><Star className="h-5 w-5 text-orange-600"/>Listing quality: {quality.score}/100</h2>
     <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500" style={{width:quality.score+"%"}}/></div>
     <ul className="mt-3 space-y-2">{quality.checks.map(c=><li key={c.label} className="flex items-start gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200"><CheckCircle2 className={`h-4 w-4 shrink-0 ${c.ok?"text-emerald-600":"text-slate-400"}`}/>{c.label}</li>)}</ul>
     <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Guidance only — not a guarantee of search ranking or sales.</p>
    </section>}
   </div>
   <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#102541]">
    <div><h2 className="text-xl font-black text-slate-950 dark:text-white">3. Review and edit your listing</h2><p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Suggestions never publish automatically. Confirm every detail yourself.</p></div>
    {source&&<p className="rounded-lg bg-blue-50 p-3 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-100">Latest suggestion: {source}</p>}
    <label className={label}>Product title
      <input className={field} maxLength={150} value={draft.title} onChange={e=>update("title",e.target.value)} placeholder="Brand, model and item name"/>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className={label}>Suggested category
      <select className={field} value={draft.category} onChange={e=>{update("category",e.target.value);setDraft(p=>({...p,category:e.target.value,subcategory:""}));}}>
       <option value="">Choose category later</option>
       {draft.category&&!CATEGORIES.some(c=>c.name===draft.category||c.slug===draft.category)&&<option value={draft.category}>{draft.category} (AI suggestion — confirm)</option>}
       {CATEGORIES.map(c=><option key={c.slug} value={c.name}>{c.name}</option>)}
      </select>
     </label>
     <label className={label}>Price ({region==="uk"?"£":"$"}) — you decide
      <input type="number" step="0.01" min="0" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Enter asking price" className={field}/>
     </label>
    </div>
    <label className={label}>Your item's actual condition
      <select value={condition} onChange={e=>setCondition(e.target.value)} className={field}>
       <option value="">Select condition after checking the item</option>
       {[["brand-new","Brand new"],["like-new","Like new"],["good","Good"],["fair","Fair"],["poor","Poor / for parts"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </label>
    <label className={label}>Listing description
      <textarea className={field} rows={7} maxLength={3500} value={draft.description} onChange={e=>update("description",e.target.value)} placeholder="Describe what is included, how it works and any marks or defects"/>
    </label>
    <label className={label}>Brand (if confirmed)
      <input className={field} value={draft.brand} onChange={e=>update("brand",e.target.value)} placeholder="Optional"/>
    </label>
    <label className={label}>Model (if confirmed)
      <input className={field} value={draft.model} onChange={e=>update("model",e.target.value)} placeholder="Optional"/>
    </label>
    <label className={label}>Search tags (comma-separated)
      <input className={field} value={draft.tags.join(", ")} onChange={e=>setDraft(p=>({...p,tags:e.target.value.split(",").map(v=>v.trim()).filter(Boolean).slice(0,12)}))}/>
    </label>
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 dark:border-slate-600 dark:text-white">
     <input type="checkbox" checked={shipping} onChange={e=>setShipping(e.target.checked)} className="h-5 w-5 accent-orange-600"/>I can provide delivery or collection information
    </label>
    {draft.attributes.length>0&&<div><h3 className="mb-2 text-sm font-black text-slate-900 dark:text-white">Suggested product attributes (verify first)</h3>
     <div className="flex flex-wrap gap-2">{draft.attributes.map((a,i)=><span key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{a.key}: {a.value}</span>)}</div>
    </div>}
    {draft.warnings.length>0&&<div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100"><h3 className="mb-2 font-black">Please verify</h3><ul className="list-inside list-disc space-y-1">{draft.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
    <button type="button" onClick={()=>void improve()} disabled={!draft.title.trim()||!!busy||!isSignedIn||!caps?.aiWriting} className={action+" w-full bg-purple-700"}><WandSparkles className="h-5 w-5"/>{busy==="write"?"Writing suggestions…":"AI: improve description and recommendations"}</button>
    <div className="border-t border-slate-200 pt-4 dark:border-slate-600">
     <button type="button" onClick={continueToListing} disabled={!draft.title.trim()||!condition||!isSignedIn||caps?.enabled===false} className={action+" w-full bg-orange-600 hover:bg-orange-700"}>Continue to editable Direct Sale <ArrowRight className="h-5 w-5"/></button>
     {!condition&&<p className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-200">Choose the condition of your actual item to continue.</p>}
     <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><ShieldCheck className="h-4 w-4 shrink-0"/>You'll confirm your category, shipping, photos and price before publishing. Nothing is listed by Snap & Sell automatically.</p>
    </div>
   </div>
  </div>
 </main><Footer/>
 </div>;
}
