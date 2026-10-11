import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { RefreshCw, ShieldCheck } from "lucide-react";

type Appeal = {id:number;case_id:number;seller_email:string;explanation:string;status:string;created_at:string};
type Case = { id:number; seller_email:string; status:string; risk_score:number|null; risk_band:string|null; risk_reasons:{code:string;points:number;detail:string}[]; updated_at:string; opened_at:string };
const statuses = ["open","awaiting_information","under_review","appealed","resolved","all"] as const;
export function AdminSellerCompliancePage() {
  const {authFetch} = useAdmin();
  const [status,setStatus] = useState<string>("open");
  const [cases,setCases] = useState<Case[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [reason,setReason] = useState<Record<number,string>>({});
  const [target,setTarget] = useState<Record<number,string>>({});
  const [evidence,setEvidence]=useState<Record<number,{id:number;details:{explanation?:string};created_at:string}[]>>({});
  const [evidenceBusy,setEvidenceBusy]=useState<number|null>(null);
  const [appeals,setAppeals]=useState<Appeal[]>([]);
  const [scanning,setScanning]=useState(false);
  const [busy,setBusy] = useState<number|null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r=await authFetch("/api/admin/seller-compliance/cases?status="+encodeURIComponent(status));
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||"Could not load compliance cases");
      setCases(Array.isArray(data.cases)?data.cases:[]);
      const a=await authFetch("/api/admin/seller-compliance/appeals");
      if(a.ok){const d=await a.json();setAppeals(Array.isArray(d.appeals)?d.appeals:[]);}
    } catch(e:any) {setError(e.message||"Unable to load cases");} finally {setLoading(false);}
  },[authFetch,status]);
  useEffect(()=>{void load();},[load]);
  async function showEvidence(id:number){
    setEvidenceBusy(id);setError("");
    try{const r=await authFetch("/api/admin/seller-compliance/cases/"+id+"/evidence");const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to load evidence");
      setEvidence(x=>({...x,[id]:Array.isArray(d.evidence)?d.evidence:[]}));
    }catch(e:any){setError(e.message||"Unable to load evidence");}finally{setEvidenceBusy(null);}
  }
  async function scan(){setScanning(true);setError("");try{const r=await authFetch("/api/admin/seller-compliance/scan",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Scan failed");await load();}catch(e:any){setError(e.message||"Scan failed");}finally{setScanning(false);}}
  async function decide(a:Appeal,decision:"accepted"|"rejected"){
    const rationale=(reason[-a.id]||"").trim();
    if(rationale.length<20){setError("Explain the appeal decision in at least 20 characters.");return;}
    setBusy(-a.id);setError("");
    try{const r=await authFetch("/api/admin/seller-compliance/appeals/"+a.id+"/decision",{method:"POST",body:JSON.stringify({decision,reason:rationale})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Appeal decision failed");await load();
    }catch(e:any){setError(e.message||"Appeal decision failed");}finally{setBusy(null);}
  }
  async function save(c:Case) {
    const next=target[c.id]||c.status;
    if(next===c.status)return;
    if((reason[c.id]||"").trim().length<20){setError("Enter at least 20 characters explaining the decision.");return;}
    setBusy(c.id);setError("");
    try {
      const r=await authFetch("/api/admin/seller-compliance/cases/"+c.id+"/status",{
        method:"POST",body:JSON.stringify({status:next,reason:reason[c.id].trim()})
      });
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not save case");
      setReason(x=>({...x,[c.id]:""}));await load();
    }catch(e:any){setError(e.message||"Unable to save");}finally{setBusy(null);}
  }
  return <AdminLayout><div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8 text-gray-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7"/>Seller Compliance</h1><p className="text-sm text-gray-600 mt-1">Review commercial activity signals. Scores are advisory; never automatically reclassify sellers.</p></div><div className="flex gap-2"><button onClick={()=>void scan()} disabled={scanning} className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">{scanning?"Scanning…":"Scan sellers"}</button><button onClick={()=>void load()} disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 flex gap-2 items-center"><RefreshCw className="h-4 w-4"/>Refresh</button></div></div>
    <div className="flex flex-wrap gap-2">{statuses.map(x=><button key={x} onClick={()=>setStatus(x)} className={`rounded-lg border px-3 py-2 text-sm capitalize ${status===x?"bg-indigo-700 text-white border-indigo-700":"bg-white text-gray-800 border-gray-300"}`}>{x.replaceAll("_"," ")}</button>)}</div>
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
    <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="text-lg font-bold">Seller appeals</h2>
      {appeals.filter(a=>a.status==="pending").length===0?<p className="text-sm text-gray-600">No pending appeals.</p>:appeals.filter(a=>a.status==="pending").map(a=><div key={a.id} className="rounded-lg border p-3 space-y-2">
        <p className="font-semibold">{a.seller_email} · Case #{a.case_id}</p><p className="whitespace-pre-wrap text-sm">{a.explanation}</p>
        <textarea rows={2} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900" placeholder="Document decision rationale (20+ characters)" value={reason[-a.id]||""} onChange={e=>setReason(x=>({...x,[-a.id]:e.target.value}))}/>
        <div className="flex gap-2"><button disabled={busy!==null} onClick={()=>void decide(a,"accepted")} className="rounded-lg bg-indigo-700 px-3 py-2 text-white disabled:opacity-50">Accept for review</button><button disabled={busy!==null} onClick={()=>void decide(a,"rejected")} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:opacity-50">Reject appeal</button></div>
      </div>)}
    </section>
    {loading?<p>Loading compliance cases…</p>:cases.length===0?<p className="rounded-xl border bg-white p-6">No cases in this view. Automatic monitoring may not be enabled yet.</p>:<div className="space-y-4">{cases.map(c=><section key={c.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold">{c.seller_email}</h2><p className="text-xs text-gray-500">Case #{c.id} · Opened {new Date(c.opened_at).toLocaleDateString()}</p></div><div className="text-sm font-semibold">{c.risk_band||"Unscored"} · {c.risk_score??"—"}/100</div></div>
      <button type="button" onClick={()=>void showEvidence(c.id)} disabled={evidenceBusy!==null} className="rounded-lg border border-indigo-700 bg-white px-3 py-2 text-sm text-indigo-700 disabled:opacity-50">{evidenceBusy===c.id?"Loading…":"View seller evidence"}</button>
      {evidence[c.id]&&<div className="rounded-lg bg-gray-50 p-3 text-sm"><h3 className="font-semibold">Submitted evidence</h3>{evidence[c.id].length===0?<p>No evidence submitted yet.</p>:evidence[c.id].map(e=><div key={e.id} className="mt-2 border-t pt-2"><p className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap">{e.details?.explanation||"No explanation available"}</p></div>)}</div>}
      <p className="text-sm">Current status: <b>{c.status.replaceAll("_"," ")}</b></p>
      <ul className="list-disc pl-5 text-sm text-gray-700">{(Array.isArray(c.risk_reasons)?c.risk_reasons:[]).map((x,i)=><li key={i}>{x.detail} ({x.points>0?"+":""}{x.points})</li>)}</ul>
      <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] items-end"><label className="text-sm font-medium">New status<select value={target[c.id]||c.status} onChange={e=>setTarget(x=>({...x,[c.id]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900">{statuses.filter(x=>x!=="all").map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label><label className="text-sm font-medium">Documented review reason<textarea rows={2} value={reason[c.id]||""} onChange={e=>setReason(x=>({...x,[c.id]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900" placeholder="Evidence considered and rationale (minimum 20 characters)"/></label><button onClick={()=>void save(c)} disabled={busy!==null||(target[c.id]||c.status)===c.status} className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">Save review</button></div>
    </section>)}</div>}
  </div></AdminLayout>;
}
