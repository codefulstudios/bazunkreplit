import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
import {Bell,RefreshCw,TrendingDown,PackageCheck,Search} from "lucide-react";
type Report={events:Array<{event_type:string;total:number}>;watchers:{subscriptions:number;price_drop_enabled:number;restock_enabled:number};searches:{saved_searches:number;search_alerts:number};updatedAt:string;note:string};
export function AdminListingAlertsPanel(){
 const {authFetch,isAdmin}=useAdmin();
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 async function refresh(){
  setLoading(true);setError("");
  try{
   const res=await authFetch("/api/admin/listing-alerts/monitor",{cache:"no-store"});
   const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Cannot load marketplace alert metrics");
   setReport(data);
  }catch(e){setError(e instanceof Error?e.message:"Listing alert monitor unavailable");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(isAdmin)void refresh();},[isAdmin]);
 const totals=report?.events||[];
 return <section className="admin-alerts-panel space-y-4 rounded-2xl border-2 border-orange-200 bg-white p-5 dark:border-orange-700 dark:bg-[#172541]">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><Bell className="h-5 w-5 text-orange-600"/>Persistent buyer alerts</h2>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Database-backed price drops, restocks, watcher preferences and saved searches</p></div>
    <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex min-h-10 items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"><RefreshCw className="h-4 w-4"/>Refresh</button>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {report&&<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[
     {label:"Price drops (7d)",value:totals.find(x=>x.event_type==="price_drop")?.total||0,icon:TrendingDown},
     {label:"Restocks (7d)",value:totals.find(x=>x.event_type==="restock")?.total||0,icon:PackageCheck},
     {label:"Saved search alerts on",value:report.searches?.search_alerts||0,icon:Search},
     {label:"Explicit alert preferences",value:report.watchers?.subscriptions||0,icon:Bell}
    ].map(x=>{const Icon=x.icon;return <div key={x.label} className="bz-metric-card rounded-xl p-3">
      <Icon className="mb-2 h-5 w-5 text-orange-600"/><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{x.label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{x.value}</p>
    </div>})}
   </div>
   <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{report.note} Updated {new Date(report.updatedAt).toLocaleString("en-GB")}.</p>
  </>}
 </section>;
}
