import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { Bell, BellOff, Bot, CheckCircle2, Clock3, ExternalLink, Pause, Play,
  Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Trash2, WandSparkles } from "lucide-react";

type Pilot={id:string;prompt:string;query:string;region:"uk"|"us";currency:string;max_total_minor:number;
 condition:string;active:boolean;alerts_enabled:boolean;drafts_enabled:boolean;last_checked_at:string|null};
type Match={pilot_id:string;listing_id:number;title:string;image:string|null;condition:string;
 public_id:string|null;price:string;currency:string;total_minor:number;item_minor:number;
 delivery_minor:number;protection_minor:number;discovered_at:string;offer_id:string|null};
type Payload={pilots:Pilot[];matches:Match[];settings:{alerts:boolean;offers:boolean;monitor:boolean}};
const pounds=(minor:number,currency:string)=>new Intl.NumberFormat("en-GB",{style:"currency",currency}).format(Number(minor||0)/100);
const panel="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172541]";
const btn="rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:brightness-90";

export function DealPilotPanel() {
 const {isSignedIn,isLoaded,getToken}=useAuth();
 const [marketRegion]=useMarketplaceRegion();
 const [data,setData]=useState<Payload|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[error,setError]=useState("");
 const [prompt,setPrompt]=useState("");
 const [region,setRegion]=useState<"uk"|"us">(marketRegion);
 const [budget,setBudget]=useState(""),[condition,setCondition]=useState("any");
 const [alerts,setAlerts]=useState(true),[drafts,setDrafts]=useState(false);
 const [offerInputs,setOfferInputs]=useState<Record<string,string>>({});
 const [reviewing,setReviewing]=useState<string|null>(null);
 const authRequest=useCallback(async(path:string,options:RequestInit={})=>{
  const token=await getToken();
  if(!token)throw Error("Sign in to use DealPilot.");
  const response=await fetch("/api"+path,{...options,cache:"no-store",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...options.headers}});
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.error||"DealPilot request failed");
  return json;
 },[getToken]);
 const load=useCallback(async()=>{
  if(!isSignedIn)return;
  setLoading(true);setError("");
  try{setData(await authRequest("/deal-pilot"));}
  catch(e){setError(e instanceof Error?e.message:"Could not load DealPilot");}
  finally{setLoading(false);}
 },[authRequest,isSignedIn]);
 useEffect(()=>{if(isLoaded&&isSignedIn)void load();},[isLoaded,isSignedIn,load]);
 const run=async(work:()=>Promise<unknown>,notice:string)=>{
  setBusy(true);setError("");setMessage("");
  try{await work();setMessage(notice);await load();}
  catch(e){setError(e instanceof Error?e.message:"Action failed");}
  finally{setBusy(false);}
 };
 const create=()=>run(async()=>{
  await authRequest("/deal-pilot",{method:"POST",body:JSON.stringify({
    prompt,region,maxTotal:budget,condition,alertsEnabled:alerts,draftsEnabled:drafts})});
  setPrompt("");setBudget("");
 },"DealPilot saved. Your first matches are being checked.");
 const update=(pilot:Pilot,changes:Record<string,boolean>)=>run(
  ()=>authRequest("/deal-pilot/"+pilot.id,{method:"PATCH",body:JSON.stringify(changes)}),
  "DealPilot preferences updated.");
 const remove=(pilot:Pilot)=>{
  if(!window.confirm("Delete this DealPilot and its matches? Existing offers will remain in My Offers."))return;
  void run(()=>authRequest("/deal-pilot/"+pilot.id,{method:"DELETE"}),"DealPilot deleted.");
 };
 const sendOffer=(pilot:Pilot,m:Match)=>{
  const key=pilot.id+":"+m.listing_id;
  const amount=Number(offerInputs[key]??(Number(m.price)*0.9).toFixed(2));
  if(!Number.isFinite(amount)||amount<1||amount>Number(m.price)){setError("Enter an amount between 1 and the item's price.");return;}
  if(!window.confirm(`Send your approved offer of ${new Intl.NumberFormat("en-GB",{style:"currency",currency:m.currency}).format(amount)} to this seller? This sends a real offer; it does not charge you.`))return;
  void run(()=>authRequest(`/deal-pilot/${pilot.id}/matches/${m.listing_id}/offer`,{
    method:"POST",body:JSON.stringify({approved:true,amount})}),
    "Offer sent to the seller. Track replies in My Offers.");
  setReviewing(null);
 };
 const pilots=data?.pilots||[];
 const matches=data?.matches||[];
 return <div className="mx-auto max-w-7xl space-y-5 pb-12 text-slate-900 dark:!text-white" data-testid="deal-pilot-panel">
  <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-violet-700 to-orange-600 px-6 py-8 text-white shadow-lg sm:px-9">
   <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-2xl">
     <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white"><Sparkles className="h-4 w-4"/> Your personal shopping assistant</span>
     <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl"><Bot className="h-10 w-10"/>Bazunk DealPilot</h1>
     <p className="mt-3 text-base font-semibold text-white">Tell DealPilot what you want, set your all-in budget and discover real Bazunk listings that fit.</p>
     <p className="mt-2 text-xs font-medium text-white/90">Never places orders or sends an offer without your approval.</p>
    </div>
    <button type="button" onClick={()=>void load()} disabled={loading||!isSignedIn}
      className={btn+" inline-flex items-center gap-2 border border-white/60 bg-white/15 text-white hover:bg-white/25"}><RefreshCw className="h-4 w-4"/> Check matches</button>
   </div>
  </header>
  {!isLoaded?<div className={panel}>Connecting to secure sign-in…</div>:
   !isSignedIn?<div className={panel+" text-center"}>
    <ShieldCheck className="mx-auto h-10 w-10 text-orange-500"/>
    <h2 className="mt-2 text-xl font-black">Your private shopping assistant</h2>
    <p className="my-3 text-sm text-slate-700 dark:text-slate-200">Sign in to save your searches, receive in-app alerts and approve offers.</p>
    <Link href="/sign-in" className={btn+" inline-flex bg-orange-600 text-white"}>Sign in to Bazunk</Link>
   </div>:<>
   {error&&<div role="alert" className="rounded-xl border border-red-400 bg-red-50 p-4 font-semibold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</div>}
   {message&&<div role="status" className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{message}</div>}
   <section className={panel}>
    <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2 dark:bg-orange-950"><WandSparkles className="h-6 w-6 text-orange-700 dark:text-orange-300"/></div>
     <div><h2 className="text-lg font-black">Create a shopping mission</h2><p className="text-sm text-slate-700 dark:text-slate-200">Up to five personalised DealPilots per account.</p></div></div>
    <form onSubmit={e=>{e.preventDefault();void create();}} className="space-y-4">
     <label className="block text-sm font-bold" htmlFor="deal-prompt">Describe what you're looking for</label>
     <textarea id="deal-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={220} required rows={3}
       placeholder="Find a PlayStation 5 under £250, excellent condition, UK only"
       className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-950 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none dark:border-slate-500 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400"/>
     <div className="grid gap-4 sm:grid-cols-3">
      <label className="space-y-1.5 text-sm font-bold">Marketplace
       <select value={region} onChange={e=>setRegion(e.target.value as "uk"|"us")} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 dark:border-slate-500 dark:bg-slate-900 dark:text-white"><option value="uk">UK · GBP</option><option value="us">USA · USD</option></select></label>
      <label className="space-y-1.5 text-sm font-bold">Max checkout total ({region==="uk"?"£":"$"})
       <input value={budget} onChange={e=>setBudget(e.target.value)} type="number" min="1" max="100000" step="0.01" placeholder="Or include in your request"
         className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 placeholder:text-slate-500 dark:border-slate-500 dark:bg-slate-900 dark:text-white"/></label>
      <label className="space-y-1.5 text-sm font-bold">Minimum condition
       <select value={condition} onChange={e=>setCondition(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 dark:border-slate-500 dark:bg-slate-900 dark:text-white">
        <option value="any">Any condition</option><option value="good">Good or better</option><option value="excellent">Excellent or better</option><option value="new">New only</option></select></label>
     </div>
     <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-900 dark:text-white">
      <label className="inline-flex items-center gap-2 text-slate-900 dark:!text-white"><input type="checkbox" checked={alerts} onChange={e=>setAlerts(e.target.checked)} className="h-4 w-4 accent-orange-600"/> Notify me about matches</label>
      <label className="inline-flex items-center gap-2 text-slate-900 dark:!text-white"><input type="checkbox" checked={drafts} onChange={e=>setDrafts(e.target.checked)} className="h-4 w-4 accent-orange-600"/> Suggest offers for my approval</label>
     </div>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-xs text-slate-700 dark:text-slate-200">Budget includes Bazunk's current single-item checkout quote: item, delivery and applicable buyer protection. Actual totals are recalculated at checkout.</p>
      <button disabled={busy||pilots.length>=5||!prompt.trim()} className={btn+" inline-flex items-center gap-2 bg-orange-600 px-6 text-white hover:bg-orange-700"}><Plus className="h-4 w-4"/> Start DealPilot</button>
     </div>
    </form>
   </section>
   <section className="space-y-3">
    <div className="flex items-center justify-between"><h2 className="text-xl font-black">My DealPilots <span className="text-base font-medium text-slate-600 dark:text-slate-300">({pilots.length}/5)</span></h2>
     <Link href="/dashboard?section=saved-searches" className="text-xs font-bold text-orange-700 underline dark:text-orange-300">Classic saved searches</Link></div>
    {loading&&!data?<p className={panel}>Checking active missions and real listings…</p>:null}
    {!loading&&pilots.length===0?<div className={panel+" text-center"}><Search className="mx-auto h-9 w-9 text-violet-500"/><p className="mt-3 font-bold">Your first mission starts above.</p><p className="text-sm text-slate-700 dark:text-slate-200">Matches are collected from real UK or US Bazunk listings, never sample products.</p></div>:null}
    {pilots.map(p=>{
      const found=matches.filter(m=>m.pilot_id===p.id);
      return <article key={p.id} className={panel+" space-y-4"}>
       <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><span className={"rounded-full px-2.5 py-1 text-xs font-bold "+(p.active?"bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100":"bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-white")}>{p.active?"Active":"Paused"}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.region.toUpperCase()} · {p.condition==="any"?"Any condition":p.condition}</span></div>
         <h3 className="mt-2 text-lg font-black">{p.query}</h3>
         <p className="text-sm text-slate-700 dark:text-slate-200">Budget: <strong>{pounds(p.max_total_minor,p.currency)}</strong> all-in · {found.length} matching items</p>
         <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><Clock3 className="h-3.5 w-3.5"/>{p.last_checked_at?"Last checked "+new Date(p.last_checked_at).toLocaleString():"Waiting for first check"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
         <button disabled={busy} onClick={()=>void update(p,{active:!p.active})} className={btn+" inline-flex items-center gap-1 border border-slate-300 text-slate-800 dark:border-slate-500 dark:text-white"}>{p.active?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{p.active?"Pause":"Resume"}</button>
         <button disabled={busy} onClick={()=>remove(p)} aria-label="Delete DealPilot" className={btn+" border border-red-300 text-red-700 dark:text-red-300"}><Trash2 className="h-4 w-4"/></button>
        </div>
       </div>
       <div className="flex flex-wrap gap-5 border-y border-slate-200 py-3 text-sm font-semibold dark:border-slate-600">
        <label className="inline-flex items-center gap-2"><input type="checkbox" disabled={busy} checked={p.alerts_enabled} onChange={e=>void update(p,{alertsEnabled:e.target.checked})} className="accent-orange-600"/>{p.alerts_enabled?<Bell className="h-4 w-4"/>:<BellOff className="h-4 w-4"/>} In-app alerts</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" disabled={busy} checked={p.drafts_enabled} onChange={e=>void update(p,{draftsEnabled:e.target.checked})} className="accent-orange-600"/>Suggest offers</label>
       </div>
       {p.active&&found.length===0?<p className="rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">No matching checkout quotes within this budget yet. DealPilot will continue checking active listings when monitoring is enabled.</p>:null}
       <div className="grid gap-3 lg:grid-cols-2">
        {p.active&&found.map(m=>{
          const k=p.id+":"+m.listing_id;
          const already=Boolean(m.offer_id);
          return <div key={k} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
           <Link href={`/listing/${m.public_id||m.listing_id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
            {m.image?<img src={m.image} alt={m.title} className="h-full w-full object-contain"/>:<div className="flex h-full items-center justify-center"><Search className="text-slate-500"/></div>}</Link>
           <div className="min-w-0 flex-1">
            <Link href={`/listing/${m.public_id||m.listing_id}`} className="line-clamp-2 text-sm font-black hover:text-orange-600">{m.title}<ExternalLink className="ml-1 inline h-3.5 w-3.5"/></Link>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{m.condition}</p>
            <p className="mt-2 text-lg font-black text-orange-700 dark:text-orange-300">{pounds(m.total_minor,p.currency)} <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">estimated total</span></p>
            <p className="text-xs text-slate-700 dark:text-slate-200">Item {pounds(m.item_minor,p.currency)} + delivery {pounds(m.delivery_minor,p.currency)} + protection {pounds(m.protection_minor,p.currency)}</p>
            {already?<Link href="/offers" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4"/> Offer sent · See My Offers</Link>:
             p.drafts_enabled&&data?.settings.offers?reviewing===k?<div className="mt-2 space-y-2 rounded-lg border border-orange-300 bg-white p-2 dark:bg-slate-800">
              <label className="block text-xs font-bold">Your offer ({m.currency})<input aria-label="Offer amount" type="number" step=".01" min="1" max={Number(m.price)} value={offerInputs[k]??(Number(m.price)*0.9).toFixed(2)} onChange={e=>setOfferInputs(v=>({...v,[k]:e.target.value}))}
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-950 dark:border-slate-500 dark:bg-slate-900 dark:text-white"/></label>
              <button disabled={busy} onClick={()=>sendOffer(p,m)} className={btn+" inline-flex items-center gap-1 bg-orange-600 text-white"}><Send className="h-4 w-4"/> Review & send offer</button>
              <button onClick={()=>setReviewing(null)} className="ml-2 text-xs font-bold underline">Cancel</button>
             </div>:<button onClick={()=>setReviewing(k)} className="mt-2 text-xs font-bold text-orange-700 underline dark:text-orange-300">Review suggested offer ({m.currency} {(Number(m.price)*0.9).toFixed(2)})</button>:null}
           </div>
          </div>;
        })}
       </div>
      </article>;
    })}
   </section>
   <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Alerts appear in Bazunk notifications when enabled; external push and email notifications are not included. Quotes are for one item and may change before checkout. Deals exclude unavailable, non-purchasable and out-of-budget listings.</p>
  </>}
 </div>;
}
