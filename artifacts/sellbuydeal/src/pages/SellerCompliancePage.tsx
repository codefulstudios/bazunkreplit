import {useEffect,useState} from "react";
import {useAuth} from "@clerk/react";
import {Link} from "wouter";
type Case={id:number;status:string;risk_band:string|null;opened_at:string};
export function SellerCompliancePage(){
 const {getToken}=useAuth();
 const [cases,setCases]=useState<Case[]>([]),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [drafts,setDrafts]=useState<Record<number,string>>({}),[busy,setBusy]=useState(false);
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
  try{await request(id+"/"+action,"POST",{explanation:(drafts[id]||"").trim()});setSuccess(action==="appeal"?"Appeal submitted for review.":"Evidence submitted for review.");setDrafts(x=>({...x,[id]:""}));await load();}
  catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-3xl p-5 sm:p-10 text-gray-900"><Link href="/dashboard" className="text-indigo-700 underline">← Dashboard</Link><h1 className="mt-5 text-3xl font-bold">Seller compliance</h1><p className="mt-2 text-gray-600">Review requests are assessed by Bazunk. Activity signals do not automatically change your seller type or fees.</p>
 {error&&<p role="alert" className="my-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{success&&<p role="status" className="my-4 rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
 <div className="mt-6 space-y-4">{cases.length===0?<p className="rounded-xl border bg-white p-5">There are no compliance cases associated with your account.</p>:cases.map(c=><section key={c.id} className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-bold">Case #{c.id}</h2><p className="text-sm">Status: {c.status.replaceAll("_"," ")} · Opened {new Date(c.opened_at).toLocaleDateString()}</p>
 <label className="block text-sm font-medium">Your explanation or evidence (text only)<textarea className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" rows={5} maxLength={5000} value={drafts[c.id]||""} onChange={e=>setDrafts(x=>({...x,[c.id]:e.target.value}))} placeholder="Explain whether the goods are from a personal collection, business stock, or another source."/></label>
 <p className="text-xs text-gray-500">20–5000 characters. Do not include passwords, payment card numbers or identity documents.</p>
 <div className="flex flex-wrap gap-3"><button disabled={busy||c.status==="resolved"||(drafts[c.id]||"").trim().length<20} onClick={()=>void submit(c.id,"evidence")} className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">Submit evidence</button><button disabled={busy||(drafts[c.id]||"").trim().length<20} onClick={()=>void submit(c.id,"appeal")} className="rounded-lg border border-indigo-700 bg-white px-4 py-2 text-indigo-700 disabled:opacity-50">Appeal case</button></div>
 </section>)}</div></main>;
}
