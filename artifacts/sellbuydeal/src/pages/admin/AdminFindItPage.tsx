import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { AlertTriangle, CheckCircle2, Handshake, RefreshCw, ShieldCheck } from "lucide-react";

type Row={id:string;title:string;region:"uk"|"us";buyer_email:string;location:string;
 status:string;budget_minor:number;created_at:string;expires_at:string;offer_count:number};
type Report={summary:{status:string;n:number}[];regions:{region:string;n:number}[];requests:Row[]};
const card="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-slate-950 dark:border-slate-600 dark:bg-[#1b2b49] dark:text-white";
const button="rounded-xl border border-slate-400 bg-white px-3 py-2 font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-500 dark:bg-[#2b3a59] dark:text-white dark:hover:bg-slate-700";

export function AdminFindItPage(){
 const {authFetch,isAdmin}=useAdmin();
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(false),[working,setWorking]=useState<string|null>(null);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const [filter,setFilter]=useState("all");
 async function load(){
  setLoading(true);setError("");
  try{
   const r=await authFetch("/api/admin/find-it",{cache:"no-store"});
   const json=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(json.error||"Find It monitoring unavailable");
   setReport(json);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load controls");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(isAdmin)void load();},[isAdmin]);
 async function moderate(row:Row,status:"paused"|"open"|"closed"){
  if(!window.confirm(`Change "${row.title}" to ${status}? This affects its visibility and buyer activity.`))return;
  setWorking(row.id);setError("");setMessage("");
  try{
   const r=await authFetch("/api/admin/find-it/"+row.id,{method:"PATCH",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
   const json=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(json.error||"Action failed");
   setMessage(`Request is now ${status}. Moderation audit recorded.`);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Action failed");}
  finally{setWorking(null);}
 }
 const rows=(report?.requests||[]).filter(r=>filter==="all"||r.status===filter);
 return <AdminLayout><div className="mx-auto max-w-7xl space-y-5 pb-12">
  <header className="rounded-3xl bg-gradient-to-r from-indigo-800 to-orange-700 p-6 text-white">
   <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-white">Reverse marketplace operations</p>
    <h1 className="mt-2 flex items-center gap-2 text-3xl font-black"><Handshake className="h-8 w-8"/>Bazunk Find It</h1>
    <p className="mt-2 text-sm font-bold text-white">Live buyer requests, seller participation and moderation. Payments remain within verified Stripe checkout.</p></div>
    <button type="button" disabled={loading} onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border border-white/70 px-4 py-2 font-black text-white"><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 font-black text-red-950 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 font-black text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">{message}</p>}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{["open","accepted","purchased","closed","paused"].map(status=>{
   const n=report?.summary.find(s=>s.status===status)?.n??0;
   return <button key={status} type="button" onClick={()=>setFilter(filter===status?"all":status)}
    aria-pressed={filter===status} className={card+" text-left "+(filter===status?"outline outline-2 outline-orange-600":"")}>
    <p className="text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{status}</p><p className="mt-2 text-3xl font-black">{n}</p></button>;
  })}</div>
  <section className={card+" space-y-2"}><h2 className="text-lg font-black">Regions</h2><div className="flex flex-wrap gap-2">{report?.regions.map(r=>
   <span key={r.region} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-900 dark:bg-slate-700 dark:text-white">{r.region.toUpperCase()}: {r.n} requests</span>)}</div>
   <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pause hides a request and its Wanted classified. Closing ends new offers. Purchased requests cannot be reopened.</p></section>
  <section className={card}>
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Recent requests ({rows.length})</h2>
    <select aria-label="Filter request status" className="rounded-xl border border-slate-400 bg-white px-3 py-2 text-slate-950 dark:border-slate-500 dark:bg-slate-800 dark:text-white" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">All statuses</option>{["open","accepted","purchased","closed","paused"].map(s=><option key={s}>{s}</option>)}
    </select></div>
   <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm">
    <thead className="border-b border-slate-300 text-slate-900 dark:border-slate-500 dark:text-white"><tr><th className="p-3">Request</th><th className="p-3">Buyer</th><th className="p-3">Region / budget</th><th className="p-3">Offers</th><th className="p-3">Status</th><th className="p-3">Controls</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} className="border-b border-slate-200 align-top dark:border-slate-700">
     <td className="min-w-48 p-3"><strong>{row.title}</strong><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.location} · {new Date(row.created_at).toLocaleDateString()}</p></td>
     <td className="break-all p-3 font-medium">{row.buyer_email}</td>
     <td className="p-3 font-bold">{new Intl.NumberFormat(row.region==="us"?"en-US":"en-GB",{style:"currency",currency:row.region==="uk"?"GBP":"USD"}).format(Number(row.budget_minor)/100)}<p>{row.region.toUpperCase()}</p></td>
     <td className="p-3">{row.offer_count}</td><td className="p-3 font-bold capitalize">{row.status}</td>
     <td className="p-3"><div className="flex flex-wrap gap-2">
      {row.status!=="paused"&&row.status!=="purchased"&&<button disabled={working===row.id} className={button} onClick={()=>void moderate(row,"paused")}><AlertTriangle className="mr-1 inline h-4 w-4"/>Pause</button>}
      {row.status==="paused"&&<button disabled={working===row.id} className={button} onClick={()=>void moderate(row,"open")}><ShieldCheck className="mr-1 inline h-4 w-4"/>Restore</button>}
      {row.status!=="purchased"&&row.status!=="closed"&&<button disabled={working===row.id} className={button} onClick={()=>void moderate(row,"closed")}>Close</button>}
      {row.status==="purchased"&&<span className="inline-flex gap-1 font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4"/>Paid</span>}
     </div></td>
    </tr>)}</tbody>
   </table></div>
   {!rows.length&&<p className="py-8 text-center font-bold text-slate-700 dark:text-slate-200">No requests match this filter.</p>}
  </section>
 </div></AdminLayout>;
}
