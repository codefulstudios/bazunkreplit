import {useCallback,useEffect,useState} from "react";
import {useAuth as useClerkAuth} from "@clerk/react";
import {useMarketplaceRegion} from "@/hooks/useMarketplaceRegion";
import {Link} from "wouter";
import {BarChart3,TrendingUp,RefreshCw,Eye,Heart} from "lucide-react";
type RecordRow={id:number;title:string;public_id:string|null;price:string;currency:string;category:string;status:string;views:number;watchers:number;recommendations:string[]};
type Compare={count:number;median:number|null;range:{low:number;high:number}|null;currency:string;suggestions:string[];method:string};
export function SellerPricingInsightsPanel(){
 const {getToken}=useClerkAuth(),[region]=useMarketplaceRegion();
 const [rows,setRows]=useState<RecordRow[]>([]),[chosen,setChosen]=useState<RecordRow|null>(null),[comp,setComp]=useState<Compare|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function query(url:string,options?:RequestInit){
  const token=await getToken();if(!token)throw Error("Sign in to review your seller insights.");
  const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options?.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Seller insights unavailable");return d;
 }
 const load=useCallback(async()=>{
  setLoading(true);try{
    const r=await query("/api/snap-sell/performance");
    setRows(Array.isArray(r.listings)?r.listings:[]);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Cannot load your listing performance");}
  finally{setLoading(false);}
 },[getToken]);
 useEffect(()=>{void load();},[load]);
 async function compare(item:RecordRow){
  setChosen(item);setComp(null);setError("");setBusy(true);
  try{const data=await query("/api/snap-sell/pricing",{method:"POST",body:JSON.stringify({
   category:item.category,currency:item.currency,price:Number(item.price),region})});
   setComp(data);
  }catch(e){setError(e instanceof Error?e.message:"Comparison unavailable");}finally{setBusy(false);}
 }
 const fmt=(v:number,currency:string)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:currency==="USD"?"USD":"GBP"}).format(v);
 return <section className="space-y-4 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm dark:border-orange-700 dark:bg-[#102541]" data-testid="seller-pricing-insights">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><BarChart3 className="h-5 w-5 text-orange-600"/>Listing performance & pricing suggestions</h2>
     <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Suggestions use your actual recorded listing views and watchers plus similar active asking prices.</p></div>
    <button type="button" onClick={()=>void load()} disabled={loading} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><RefreshCw className="h-4 w-4"/>Refresh</button>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {loading&&!rows.length&&<p role="status" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading seller performance…</p>}
  {!loading&&!rows.length&&<p className="text-sm text-slate-600 dark:text-slate-300">No listings available for analysis. <Link href="/sell/snap" className="font-black text-orange-600 underline">Start with Snap & Sell</Link>.</p>}
  {rows.length>0&&<div className="max-h-[440px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-700">
   {rows.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
      <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <span>{fmt(Number(item.price),item.currency)}</span><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5"/>{item.views} views</span><span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5"/>{item.watchers} watchers</span>
      </div>
      {item.recommendations.map((rec,i)=><p key={i} className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-200">{rec}</p>)}
    </div>
    <button type="button" disabled={busy||!item.category||item.status!=="active"} onClick={()=>void compare(item)}
      className="flex min-h-10 items-center gap-1.5 rounded-lg border border-orange-400 bg-orange-50 px-3 py-2 text-xs font-black text-orange-900 disabled:opacity-50 dark:bg-orange-950 dark:text-orange-100"><TrendingUp className="h-4 w-4"/>Compare price</button>
   </div>)}
  </div>}
  {chosen&&comp&&<div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/40">
    <h3 className="font-black text-slate-950 dark:text-white">Price comparison — {chosen.title}</h3>
    <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{comp.count} active asking-price comparisons.
      Median: {comp.median===null?"Not enough data":fmt(comp.median,comp.currency)}.
      {comp.range&&` Middle range: ${fmt(comp.range.low,comp.currency)}–${fmt(comp.range.high,comp.currency)}.`}
    </p>
    {comp.suggestions.map((x,i)=><p key={i} className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{x}</p>)}
    <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Comparison uses the currently selected {region.toUpperCase()} marketplace. {comp.method} No prices are changed automatically.</p>
  </div>}
 </section>;
}
