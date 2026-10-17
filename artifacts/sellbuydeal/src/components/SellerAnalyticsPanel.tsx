import { useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Eye, Heart, ShoppingBag, BarChart3, Megaphone, Banknote, Clock, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";

type Metrics={
  listings:{listing_count:number;active_listings:number;views:number;watchers:number};
  orders:{sales:number;delivered:number;sales_net:string;eligible:string;pending:string;held:string;transferred:string};
  promotions:{promoted_listings:number;active_promotions:number;promoted_listings_with_views:number};
  salesPer100Views:number;note:string;
};
const pound=(v:unknown)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v)||0);
export function SellerAnalyticsPanel({financeOnly=false}:{financeOnly?:boolean}){
  const {getToken}=useClerkAuth();
  const [data,setData]=useState<Metrics|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const token=await getToken();
      if(!token)throw new Error("Sign in to view your seller metrics");
      const r=await fetch("/api/dashboard/seller-metrics",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const v=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(v.error||"Could not load seller metrics");
      setData(v);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load seller metrics");}
    finally{setLoading(false);}
  },[getToken]);
  useEffect(()=>{void load();},[load]);
  const payoutCards=[
    {label:"Eligible for release",amount:data?.orders.eligible,description:"Delivered; subject to approval and account checks",icon:CheckCircle2},
    {label:"Pending delivery",amount:data?.orders.pending,description:"Awaiting delivery before release",icon:Clock},
    {label:"Held / review",amount:data?.orders.held,description:"Disputes or unresolved refund restrictions",icon:ShieldAlert},
    {label:"Transferred to Stripe",amount:data?.orders.transferred,description:"Sent to Stripe Connect; bank payout may be later",icon:Banknote},
  ];
  const stats=[
    {label:"Total listing views",value:data?.listings.views??0,icon:Eye},
    {label:"Item watchers",value:data?.listings.watchers??0,icon:Heart},
    {label:"Sales",value:data?.orders.sales??0,icon:ShoppingBag},
    {label:"Sales per 100 views",value:`${data?.salesPer100Views??0}`,icon:BarChart3},
    {label:"Promoted listings",value:data?.promotions.promoted_listings??0,icon:Megaphone},
    {label:"Active promotions",value:data?.promotions.active_promotions??0,icon:Megaphone},
  ];
  return <section className="space-y-4" aria-label={financeOnly?"Seller payout balances":"Seller analytics"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-lg font-black text-slate-950 dark:text-white">{financeOnly?"Payout balances":"Seller analytics"}</h2>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Calculated from your actual orders and listings, not demonstration figures</p></div>
      <button onClick={()=>void load()} type="button" disabled={loading} className="flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:bg-slate-800 dark:text-white"><RefreshCw className="h-4 w-4"/>Refresh</button>
    </div>
    {loading&&!data&&<p role="status" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loading seller data…</p>}
    {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {data&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {payoutCards.map((item,i)=>{const Icon=item.icon;return <div key={item.label} className={`rounded-2xl border-2 p-4 shadow-sm ${i===0?"border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950":"border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900"}`}>
        <Icon className={`h-5 w-5 ${i===0?"text-emerald-700 dark:text-emerald-300":"text-orange-600 dark:text-orange-300"}`}/>
        <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 dark:text-white">{pound(item.amount)}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
      </div>})}
    </div>}
    {data&&!financeOnly&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {stats.map(item=>{const Icon=item.icon;return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
        <Icon className="mb-2 h-5 w-5 text-orange-600 dark:text-orange-300"/>
        <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
      </div>})}
    </div>}
    {data&&<p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{data.note}</p>}
  </section>;
}
