import { useCallback,useEffect,useRef,useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { AlertTriangle,Activity,RefreshCw } from "lucide-react";
type Provider={key:string;label:string;imported:number;failed:number;active:number;lastSync:string|null;
 health:Array<{source:string;status:string;lastCheck:string|null;lastSuccess:string|null;message:string|null}>;
 coverage:string;failures:Array<{id:number;title:string;publicId:string;error:string;lastChecked:string|null}>};
type Data={checkedAt:string;sources:Provider[];usage:{ebayRequestsThisMonth:number;ebayErrorsThisMonth:number;ebayLastCall:string|null};note:string};
export function AdminImporterMonitoring(){
 const {authFetch}=useAdmin();const req=useRef(authFetch);req.current=authFetch;
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{const r=await req.current("/api/admin/importers/monitor",{cache:"no-store"});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Importer monitoring unavailable");
   setData(d);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to load importer status");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 return <section className="space-y-4 rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-4 dark:border-orange-800 dark:bg-[#172541]" aria-label="Unified importer monitoring">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><Activity className="h-5 w-5 text-orange-600"/>Unified importer monitoring</h2>
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Source health, sync freshness, request usage and exceptions in one view.</p></div>
    <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex min-h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{loading?"Loading…":"Refresh monitor"}</button>
  </div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {data&&<>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[["Recorded eBay calls this month",data.usage.ebayRequestsThisMonth],["Recorded API errors this month",data.usage.ebayErrorsThisMonth],["Last recorded call",data.usage.ebayLastCall?new Date(data.usage.ebayLastCall).toLocaleString("en-GB"):"Never"]].map(([k,v])=><div key={String(k)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
       <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{k}</p><p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{v}</p>
      </div>)}
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
     {data.sources.map(s=><div key={s.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
       <h3 className="text-lg font-black text-slate-950 dark:text-white">{s.label}</h3>
       <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[["Tracked",s.imported],["Active",s.active],["Problems",s.failed]].map(([k,v])=><div key={String(k)} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><p className="text-xl font-black text-slate-950 dark:text-white">{v}</p><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{k}</p></div>)}
       </div>
       <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Last synced: {s.lastSync?new Date(s.lastSync).toLocaleString("en-GB"):"Not recorded"}</p>
       {s.health.length?<div className="mt-2 space-y-1">{s.health.map(h=><p key={h.source} className={`rounded-lg p-2 text-xs font-bold ${h.status==="connected"?"bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100":"bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>{h.source}: {h.status} · {h.lastCheck?new Date(h.lastCheck).toLocaleString("en-GB"):"not checked"}</p>)}</div>
       :<p className="mt-2 rounded-lg bg-amber-100 p-2 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">External provider health: not checked</p>}
       <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{s.coverage}</p>
       {s.failures.length>0&&<details className="mt-3 rounded-lg border border-red-200 p-2 dark:border-red-700">
         <summary className="flex cursor-pointer items-center gap-1 text-xs font-bold text-red-800 dark:text-red-200"><AlertTriangle className="h-4 w-4"/>Show {s.failures.length} recent problems</summary>
         <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{s.failures.map(x=><div key={x.id} className="border-t border-red-200 pt-2 text-xs text-slate-900 dark:border-red-800 dark:text-slate-100">
          <p className="font-bold">{x.title||x.publicId||x.id}</p><p className="break-words text-red-700 dark:text-red-200">{x.error}</p>
          <p className="text-slate-600 dark:text-slate-300">{x.lastChecked?new Date(x.lastChecked).toLocaleString("en-GB"):"Never synced"}</p>
         </div>)}</div>
       </details>}
     </div>)}
    </div>
    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{data.note} Snapshot: {new Date(data.checkedAt).toLocaleString("en-GB")}.</p>
  </>}
 </section>;
}
