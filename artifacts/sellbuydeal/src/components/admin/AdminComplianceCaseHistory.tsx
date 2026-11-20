import { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { ChevronDown,ClipboardList,Save } from "lucide-react";
type Timeline={events:Array<{id:number;actor_type:string;action:string;details:Record<string,unknown>;created_at:string}>;appeals:Array<{id:number;status:string;explanation:string;decision_reason:string|null;created_at:string;decided_at:string|null}>;limits:string};
export function AdminComplianceCaseHistory({caseId}:{caseId:number}){
 const {authFetch}=useAdmin();
 const [open,setOpen]=useState(false),[data,setData]=useState<Timeline|null>(null);
 const [note,setNote]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setError("");
  try{const r=await authFetch(`/api/admin/seller-compliance/cases/${caseId}/history`);
   const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||"Could not load case review timeline");
   setData(x);
  }catch(e){setError(e instanceof Error?e.message:"History unavailable");}
  finally{setBusy(false);}
 }
 async function save(){
  if(note.trim().length<20){setError("Write at least 20 characters documenting the evidence and review.");return;}
  setBusy(true);setError("");
  try{
   const r=await authFetch(`/api/admin/seller-compliance/cases/${caseId}/note`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({note:note.trim()})
   });
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Could not save note");
   setNote("");await load();
  }catch(e){setError(e instanceof Error?e.message:"Note unavailable");}
  finally{setBusy(false);}
 }
 function description(details:Record<string,unknown>){
  if(typeof details?.note==="string")return details.note;
  if(typeof details?.explanation==="string")return details.explanation;
  return JSON.stringify(details??{}).slice(0,1600);
 }
 return <section className="rounded-xl border-2 border-orange-200 bg-orange-50 p-3 dark:border-orange-700 dark:bg-orange-950/30">
  <button type="button" aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(!open)void load();}}
   className="flex w-full items-center justify-between gap-3 text-left font-black text-slate-950 dark:text-white">
   <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4"/>Full evidence, review notes and appeal history</span>
   <ChevronDown className={`h-4 w-4 ${open?"rotate-180":""}`}/>
  </button>
  {open&&<div className="mt-3 space-y-3">
   {busy&&<p role="status" className="text-xs font-bold text-slate-700 dark:text-slate-200">Loading or saving…</p>}
   {error&&<p role="alert" className="rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
   <label className="block text-sm font-bold text-slate-900 dark:text-white">Internal reviewer note
    <textarea rows={3} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Document checks performed, evidence considered and follow-up actions."
      className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-3 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/>
   </label>
   <button type="button" disabled={busy||note.trim().length<20} onClick={()=>void save()} className="flex min-h-9 items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>Save internal note</button>
   {data&&<><p className="text-xs font-semibold text-slate-600 dark:text-slate-200">{data.limits}</p>
    <h4 className="font-black text-slate-900 dark:text-white">Review and evidence timeline</h4>
    {data.events.length===0?<p className="text-xs text-slate-600 dark:text-slate-300">No recorded case events yet.</p>
    :<div className="max-h-64 space-y-2 overflow-y-auto">{data.events.map(e=><div key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-black capitalize text-slate-950 dark:text-white">{e.action.replaceAll("_"," ")} · {e.actor_type}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300">{new Date(e.created_at).toLocaleString("en-GB")}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-800 dark:text-slate-100">{description(e.details)}</p>
    </div>)}</div>}
    <h4 className="font-black text-slate-900 dark:text-white">Appeals ({data.appeals.length})</h4>
    {data.appeals.map(a=><div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-black text-slate-950 dark:text-white">Appeal #{a.id} · {a.status}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-100">{a.explanation}</p>
      {a.decision_reason&&<p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-slate-800 dark:text-slate-100">Decision: {a.decision_reason}</p>}
    </div>)}
   </>}
  </div>}
 </section>;
}
