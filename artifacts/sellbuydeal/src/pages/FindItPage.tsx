import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { ArrowRight, Camera, CheckCircle2, Clock3, Handshake, ImagePlus, PackageSearch,
  Plus, RefreshCw, ShieldCheck, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useMarketplaceRegion, type MarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { CLASSIFIED_CATEGORIES } from "@/data/classifieds";

type Request={
 id:string;classified_id?:number;title:string;description:string;category:string;condition?:string|null;
 region:"uk"|"us";budget_minor:number;status:string;location:string;photos?:string|null;
 offer_count?:number;expires_at:string;selected_offer_id?:string|null;
};
type Quote={currency:string;offer_minor:number;total_minor:number;payable_gbp_minor:number;protection_gbp_minor:number;delivery_gbp_minor:number};
type Bid={id:string;request_id:string;item_title:string;description:string;condition:string;
 seller_name:string;price_minor:number;photo:string|null;status:string;region:string;quote?:Quote|null;request_title?:string;request_status?:string};
type Wanted={id:number;title:string;price:number|null;marketplace_region:string};
type Personal={requests:Request[];offers:Bid[];sellerOffers:Bid[]};
const panel="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#182641] dark:text-white sm:p-6";
const field="min-h-11 w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-base font-medium text-slate-950 outline-offset-2 focus-visible:outline focus-visible:outline-orange-500 dark:border-slate-500 dark:bg-[#101d34] dark:text-white dark:placeholder:text-slate-300";
const primary="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E96217] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#C44E0C] disabled:opacity-70";
const secondary="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 dark:border-slate-500 dark:bg-[#243551] dark:text-white dark:hover:bg-[#314565]";
const hint="text-sm font-medium text-slate-700 dark:text-slate-200";
const format=(minor:number,region:string)=>new Intl.NumberFormat(region==="us"?"en-US":"en-GB",{style:"currency",currency:region==="us"?"USD":"GBP"}).format(minor/100);
function photoFrom(photos?:string|null):string|null {
 try{const a=JSON.parse(photos||"[]");return Array.isArray(a)&&typeof a[0]==="string"?a[0]:null;}catch{return null;}
}
async function compressPhoto(file:File):Promise<string>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Use JPG, PNG or WebP.");
 if(file.size>8*1024*1024)throw Error("Use an image smaller than 8 MB.");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error("Image couldn't be opened"));img.src=url;});
  const scale=Math.min(1,640/Math.max(img.width,img.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Photo processing is not available");
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [0.78,0.62,0.45,0.3]){
   const data=canvas.toDataURL("image/jpeg",quality);if(data.length<=350000)return data;
  }
  throw Error("Photo is too large after compression; choose a smaller image.");
 }finally{URL.revokeObjectURL(url);}
}

export function FindItPage(){
 const {isLoaded,isSignedIn,getToken}=useAuth();
 const [marketRegion]=useMarketplaceRegion();
 const [region,setRegion]=useState<MarketplaceRegion>(marketRegion);
 const [browse,setBrowse]=useState<Request[]>([]);
 const [mine,setMine]=useState<Personal>({requests:[],offers:[],sellerOffers:[]});
 const [eligible,setEligible]=useState<Wanted[]>([]);
 const [suggested,setSuggested]=useState<Array<{requestId:string;listingId:number;listingTitle:string;score:number}>>([]);
 const [tab,setTab]=useState<"browse"|"mine"|"offers">("browse");
 const [creating,setCreating]=useState(false),[bidding,setBidding]=useState<string|null>(null);
 const [loading,setLoading]=useState(false),[working,setWorking]=useState(false),[recognizing,setRecognizing]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [draft,setDraft]=useState({title:"",description:"",budget:"",category:"electronics",location:"",contactName:"",
   condition:"any",days:"14",photo:""});
 const [bid,setBid]=useState({title:"",description:"",price:"",condition:"good",sellerName:"",photo:""});
 useEffect(()=>setRegion(marketRegion),[marketRegion]);
 const api=useCallback(async(path:string,init:RequestInit={},authenticated=false)=>{
  const token=authenticated?await getToken():null;
  if(authenticated&&!token)throw Error("Sign in to continue.");
  const response=await fetch("/api"+path,{...init,cache:"no-store",headers:{
    ...(init.body?{"Content-Type":"application/json"}:{}),
    ...(token?{Authorization:`Bearer ${token}`}:{}),...init.headers
  }});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||"Request failed. Please try again.");
  return body;
 },[getToken]);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [all,own,old,matches]=await Promise.all([
    api("/find-it?region="+region),
    isSignedIn?api("/find-it/mine",{},true):Promise.resolve({requests:[],offers:[],sellerOffers:[]}),
    isSignedIn?api("/find-it/eligible",{},true):Promise.resolve([]),
    isSignedIn?api("/find-it/suggested?region="+region,{},true).catch(()=>[]):Promise.resolve([])
   ]);
   setBrowse(all);setMine(own);setEligible(old);setSuggested(matches);
  }catch(e){setError(e instanceof Error?e.message:"Could not load Find It");}
  finally{setLoading(false);}
 },[api,isSignedIn,region]);
 useEffect(()=>{if(isLoaded)void refresh();},[isLoaded,refresh]);
 const act=async(operation:()=>Promise<unknown>,success:string)=>{
  setWorking(true);setError("");setNotice("");
  try{await operation();setNotice(success);await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Action failed");}
  finally{setWorking(false);}
 };
 const create=(e:React.FormEvent)=>{e.preventDefault();void act(async()=>{
  await api("/find-it",{method:"POST",body:JSON.stringify({...draft,region,budget:Number(draft.budget),days:Number(draft.days)})},true);
  setDraft({title:"",description:"",budget:"",category:"electronics",location:"",contactName:"",condition:"any",days:"14",photo:""});
  setCreating(false);setTab("mine");
 },"Your Find It request is live. Matching sellers can now compete.");};
 const sendBid=(e:React.FormEvent,id:string)=>{e.preventDefault();void act(async()=>{
  await api("/find-it/"+id+"/offers",{method:"POST",body:JSON.stringify({...bid,price:Number(bid.price)})},true);
  setBid({title:"",description:"",price:"",condition:"good",sellerName:"",photo:""});setBidding(null);
  setTab("offers");
 },"Your offer has been sent to the buyer.");};
 const accept=(r:Request,o:Bid)=>{
  if(!window.confirm(`Select ${o.seller_name}'s offer for ${r.title}? Other offers will be declined. No payment is taken yet.`))return;
  void act(()=>api(`/find-it/${r.id}/accept/${o.id}`,{method:"POST"},true),
   "Offer selected. You can now proceed to secure payment.");
 };
 const checkout=(offerId:string)=>{void act(async()=>{
  const data=await api("/stripe/special-checkout",{method:"POST",body:JSON.stringify({kind:"find_it",id:offerId})},true);
  const destination=new URL(data.url);
  if(destination.protocol!=="https:"||!(destination.hostname==="stripe.com"||destination.hostname.endsWith(".stripe.com")))throw Error("Unexpected checkout destination");
  window.location.assign(destination.href);
 },"Opening Stripe checkout…");};
 const updateStatus=(r:Request,status:"open"|"closed")=>{
  if(!window.confirm(status==="closed"?"Close this request?":"Reopen this request and let sellers offer again?"))return;
  void act(()=>api("/find-it/"+r.id,{method:"PATCH",body:JSON.stringify({status})},true),"Request updated.");
 };
 const improve=(o:Bid)=>{
  const value=window.prompt("Your improved item price (excluding fees and delivery)",String(Number(o.price_minor)/100));
  if(!value)return;
  void act(()=>api("/find-it/offers/"+o.id,{method:"PATCH",body:JSON.stringify({price:Number(value)})},true),
    "Your improved offer has been sent to the buyer.");
 };
 const upgrade=(w:Wanted)=>{
  const budget=window.prompt(`Maximum total budget for "${w.title}" (including fees and delivery):`,String(w.price??""));
  if(!budget)return;
  void act(()=>api("/find-it/upgrade",{method:"POST",body:JSON.stringify({classifiedId:w.id,budget:Number(budget),days:14})},true),
    "Your existing Wanted classified is now a Find It request.");
 };
 const attachPhoto=async(e:React.ChangeEvent<HTMLInputElement>,which:"request"|"offer")=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const img=await compressPhoto(f);if(which==="request")setDraft(p=>({...p,photo:img}));else setBid(p=>({...p,photo:img}));}
  catch(err){setError(err instanceof Error?err.message:"Image failed");}
  e.target.value="";
 };
 const bidList=(id:string)=>mine.offers.filter(o=>o.request_id===id).sort((a,b)=>(a.quote?.total_minor??Infinity)-(b.quote?.total_minor??Infinity));
 const recognize=async()=>{
  if(!draft.photo)return;
  setRecognizing(true);setError("");setNotice("");
  try{
   // Photo analysis is optional: the buyer explicitly chooses whether to send their image
   // to Bazunk's configured AI provider. Generated fields always remain editable.
   const data=await api("/snap-sell/analyse",{method:"POST",
    body:JSON.stringify({photo:draft.photo,context:"Identify the object shown. The user wants to BUY an item like this; do not describe it as their item for sale."})},true);
   const suggestion=data?.suggestion||{};
   const title=typeof suggestion.title==="string"?suggestion.title.trim().slice(0,120):"";
   const desc=typeof suggestion.description==="string"?suggestion.description.trim().slice(0,1500):"";
   const category=typeof suggestion.category==="string"?suggestion.category.trim():"";
   setDraft(old=>({
    ...old,
    title:old.title.trim()?old.title:title,
    description:old.description.trim()?old.description:(desc?"Looking for an item matching this reference photo. "+desc:""),
    category:CLASSIFIED_CATEGORIES.some(c=>c.slug===category)?category:old.category
   }));
   setNotice("Photo identified. Review the suggested title, description and category before posting.");
  }catch(e){setError(e instanceof Error?e.message:"Photo identification is unavailable. Enter the details manually.");}
  finally{setRecognizing(false);}
 };
 const signedIn=isLoaded&&isSignedIn;
 const orderedBrowse=[...browse].sort((a,b)=>
  Number(suggested.some(m=>m.requestId===b.id))-Number(suggested.some(m=>m.requestId===a.id)));
 return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0d1427] dark:text-white">
  <Navbar/>
  <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 pb-20 sm:px-6 sm:py-8" data-testid="find-it-page">
   <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#10234e] via-[#323079] to-[#d45b1e] px-5 py-8 text-white shadow-lg sm:px-10 sm:py-10">
    <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white"><Sparkles className="h-4 w-4"/>REVERSE MARKETPLACE</span>
    <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Bazunk Find It</h1>
    <p className="mt-3 max-w-2xl text-base font-semibold text-white">Tell us what you want. Set your maximum total budget. Sellers compete to make you their best offer.</p>
    <div className="mt-5 flex flex-wrap gap-2">
     <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-2 font-black text-[#14254c]" onClick={()=>{setCreating(true);setTab("mine");}}><Plus className="h-4 w-4"/>Post a request</button>
     <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/70 bg-white/10 px-5 py-2 font-black text-white" onClick={()=>{setCreating(false);setTab("browse");}}>Find buyers <ArrowRight className="h-4 w-4"/></button>
    </div>
   </header>
   <div className="grid gap-3 sm:grid-cols-3">
    {[
     {icon:Camera,label:"Describe or photograph",desc:"Post a Wanted request with a photo and clear details."},
     {icon:Handshake,label:"Compare real offers",desc:"View item condition, seller bids and your all-in checkout estimate."},
     {icon:ShieldCheck,label:"Pay through Bazunk",desc:"Select an offer, then complete verified Stripe checkout."}
    ].map(s=><div className={panel+" flex gap-3"} key={s.label}><s.icon className="h-7 w-7 shrink-0 text-orange-600 dark:text-orange-300"/><div><h2 className="font-black">{s.label}</h2><p className={hint+" mt-1"}>{s.desc}</p></div></div>)}
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Find It sections">
     {([{key:"browse",label:"Browse requests"},{key:"mine",label:"My requests"},{key:"offers",label:"My seller offers"}] as const).map(t=>
      <button key={t.key} role="tab" aria-selected={tab===t.key} onClick={()=>{setTab(t.key);setCreating(false);}}
       className={tab===t.key?primary:secondary}>{t.label}</button>)}
    </div>
    <button className={secondary} type="button" disabled={loading} onClick={()=>void refresh()}><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button>
   </div>
   {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</div>}
   {notice&&<div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{notice}</div>}
   {creating&&<section className={panel+" space-y-4"}>
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">What would you like to find?</h2><p className={hint}>Your request also appears in Bazunk's Wanted classifieds.</p></div><button aria-label="Close form" onClick={()=>setCreating(false)} className={secondary}><X className="h-5 w-5"/></button></div>
    {!signedIn?<p className={hint}>You must <Link href="/sign-in" className="font-black text-orange-700 underline dark:text-orange-300">sign in</Link> to create a request.</p>:
    <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
     <label className="sm:col-span-2 block text-sm font-black">What are you looking for?<input required minLength={3} maxLength={120} className={field+" mt-1"} value={draft.title} placeholder="e.g. PlayStation 5 Slim, excellent condition" onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label>
     <label className="sm:col-span-2 block text-sm font-black">Description and requirements<textarea required minLength={10} maxLength={2000} rows={4} className={field+" mt-1"} value={draft.description} placeholder="Model, colour, size, condition, special requirements…" onChange={e=>setDraft(d=>({...d,description:e.target.value}))}/></label>
     <label className="block text-sm font-black">Maximum all-in budget ({region==="uk"?"£":"$"})<input required type="number" step=".01" min="1" max="1000000" className={field+" mt-1"} value={draft.budget} onChange={e=>setDraft(d=>({...d,budget:e.target.value}))}/></label>
     <label className="block text-sm font-black">Marketplace<select className={field+" mt-1"} value={region} onChange={e=>setRegion(e.target.value as MarketplaceRegion)}><option value="uk">United Kingdom · GBP</option><option value="us">United States · USD</option></select></label>
     <label className="block text-sm font-black">Category<select className={field+" mt-1"} value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))}>{CLASSIFIED_CATEGORIES.map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}</select></label>
     <label className="block text-sm font-black">Preferred condition<select className={field+" mt-1"} value={draft.condition} onChange={e=>setDraft(d=>({...d,condition:e.target.value}))}>{["any","new","excellent","good","fair","used"].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
     <label className="block text-sm font-black">Your city / area<input required maxLength={120} className={field+" mt-1"} value={draft.location} onChange={e=>setDraft(d=>({...d,location:e.target.value}))}/></label>
     <label className="block text-sm font-black">Display name<input required maxLength={100} className={field+" mt-1"} value={draft.contactName} onChange={e=>setDraft(d=>({...d,contactName:e.target.value}))}/></label>
     <label className="block text-sm font-black">Request duration<select className={field+" mt-1"} value={draft.days} onChange={e=>setDraft(d=>({...d,days:e.target.value}))}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
     <label className="sm:col-span-2 block text-sm font-black"><span className="flex items-center gap-2"><ImagePlus className="h-5 w-5"/>Reference photo (optional)</span><input type="file" accept="image/jpeg,image/png,image/webp" className={field+" mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-600 file:px-3 file:py-2 file:font-bold file:text-white"} onChange={e=>void attachPhoto(e,"request")}/></label>
     {draft.photo&&<div className="sm:col-span-2 flex flex-wrap items-center gap-3">
      <img src={draft.photo} alt="Reference item" className="h-32 w-32 rounded-xl object-cover"/>
      <div className="space-y-2">
       <button type="button" disabled={recognizing||working} className={primary} onClick={()=>void recognize()}>
        <Sparkles className="h-4 w-4"/>{recognizing?"Identifying photo…":"Identify item from photo"}
       </button>
       <button type="button" className={secondary} onClick={()=>setDraft(d=>({...d,photo:""}))}>Remove photo</button>
       <p className={hint+" max-w-xs"}>Optional AI sends this photo to the configured recognition provider only when you tap Identify. Check all suggested details.</p>
      </div>
     </div>}
     <p className={hint+" sm:col-span-2"}>Budget includes item, delivery and applicable buyer protection. Payment is charged in GBP at Stripe checkout, including for US requests; the actual GBP total is shown before payment.</p>
     <button type="submit" disabled={working} className={primary+" sm:col-span-2"}>{working?"Posting…":"Post Find It request"}</button>
    </form>}
   </section>}
   {tab==="browse"&&<section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Buyers looking for something</h2><label className="flex items-center gap-2 text-sm font-bold">Show <select className={field} value={region} onChange={e=>setRegion(e.target.value as MarketplaceRegion)}><option value="uk">UK</option><option value="us">USA</option></select></label></div>
    {loading&&<p className={hint}>Loading buyer requests…</p>}
    {!loading&&!browse.length&&<div className={panel}><PackageSearch className="h-10 w-10 text-orange-600"/><p className="mt-2 font-black">No open requests in this marketplace yet.</p><p className={hint}>Be the first to post what you're looking for.</p></div>}
    <div className="grid gap-4 md:grid-cols-2">
    {orderedBrowse.map(r=><article key={r.id} className={panel+" min-w-0 space-y-3"}>
     <div className="flex items-start gap-4">{photoFrom(r.photos)&&<img src={photoFrom(r.photos)!} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover"/>}<div className="min-w-0 flex-1"><span className="text-xs font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">Buyer request · {r.region.toUpperCase()}</span>
    {suggested.some(m=>m.requestId===r.id)&&<p className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">Matches an item in your inventory</p>}<h3 className="mt-1 break-words text-lg font-black">{r.title}</h3><p className={hint+" mt-1"}>{r.location} · {r.category}</p></div></div>
     <p className={hint+" break-words"}>{r.description}</p>
     <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xl font-black">Up to {format(Number(r.budget_minor),r.region)}</span><span className={hint}>{r.offer_count||0} offers · Until {new Date(r.expires_at).toLocaleDateString()}</span></div>
     <p className={hint}>Maximum is inclusive of Bazunk fees and delivery.</p>
     <button className={secondary+" w-full"} onClick={()=>{setBidding(bidding===r.id?null:r.id);setError("");}}>{bidding===r.id?"Hide offer form":"Make this buyer an offer"} <ArrowRight className="h-4 w-4"/></button>
     {bidding===r.id&&(!signedIn?<p className={hint}>Please <Link href="/sign-in" className="font-black text-orange-700 underline dark:text-orange-300">sign in</Link> to submit your offer.</p>:
      <form onSubmit={e=>sendBid(e,r.id)} className="space-y-3 rounded-xl border border-slate-300 p-3 dark:border-slate-600">
       <h4 className="font-black">Offer your item</h4>
       <label className="block text-sm font-bold">Item title<input required minLength={3} maxLength={120} className={field+" mt-1"} value={bid.title} onChange={e=>setBid(b=>({...b,title:e.target.value}))}/></label>
       <label className="block text-sm font-bold">Description<textarea required rows={3} minLength={10} maxLength={1000} className={field+" mt-1"} value={bid.description} onChange={e=>setBid(b=>({...b,description:e.target.value}))}/></label>
       <label className="block text-sm font-bold">Your offer ({r.region==="uk"?"£":"$"})<input required type="number" min="1" step=".01" max={r.budget_minor/100} className={field+" mt-1"} value={bid.price} onChange={e=>setBid(b=>({...b,price:e.target.value}))}/></label>
       <label className="block text-sm font-bold">Condition<select className={field+" mt-1"} value={bid.condition} onChange={e=>setBid(b=>({...b,condition:e.target.value}))}>{["new","excellent","good","fair","used"].map(c=><option key={c}>{c}</option>)}</select></label>
       <label className="block text-sm font-bold">Seller display name<input required maxLength={100} className={field+" mt-1"} value={bid.sellerName} onChange={e=>setBid(b=>({...b,sellerName:e.target.value}))}/></label>
       <label className="block text-sm font-bold">Photo of your item<input type="file" accept="image/jpeg,image/png,image/webp" className={field+" mt-1"} onChange={e=>void attachPhoto(e,"offer")}/></label>
       {bid.photo&&<img src={bid.photo} alt="Your offered item" className="h-28 w-28 rounded-xl object-cover"/>}
       <p className={hint}>Your bid must fit the buyer's total budget after delivery and protection. You can submit one offer per request.</p>
       <button type="submit" disabled={working} className={primary+" w-full"}>{working?"Sending…":"Submit seller offer"}</button>
      </form>)}
    </article>)}
    </div>
   </section>}
   {tab==="mine"&&<section className="space-y-4"><h2 className="text-2xl font-black">My Find It requests</h2>
    {!signedIn?<div className={panel}>Please <Link href="/sign-in" className="font-black text-orange-700 underline dark:text-orange-300">sign in</Link> to manage your requests.</div>:
    <>
     {!mine.requests.length&&<div className={panel}>You haven't posted a Find It request yet. Select <strong>Post a request</strong> to get started.</div>}
     {mine.requests.map(r=><article key={r.id} className={panel+" space-y-3"}>
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">Request · {r.region.toUpperCase()}</p><h3 className="text-xl font-black">{r.title}</h3><p className={hint}>Up to {format(Number(r.budget_minor),r.region)} · {new Date(r.expires_at).toLocaleDateString()}</p></div>
       <span className="self-start rounded-full border border-slate-400 px-3 py-1 text-sm font-black uppercase dark:border-slate-500">{r.status}</span>
      </div>
      <p className={hint}>{r.description}</p>
      <p className="font-bold">{bidList(r.id).length} seller offers received</p>
      {bidList(r.id).map(o=><div key={o.id} className="rounded-xl border border-slate-300 p-3 dark:border-slate-600">
       <div className="flex items-start gap-3">{o.photo&&<img src={o.photo} className="h-20 w-20 rounded-xl object-cover" alt="Seller offered item"/>}<div className="min-w-0 flex-1"><h4 className="font-black">{o.item_title}</h4><p className={hint}>{o.seller_name} · {o.condition}</p><p className={hint+" mt-1"}>{o.description}</p></div></div>
       <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-black">Bid: {format(Number(o.price_minor),r.region)}</p>
         <p className="font-black text-orange-700 dark:text-orange-300">All-in: {o.quote?format(o.quote.total_minor,r.region):"Quote unavailable"}</p>
         {o.quote&&<p className={hint}>Stripe checkout: {format(o.quote.payable_gbp_minor,"uk")} GBP (includes fees & delivery)</p>}
        </div>
        {r.status==="open"&&o.status==="pending"&&o.quote&&<button className={primary} disabled={working||o.quote.total_minor>r.budget_minor} onClick={()=>accept(r,o)}>Choose offer</button>}
        {r.status==="accepted"&&r.selected_offer_id===o.id&&<button className={primary} disabled={working} onClick={()=>checkout(o.id)}><ShoppingBag className="h-4 w-4"/>Pay securely</button>}
        {o.status!=="pending"&&<span className={hint+" capitalize"}>{o.status}</span>}
       </div>
      </div>)}
      {r.status==="open"&&<button className={secondary} disabled={working} onClick={()=>updateStatus(r,"closed")}>Close request</button>}
      {(r.status==="accepted"||r.status==="closed")&&<button className={secondary} disabled={working} onClick={()=>updateStatus(r,"open")}>Reopen request</button>}
      {r.status==="purchased"&&<p className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5"/>Payment confirmed. View your order in Dashboard.</p>}
     </article>)}
     {!!eligible.length&&<section className={panel+" space-y-3"}><h3 className="text-lg font-black">Turn your existing Wanted classifieds into Find It</h3><p className={hint}>Keep the same classified, add a firm budget and start receiving seller offers.</p>{eligible.map(w=><div key={w.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 py-3 dark:border-slate-600"><strong>{w.title} · {w.marketplace_region.toUpperCase()}</strong><button className={secondary} disabled={working} onClick={()=>upgrade(w)}>Upgrade to Find It</button></div>)}</section>}
    </>}
   </section>}
   {tab==="offers"&&<section className="space-y-4"><h2 className="text-2xl font-black">My offers to buyers</h2>
    {!signedIn?<div className={panel}>Please <Link href="/sign-in" className="font-bold text-orange-700 underline dark:text-orange-300">sign in</Link> to see your offers.</div>:
     !mine.sellerOffers.length?<div className={panel}>No seller offers yet. Browse requests and submit an item you can supply.</div>:
     mine.sellerOffers.map(o=><article key={o.id} className={panel+" flex flex-wrap items-center justify-between gap-4"}>
      <div className="min-w-0"><h3 className="font-black">{o.item_title}</h3><p className={hint}>For: {o.request_title} · {format(Number(o.price_minor),o.region)}</p><p className={hint}>Status: <strong className="capitalize">{o.status}</strong> · Buyer request: {o.request_status}</p></div>
      {o.status==="pending"&&<div className="flex flex-wrap gap-2">
       <button className={secondary} disabled={working} onClick={()=>improve(o)}>Improve bid</button>
       <button className={secondary} disabled={working} onClick={()=>void act(()=>api("/find-it/offers/"+o.id+"/withdraw",{method:"POST"},true),"Offer withdrawn.")}><Trash2 className="h-4 w-4"/>Withdraw</button>
      </div>}
      {o.status==="selected"&&<span className="rounded-xl bg-emerald-100 px-3 py-2 font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">Buyer selected your offer</span>}
     </article>)}
   </section>}
   <p className={hint+" text-center"}><ShieldCheck className="mr-1 inline h-4 w-4"/>Offers are not orders. Payment is only taken in verified Stripe checkout; final fees and currency conversion can change until payment.</p>
  </main><Footer/>
 </div>;
}
