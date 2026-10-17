import {useEffect,useState} from "react";
import {useAuth} from "@clerk/react";
import {Link} from "wouter";
type Case={id:number;status:string;risk_band:string|null;opened_at:string};
type CaseHistory={events:Array<{id:number;action:string;details:{explanation?:string;decision?:string;status?:string};created_at:string}>;appeals:Array<{id:number;status:string;explanation:string;decision_reason:string|null;created_at:string}>};
export function SellerCompliancePage(){
 const {getToken}=useAuth();
 const [cases,setCases]=useState<Case[]>([]),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [drafts,setDrafts]=useState<Record<number,string>>({}),[busy,setBusy]=useState(false);
 const [history,setHistory]=useState<Record<number,CaseHistory>>({});
 const [historyBusy,setHistoryBusy]=useState<number|null>(null);
 async function loadHistory(id:number){
   setHistoryBusy(id);setError("");
   try{const data=await request(id+"/history");setHistory(prev=>({...prev,[id]:data as CaseHistory}));}
   catch(e){setError(e instanceof Error?e.message:"Unable to load case history");}
   finally{setHistoryBusy(null);}
 }
 async function request(path:string,method="GET",body?:object){
  const token=await getToken();const r=await fetch("/api/listings/seller-compliance/"+path,{method,
   headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d;
 }
 async function load(){try{const d=await request("me");setCases(d.cases||[]);}catch(e:any){setError(e.message);}}
 useEffect(()=>{void load();},[]);
 async function submit(id:number,action:"evidence"|"appeal"){
  setError("");setSuccess("");setBusy(true);
  try{await request(id+"/"+action,"POST",{explanation:(drafts[id]||"").trim()});setSuccess(action==="appeal"?"Appeal submitted for review.":"Evidence submitted for review.");setDrafts(x=>({...x,[id]:""}));await load();await loadHistory(id);}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-3xl p-5 text-slate-950 dark:text-white sm:p-10"><Link href="/dashboard" className="text-indigo-700 underline">← Dashboard</Link><h1 className="mt-5 text-3xl font-bold">Seller compliance</h1><p className="mt-2 text-slate-700 dark:text-slate-200">Review requests are assessed by Bazunk. Activity signals do not automatically change your seller type or fees.</p>
 {error&&<p role="alert" className="my-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{success&&<p role="status" className="my-4 rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
 <div className="mt-6 space-y-4">{cases.length===0?<p className="rounded-xl border bg-white p-5">There are no compliance cases associated with your account.</p>:cases.map(c=><section key={c.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-bold">Case #{c.id}</h2><p className="text-sm">Status: {c.status.replaceAll("_"," ")} · Opened {new Date(c.opened_at).toLocaleDateString()}</p>
 <label className="block text-sm font-medium">Your explanation or evidence (text only)<textarea className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" rows={5} maxLength={5000} value={drafts[c.id]||""} onChange={e=>setDrafts(x=>({...x,[c.id]:e.target.value}))} placeholder="Explain whether the goods are from a personal collection, business stock, or another source."/></label>
 <p className="text-xs text-slate-600 dark:text-slate-300">20–5000 characters. Do not include passwords, payment card numbers or identity documents.</p>
 <div className="flex flex-wrap gap-3"><button disabled={busy||c.status==="resolved"||(drafts[c.id]||"").trim().length<20} onClick={()=>void submit(c.id,"evidence")} className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">Submit evidence</button><button disabled={busy||(drafts[c.id]||"").trim().length<20} onClick={()=>void submit(c.id,"appeal")} className="rounded-lg border border-indigo-700 bg-white px-4 py-2 text-indigo-700 disabled:opacity-50 dark:bg-slate-800 dark:text-indigo-200">Appeal case</button></div>
 <button type="button" onClick={()=>void loadHistory(c.id)} disabled={historyBusy!==null}
 className="min-h-9 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100">
  {historyBusy===c.id?"Loading history…":"View evidence & appeal history"}
 </button>
 {history[c.id]&&<div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
  <h3 className="font-black">Your submitted evidence and decisions</h3>
  {history[c.id].appeals.map(a=><div key={a.id} className="rounded-lg bg-white p-3 text-sm dark:bg-slate-900">
    <p className="font-bold">Appeal #{a.id} · {a.status.replaceAll("_"," ")}</p>
    <p className="mt-1 whitespace-pre-wrap break-words">{a.explanation}</p>
    {a.decision_reason&&<p className="mt-2 font-semibold text-indigo-800 dark:text-indigo-200">Decision explanation: {a.decision_reason}</p>}
  </div>)}
  {history[c.id].events.map(e=><div key={e.id} className="rounded-lg bg-white p-3 text-sm dark:bg-slate-900">
    <p className="font-bold capitalize">{e.action.replaceAll("_"," ")} · {new Date(e.created_at).toLocaleString("en-GB")}</p>
    {e.details.explanation&&<p className="mt-1 whitespace-pre-wrap break-words">{e.details.explanation}</p>}
    {e.details.decision&&<p className="mt-1">Appeal decision: {e.details.decision}</p>}
    {e.details.status&&<p className="mt-1">Case status: {e.details.status.replaceAll("_"," ")}</p>}
  </div>)}
  {!history[c.id].events.length&&!history[c.id].appeals.length&&<p className="text-sm text-slate-600 dark:text-slate-200">No previous submissions recorded.</p>}
 </div>}
 </section>)}</div></main>;
}
