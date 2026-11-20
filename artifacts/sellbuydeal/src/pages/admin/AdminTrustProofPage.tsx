import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { BadgeCheck, CheckCircle2, Clock3, FileCheck2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type Row={listing_id:number;status:string;has_serial:boolean;submitted_at:string|null;reviewed_at:string|null;
 external_provider:string|null;title:string;condition:string;seller_email:string;listing_status:string};
type Asset={kind:"item"|"condition"|"serial"|"video";media_type:string;byte_size:number;sha256:string};
type Detail={listing:{id:number;title:string;condition:string;status:string};
 proof:{challenge:string;issued_at:string;expires_at:string;has_serial:boolean;status:string;review_note:string|null;
 current:boolean;external_provider:string|null;external_reference:string|null;external_checked_at:string|null};
 assets:Asset[];audit:{actor:string;action:string;details:Record<string,unknown>;created_at:string}[]};
type Report={records:Row[];counts:{status:string;total:number}[];notice:string};
const box="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#1b2c4b] dark:text-white";
const field="min-h-11 w-full rounded-xl border border-slate-400 bg-white p-3 text-sm font-semibold text-slate-950 dark:border-slate-500 dark:bg-[#10213b] dark:text-white";
const button="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50";
export function AdminTrustProofPage(){
 const {authFetch,isAdmin}=useAdmin();
 const [report,setReport]=useState<Report|null>(null);
 const [selected,setSelected]=useState<number|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [media,setMedia]=useState<Record<string,string>>({});
 const objectUrls=useRef<string[]>([]);
 const [loading,setLoading]=useState(false),[working,setWorking]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [note,setNote]=useState("");
 const [checks,setChecks]=useState({challengeVisible:false,itemMatches:false,conditionVisible:false,serialChecked:false});
 const [provider,setProvider]=useState(""),[reference,setReference]=useState(""),[howChecked,setHowChecked]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [filter,setFilter]=useState("submitted");
 useEffect(()=>()=>{objectUrls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
 async function read(path:string,options:RequestInit={}){
  const r=await authFetch("/api/admin/trust-proof"+path,{cache:"no-store",...options});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"TrustProof administrator request failed");
  return data;
 }
 async function load(){
  setLoading(true);setError("");
  try{setReport(await read(""));}
  catch(e){setError(e instanceof Error?e.message:"Unable to load TrustProof queue");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(isAdmin)void load();},[isAdmin]);
 async function open(id:number){
  setSelected(id);setDetail(null);setMedia({});setError("");setSuccess("");
  objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current=[];
  setLoading(true);setChecks({challengeVisible:false,itemMatches:false,conditionVisible:false,serialChecked:false});
  setNote("");setProvider("");setReference("");setHowChecked("");setConfirmed(false);
  try{
   const data=await read("/"+id) as Detail;
   const next:Record<string,string>={};
   for(const asset of data.assets) {
    const r=await authFetch(`/api/admin/trust-proof/${id}/media/${asset.kind}`,{cache:"no-store"});
    if(!r.ok)throw Error("Unable to load private "+asset.kind+" evidence");
    const blob=await r.blob(),url=URL.createObjectURL(blob);
    objectUrls.current.push(url);next[asset.kind]=url;
   }
   setDetail(data);setMedia(next);
  }catch(e){setError(e instanceof Error?e.message:"Review evidence unavailable");}
  finally{setLoading(false);}
 }
 const run=async(action:()=>Promise<unknown>,label:string)=>{
  if(selected===null)return;
  setWorking(true);setError("");setSuccess("");
  try{await action();setSuccess(label);await load();await open(selected);setSuccess(label);}
  catch(e){setError(e instanceof Error?e.message:"TrustProof action failed");}
  finally{setWorking(false);}
 };
 const review=(decision:"approve"|"reject")=>{
  if(decision==="approve"&&!window.confirm("You personally checked the live challenge, visible item, condition and any serial evidence. Mark as evidence reviewed (NOT authenticated goods)?"))return;
  void run(()=>read("/"+selected+"/review",{method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({decision,note,...checks})}),
   decision==="approve"?"Evidence review approved. No product authentication badge was issued.":"Proof rejected with a reason.");
 };
 const authentication=(action:"record"|"revoke")=>{
  if(!window.confirm(action==="record"?
   "Confirm you independently checked the third-party report directly with its issuing provider. This will show an independent product authentication label to buyers.":
   "Revoke the third-party authentication label for this listing?"))return;
  void run(()=>read("/"+selected+"/authentication",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({action,provider,reference,howChecked,confirmedWithProvider:confirmed})}),
   action==="record"?"Third-party authentication provenance recorded.":"Independent authentication revoked.");
 };
 const rows=(report?.records||[]).filter(p=>filter==="all"||p.status===filter);
 return <AdminLayout><div className="mx-auto max-w-7xl space-y-5 pb-12">
  <header className="rounded-3xl bg-gradient-to-r from-indigo-800 to-orange-700 p-6 text-white">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><p className="text-xs font-black uppercase tracking-widest text-white">Authenticity & seller confidence</p>
     <h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><ShieldCheck className="h-8 w-8"/> Bazunk TrustProof</h1>
     <p className="mt-2 max-w-3xl font-semibold text-white">Review real challenge-code evidence, protect serial data, and separately record independently checked third-party authentication.</p></div>
    <button type="button" disabled={loading} onClick={()=>void load()} className={button+" border border-white/60 bg-white/20 text-white"}><RefreshCw className="h-4 w-4"/> Refresh queue</button>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 font-black text-red-950 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {success&&<p role="status" className="rounded-xl bg-emerald-50 p-4 font-black text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">{success}</p>}
  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
   {["submitted","approved","rejected","collecting","revoked"].map(status=><button key={status} type="button" onClick={()=>setFilter(filter===status?"all":status)}
    aria-pressed={filter===status} className={box+" text-left "+(filter===status?"outline outline-2 outline-orange-600":"")}>
    <p className="text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{status}</p>
    <p className="mt-2 text-3xl font-black">{report?.counts.find(c=>c.status===status)?.total??0}</p>
   </button>)}
  </div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
   <section className={box+" min-w-0"}>
    <h2 className="mb-3 text-xl font-black">Proof submissions {filter!=="all"?"· "+filter:"· all"}</h2>
    <div className="max-h-[720px] space-y-2 overflow-y-auto">
     {rows.map(p=><button key={p.listing_id} type="button" onClick={()=>void open(p.listing_id)}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${selected===p.listing_id?"border-orange-500 bg-orange-50 text-slate-950 dark:bg-[#304165] dark:text-white":"border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-[#11223e] dark:text-white"}`}>
      <p className="font-black">{p.title}</p>
      <p className="mt-1 text-sm font-semibold">#{p.listing_id} · {p.seller_email}</p>
      <p className="mt-1 text-xs font-semibold capitalize">Proof: {p.status} · Listing: {p.listing_status}</p>
      {p.submitted_at&&<p className="mt-1 text-xs font-medium">Submitted {new Date(p.submitted_at).toLocaleString()}</p>}
      {p.external_provider&&<p className="mt-1 text-xs font-bold text-indigo-700 dark:text-indigo-200">Third-party authentication: {p.external_provider}</p>}
     </button>)}
     {!rows.length&&<p className="py-10 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">No matching submissions.</p>}
    </div>
   </section>
   <section className={box+" min-w-0 space-y-4"} aria-label="Review selected TrustProof">
    <h2 className="text-xl font-black">Evidence review</h2>
    {loading&&<p className="text-sm font-bold">Loading secure evidence…</p>}
    {detail&&<>
     <h3 className="text-lg font-black">{detail.listing.title}</h3>
     <p className="text-sm font-bold">Condition: {detail.listing.condition} · Proof status: {detail.proof.status}</p>
     {!detail.proof.current&&<p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-950 dark:bg-red-950 dark:text-red-100">This proof no longer matches the listing. Do not approve it; request a new challenge.</p>}
     <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 text-slate-900 dark:border-slate-600 dark:bg-[#10213b] dark:text-white">
      <p className="text-xs font-bold uppercase">Challenge to check visually</p>
      <p className="mt-2 break-all font-mono text-2xl font-black">{detail.proof.challenge}</p>
      <p className="mt-1 text-xs font-semibold">Issued {new Date(detail.proof.issued_at).toLocaleString()} · Expires {new Date(detail.proof.expires_at).toLocaleString()}</p>
     </div>
     <div className="grid gap-3 sm:grid-cols-2">
      {detail.assets.map(a=><div key={a.kind} className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
       <p className="p-3 text-sm font-black capitalize">{a.kind==="serial"?"Private serial image":a.kind+" evidence"} · {(a.byte_size/1024).toFixed(0)} KB</p>
       {media[a.kind]?(a.media_type.startsWith("image/")?
        <img src={media[a.kind]} alt={a.kind+" submitted evidence"} className="h-48 w-full object-contain bg-slate-100"/>:
        <video src={media[a.kind]} controls playsInline preload="metadata" className="h-48 w-full bg-black" aria-label="Private TrustProof video"/>):
        <p className="p-3 text-sm font-semibold">Loading media…</p>}
      </div>)}
     </div>
     <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Never copy private serial images or identifying details into public listing notes.</p>
     {detail.proof.status==="submitted"&&detail.proof.current&&detail.listing.status==="active"&&<>
      <h3 className="font-black">Human reviewer checklist</h3>
      <div className="space-y-2">
       {([
        ["challengeVisible","Challenge code and its date are actually visible in the media"],
        ["itemMatches","Media shows the same specific item, not stock imagery"],
        ["conditionVisible","Real condition and any defects are visible"],
        ["serialChecked","Serial number has been checked privately (if applicable)"]
       ] as const).filter(([key])=>key!=="serialChecked"||detail.proof.has_serial).map(([key,label])=>
        <label key={key} className="flex items-start gap-3 rounded-lg border border-slate-300 p-3 text-sm font-semibold dark:border-slate-600">
         <input type="checkbox" checked={checks[key]} onChange={e=>setChecks(s=>({...s,[key]:e.target.checked}))} className="mt-1 h-4 w-4 accent-orange-600"/><span>{label}</span>
        </label>)}
      </div>
      <label className="block text-sm font-bold">Review note / rejection reason
       <textarea rows={3} value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} className={field+" mt-1"} placeholder="Provide an explanation if rejecting evidence."/>
      </label>
      <div className="flex flex-wrap gap-3">
       <button type="button" disabled={working||!checks.challengeVisible||!checks.itemMatches||!checks.conditionVisible||(detail.proof.has_serial&&!checks.serialChecked)}
        onClick={()=>review("approve")} className={button+" bg-emerald-700 text-white"}><CheckCircle2 className="h-4 w-4"/> Approve evidence only</button>
       <button type="button" disabled={working||note.trim().length<10} onClick={()=>review("reject")} className={button+" bg-red-700 text-white"}><XCircle className="h-4 w-4"/> Reject with reason</button>
      </div>
     </>}
     {detail.proof.status==="approved"&&detail.proof.current&&<>
      <div className="rounded-xl border border-orange-400 bg-orange-50 p-4 text-orange-950 dark:bg-[#493822] dark:text-white">
       <h3 className="flex items-center gap-2 font-black"><BadgeCheck className="h-5 w-5"/> Independent authentication · separate process</h3>
       <p className="mt-2 text-sm font-semibold">Bazunk's photo review does not determine authenticity. Only record an external report after independently checking the report directly with the issuing third-party provider.</p>
      </div>
      {detail.proof.external_provider&&<p className="text-sm font-bold">Current third-party provider: {detail.proof.external_provider} · Report {detail.proof.external_reference}</p>}
      <label className="block text-sm font-bold">External authenticator / issuing company
       <input value={provider} maxLength={120} onChange={e=>setProvider(e.target.value)} className={field+" mt-1"} placeholder="Independent expert or authentication provider"/></label>
      <label className="block text-sm font-bold">External report or certificate reference
       <input value={reference} maxLength={160} onChange={e=>setReference(e.target.value)} className={field+" mt-1"} placeholder="Report number from issuing provider"/></label>
      <label className="block text-sm font-bold">How did you confirm the report with the issuer?
       <textarea value={howChecked} onChange={e=>setHowChecked(e.target.value)} rows={3} maxLength={750} className={field+" mt-1"} placeholder="Describe the contact, verification portal and evidence checked (20+ characters)."/></label>
      <label className="flex gap-3 text-sm font-bold">
       <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="h-5 w-5 accent-orange-600"/>
       <span>I independently confirmed that the external authentication report belongs to this specific item, and the issuer is a third party, not the seller.</span>
      </label>
      <div className="flex flex-wrap gap-2">
       <button type="button" disabled={working||!confirmed||provider.trim().length<3||reference.trim().length<4||howChecked.trim().length<20}
        onClick={()=>authentication("record")} className={button+" bg-indigo-700 text-white"}><FileCheck2 className="h-4 w-4"/> Record third-party authentication</button>
       {detail.proof.external_provider&&<button type="button" disabled={working} onClick={()=>authentication("revoke")}
        className={button+" bg-red-700 text-white"}>Revoke authentication label</button>}
      </div>
     </>}
     <div className="border-t border-slate-300 pt-4 dark:border-slate-600">
      <h3 className="mb-3 font-black">Review audit history</h3>
      <div className="max-h-64 space-y-2 overflow-y-auto">{detail.audit.map((a,i)=><p key={i} className="rounded-lg bg-slate-100 p-3 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-white">
       {new Date(a.created_at).toLocaleString()} · {a.action.replaceAll("_"," ")} · {a.actor}
      </p>)}</div>
     </div>
    </>}
    {!detail&&!loading&&<p className="py-10 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">Select a proof submission to review the challenge and private evidence.</p>}
   </section>
  </div>
  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{report?.notice}</p>
 </div></AdminLayout>;
}
