import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { Bell, Bot, ClipboardList, Handshake, RefreshCw, Settings2, Users } from "lucide-react";

type Settings={alerts:boolean;offers:boolean;monitor:boolean};
type Report={summary:{pilots:number;active:number;with_alerts:number;with_drafts:number;matches:number;sent_offers:number};
 regions:{region:string;total:number}[];
 latest:{id:string;query:string;region:string;max_total_minor:number;condition:string;active:boolean;matches:number;last_checked_at:string|null}[];
 audit:{actor:string;changes:{before:Settings;after:Settings};created_at:string}[];settings:Settings};
const box="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-[#172541] dark:text-white";
export function AdminDealPilotPage(){
 const {authFetch,isAdmin}=useAdmin();
 const [data,setData]=useState<Report|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 const refresh=async()=>{
  setLoading(true);setError("");
  try{
   const r=await authFetch("/api/admin/deal-pilot",{cache:"no-store"});
   const json=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(json.error||"Could not load DealPilot controls");
   setData(json);
  }catch(e){setError(e instanceof Error?e.message:"Admin reporting unavailable");}
  finally{setLoading(false);}
 };
 useEffect(()=>{if(isAdmin)void refresh();},[isAdmin]);
 const save=async(key:keyof Settings,enabled:boolean)=>{
  if(!data)return;setSaving(true);setError("");setNotice("");
  try{
   const r=await authFetch("/api/admin/deal-pilot/settings",{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({[key]:enabled})});
   const json=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(json.error||"Settings could not be updated");
   setData(d=>d?{...d,settings:json.settings}:d);
   setNotice("Setting updated and recorded in the DealPilot admin audit.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");}
  finally{setSaving(false);}
 };
 return <AdminLayout><div className="mx-auto max-w-7xl space-y-5 pb-12">
  <div className="rounded-3xl bg-gradient-to-r from-violet-800 to-orange-600 p-6 text-white">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><span className="text-xs font-black uppercase tracking-widest text-white">Buyer discovery & automation</span>
     <h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Bot className="h-9 w-9"/>DealPilot Control Centre</h1>
     <p className="mt-2 max-w-2xl text-sm font-semibold text-white">Monitor active buying missions, real matched inventory and buyer-approved offers. Never auto-send an offer.</p></div>
    <button onClick={()=>void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/15 px-4 py-2 font-bold text-white"><RefreshCw className="h-4 w-4"/>Refresh</button>
   </div>
  </div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{notice}</p>}
  {loading&&!data?<div className={box}>Loading live DealPilot statistics…</div>:null}
  {data&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {label:"Active missions",value:data.summary.active,icon:Users},
     {label:"Tracked matches",value:data.summary.matches,icon:ClipboardList},
     {label:"Buyer-approved offers",value:data.summary.sent_offers,icon:Handshake},
     {label:"Alert-enabled missions",value:data.summary.with_alerts,icon:Bell},
    ].map(x=>{const Icon=x.icon;return <div key={x.label} className={box}>
     <Icon className="h-6 w-6 text-orange-600 dark:text-orange-300"/>
     <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{x.label}</p>
     <p className="text-3xl font-black">{x.value??0}</p>
    </div>;})}
   </div>
   <section className={box+" space-y-4"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="flex items-center gap-2 text-xl font-black"><Settings2 className="h-5 w-5 text-orange-600"/> Safety & monitoring</h2>
     <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Every change is recorded. The global feature toggle controls availability independently.</p></div>
     <Link href="/admin/feature-toggles" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-black text-white">Feature Toggles →</Link>
    </div>
    {([
     {key:"monitor",label:"Background matching",desc:"Search current listings every 15 minutes while the API is running. New matches appear in users' DealPilots."},
     {key:"alerts",label:"In-app match alerts",desc:"Surface new matches in the existing Bazunk notifications centre (no email or push delivery)."},
     {key:"offers",label:"Buyer-approved offers",desc:"Allow users to review and send a suggested offer. No automated transmissions."}
    ] as {key:keyof Settings;label:string;desc:string}[]).map(x=><div key={x.key} className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-600">
      <div className="max-w-2xl"><h3 className="font-black">{x.label}</h3><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{x.desc}</p></div>
      <button type="button" disabled={saving} onClick={()=>void save(x.key,!data.settings[x.key])}
       aria-pressed={data.settings[x.key]} aria-label={x.label}
       className={`rounded-full px-5 py-2 text-sm font-black ${data.settings[x.key]?"bg-emerald-600 text-white":"bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white"}`}>
       {data.settings[x.key]?"Enabled":"Disabled"}
      </button>
    </div>)}
   </section>
   <section className={box}>
    <h2 className="text-lg font-black">Marketplace distribution</h2>
    <div className="mt-3 flex flex-wrap gap-3">{data.regions.map(r=><span key={r.region} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-white">{r.region.toUpperCase()}: {r.total} missions</span>)}</div>
   </section>
   <section className={box}>
    <h2 className="mb-4 text-lg font-black">Recent buyer missions</h2>
    <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
     <thead className="border-b border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"><tr><th className="p-3">Request</th><th className="p-3">Market</th><th className="p-3">Budget</th><th className="p-3">Matches</th><th className="p-3">Status</th><th className="p-3">Last checked</th></tr></thead>
     <tbody>{data.latest.map(p=><tr key={p.id} className="border-b border-slate-200 dark:border-slate-700">
      <td className="max-w-64 truncate p-3 font-bold">{p.query}</td><td className="p-3 uppercase">{p.region}</td>
      <td className="p-3">{new Intl.NumberFormat("en-GB",{style:"currency",currency:p.region==="uk"?"GBP":"USD"}).format(Number(p.max_total_minor)/100)}</td>
      <td className="p-3">{p.matches}</td><td className="p-3">{p.active?"Active":"Paused"}</td>
      <td className="p-3">{p.last_checked_at?new Date(p.last_checked_at).toLocaleString():"Not yet"}</td>
     </tr>)}</tbody>
    </table></div>
    {!data.latest.length&&<p className="mt-3 text-sm text-slate-700 dark:text-slate-200">No DealPilots created yet.</p>}
   </section>
   <section className={box}>
    <h2 className="text-lg font-black">Recent settings audit</h2>
    <div className="mt-3 space-y-2">{data.audit.map((a,i)=><div key={i} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-600">
     <p className="font-bold">{a.actor} · {new Date(a.created_at).toLocaleString()}</p>
     <p className="text-slate-700 dark:text-slate-200">Settings changed: {Object.keys(a.changes.after).filter(k=>a.changes.after[k as keyof Settings]!==a.changes.before[k as keyof Settings]).join(", ")||"No change"}</p>
    </div>)}</div>
   </section>
  </>}
 </div></AdminLayout>;
}
