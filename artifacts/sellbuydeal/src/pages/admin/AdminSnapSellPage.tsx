import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { AdminListingAlertsPanel } from "@/components/admin/AdminListingAlertsPanel";
import { useAdmin } from "@/context/AdminContext";
import { Camera, ScanBarcode, WandSparkles, ShieldCheck, RefreshCw, AlertTriangle, Activity, Settings2 } from "lucide-react";
type Event={operation:string;provider:string;result:string;total:number};
type Failure={operation:string;provider:string;error_code:string;created_at:string};
type Report={status:{enabled:boolean;barcode:boolean;writing:boolean;background:boolean;backgroundConfigured:boolean;pricing:boolean;aiConfigured:boolean;model:string};summary:{sellers:number;ai_attempts:number;catalogue_attempts:number};usage:Event[];failures:Failure[];updatedAt:string;note:string};
export function AdminSnapSellPage(){
 const {authFetch,isAdmin}=useAdmin();
 const [report,setReport]=useState<Report|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function refresh(){
  setLoading(true);setError("");
  try{
   const res=await authFetch("/api/admin/snap-sell/monitor",{cache:"no-store"});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"Unable to load Snap & Sell monitoring.");
   if(!data.status)throw Error("Invalid Snap & Sell monitoring response.");
   setReport(data);
  }catch(e){setError(e instanceof Error?e.message:"Snap & Sell reporting unavailable");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(isAdmin)void refresh();},[isAdmin]);
 const v=report?.status;
 const text="text-slate-900 dark:text-white";
 return <AdminLayout><div className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="bz-contrast-hero rounded-3xl bg-gradient-to-r from-orange-600 to-violet-700 p-6 text-white">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs font-black uppercase tracking-wider text-white">Marketplace AI tools</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black"><Camera className="h-8 w-8"/>Snap & Sell Control Centre</h1><p className="mt-2 text-sm font-semibold text-white">Photo recognition, ISBN and barcode catalogues, writing assistance and listing quality.</p></div>
    <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex items-center gap-2 rounded-xl border border-white/50 bg-white/15 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><RefreshCw className="h-4 w-4"/>{loading?"Refreshing…":"Refresh"}</button>
   </div>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {loading&&!report&&<p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-white">Checking Snap & Sell service readiness…</p>}
  {report&&<>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {[
     {title:"Snap & Sell",value:v?.enabled?"Enabled":"Disabled",icon:Camera,ok:v?.enabled},
     {title:"ISBN & barcode catalogue",value:v?.barcode?"Enabled":"Disabled",icon:ScanBarcode,ok:v?.enabled&&v?.barcode},
     {title:"AI writing",value:v?.writing?"Enabled":"Disabled",icon:WandSparkles,ok:v?.writing},
     {title:"AI provider key",value:v?.aiConfigured?"Configured":"Missing",icon:ShieldCheck,ok:v?.aiConfigured},
     {title:"Background cleanup",value:v?.backgroundConfigured?"Provider configured":"Provider key missing",icon:Camera,ok:v?.background&&v?.backgroundConfigured},
     {title:"Seller pricing insights",value:v?.pricing?"Enabled":"Disabled",icon:Activity,ok:v?.pricing}
    ].map(x=>{const Icon=x.icon;return <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-[#172541]">
      <Icon className="h-5 w-5 text-orange-600"/><p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{x.title}</p>
      <p className={`mt-1 text-xl font-black ${x.ok?"text-emerald-700 dark:text-emerald-300":"text-amber-800 dark:text-amber-200"}`}>{x.value}</p>
    </div>})}
   </div>
   {!v?.aiConfigured&&<div role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
    <AlertTriangle className="mr-2 inline h-5 w-5"/>AI recognition and description generation require an <code>OPENAI_API_KEY</code> on the Bazunk production API in Render. Never put the secret in browser settings or the GitHub repository.
    Barcode and ISBN lookup can still work independently.
   </div>}
   <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#172541]">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className={`flex items-center gap-2 text-lg font-black ${text}`}><Settings2 className="h-5 w-5 text-orange-600"/>Availability & safety controls</h2>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Control each capability from existing audited Feature Toggles; no keys or customer photos are shown here.</p></div>
     <Link href="/admin/feature-toggles" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">Open Feature Toggles →</Link>
    </div>
    <p className="text-sm text-slate-700 dark:text-slate-200">Model: <strong>{v?.model}</strong>. Limits per account: 20 photo and 20 writing attempts, 10 background cleanups and 80 catalogue lookups in 24 hours. Generated content always requires seller review.</p>
    {!v?.backgroundConfigured&&<p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">Optional photo background cleanup needs a REMOVE_BG_API_KEY set securely on the production Render API. Pricing suggestions do not require this key.</p>}
   </section>
   <AdminListingAlertsPanel />
   <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#172541]">
    <h2 className={`flex items-center gap-2 text-lg font-black ${text}`}><Activity className="h-5 w-5 text-orange-600"/>Last 7 days — real usage</h2>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {[["Accounts using tools",report.summary.sellers],["AI requests",report.summary.ai_attempts],["Catalogue lookups",report.summary.catalogue_attempts]].map(([title,count])=><div key={String(title)} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</p><p className={`mt-1 text-2xl font-black ${text}`}>{count}</p>
      </div>)}
    </div>
    {report.usage.length?<div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-sm">
       <thead className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"><tr><th className="p-3">Operation</th><th className="p-3">Provider</th><th className="p-3">Result</th><th className="p-3">Count</th></tr></thead>
       <tbody className="text-slate-800 dark:text-slate-100">{report.usage.map((u,i)=><tr key={i} className="border-t border-slate-200 dark:border-slate-700"><td className="p-3 font-bold">{u.operation}</td><td className="p-3">{u.provider}</td><td className="p-3">{u.result}</td><td className="p-3 font-black">{u.total}</td></tr>)}</tbody>
      </table></div>:<p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No tool requests recorded in the last seven days.</p>}
   </section>
   <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#172541]">
    <h2 className={`flex items-center gap-2 text-lg font-black ${text}`}><AlertTriangle className="h-5 w-5 text-orange-600"/>Recent errors</h2>
    {report.failures.length?<div className="max-h-80 space-y-2 overflow-y-auto">{report.failures.map((f,i)=><div key={i} className="flex flex-wrap justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
     <span>{f.operation} · {f.provider} · {f.error_code||"Unknown error"}</span><span>{new Date(f.created_at).toLocaleString("en-GB")}</span>
    </div>)}</div>:<p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No recorded tool failures.</p>}
    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{report.note} Last checked {new Date(report.updatedAt).toLocaleString("en-GB")}.</p>
   </section>
  </>}
 </div></AdminLayout>;
}
