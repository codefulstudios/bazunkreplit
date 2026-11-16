import { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock3, Image as ImageIcon, Info, LockKeyhole, ShieldCheck, Video, ShieldAlert, CircleHelp, ExternalLink } from "lucide-react";
import { useFeature } from "@/components/FeatureGate";

type BuyerProof={
 identityVerified:boolean;evidenceStatus:"none"|"submitted"|"reviewed";
 evidenceKinds:("item"|"condition"|"serial"|"video")[];
 media:{kind:"item"|"condition";url:string}[];
 reviewedAt:string|null;
 independentAuthentication:{provider:string;reference:string;checkedAt:string}|null;
 explanation:string;
};
const card="rounded-2xl border border-slate-300 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#182a49] dark:text-white";
export function TrustProofBuyerPanel({listingId,identityVerified}:{listingId:number;identityVerified:boolean}){
 const enabled=useFeature("trust_proof");
 const [proof,setProof]=useState<BuyerProof|null>(null);
 const [loading,setLoading]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!enabled||!Number.isSafeInteger(listingId)||listingId<1)return;
  const controller=new AbortController();
  setLoading(true);setFailed(false);setProof(null);
  fetch("/api/trust-proof/"+listingId,{cache:"no-store",signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error("Proof unavailable");return r.json();})
   .then(setProof).catch(e=>{if(e.name!=="AbortError")setFailed(true);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[listingId,enabled]);
 if(!enabled)return null;
 const verified=proof?.identityVerified??identityVerified;
 const reviewed=proof?.evidenceStatus==="reviewed";
 const authenticated=reviewed&&Boolean(proof?.independentAuthentication);
 const names:Record<string,string>={item:"Item with live challenge",condition:"Condition close-up",
  serial:"Private serial-number evidence",video:"Private short verification video"};
 return <section data-testid="trust-proof-buyer-panel" className="rounded-2xl border border-slate-300 bg-white p-4 text-slate-950 shadow-sm dark:border-[#304461] dark:bg-[#182a49] dark:text-white" aria-label="TrustProof verification status">
  <div className="mb-3 flex items-center justify-between gap-2">
   <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-5 w-5 text-indigo-500"/> Bazunk TrustProof</h2>
   {reviewed&&<span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">Evidence reviewed</span>}
  </div>
  <div className="grid grid-cols-3 gap-2">
   {([
    {label:"Seller ID",ok:verified,pending:false,good:"Verified",bad:"Not verified",Icon:BadgeCheck},
    {label:"Item proof",ok:reviewed,pending:proof?.evidenceStatus==="submitted",good:"Reviewed",bad:"Not reviewed",Icon:ImageIcon},
    {label:"Authenticity",ok:authenticated,pending:false,good:"Authenticated",bad:"Not checked",Icon:ShieldCheck}
   ] as const).map(({label,ok,pending,good,bad,Icon})=><div key={label} className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-3 text-center dark:border-[#385174] dark:bg-[#10203a]">
    <span className={`mb-2 grid h-10 w-10 place-items-center rounded-full ${ok?"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300":pending?"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300":"bg-slate-200 text-slate-500 dark:bg-[#253858] dark:text-slate-300"}`}><Icon className="h-5 w-5"/></span>
    <span className="text-xs font-bold">{label}</span>
    <span className={`mt-1 text-[11px] font-semibold ${ok?"text-emerald-700 dark:text-emerald-300":pending?"text-amber-700 dark:text-amber-300":"text-slate-600 dark:text-slate-300"}`}>{ok?good:pending?"Pending":bad}</span>
   </div>)}
  </div>
  {loading&&<p role="status" className="mt-3 flex items-center gap-2 text-xs"><Clock3 className="h-4 w-4"/> Checking verification…</p>}
  {failed&&<p className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300"><ShieldAlert className="h-4 w-4"/> Verification status unavailable</p>}
  {proof&&proof.evidenceStatus!=="none"&&<>
   <div className="mt-4 border-t border-slate-300 pt-4 dark:border-slate-600">
    <h3 className="font-black">Evidence provided</h3>
    <div className="mt-2 flex flex-wrap gap-2">{proof.evidenceKinds.map(kind=><span key={kind}
     className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-950 dark:border-indigo-500 dark:bg-[#223c65] dark:text-white">
     {kind==="video"?<Video className="h-3.5 w-3.5"/>:kind==="serial"?<LockKeyhole className="h-3.5 w-3.5"/>:<CheckCircle2 className="h-3.5 w-3.5"/>}
     {names[kind]}</span>)}</div>
    {proof.evidenceStatus==="submitted"&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
     Seller evidence is pending review. Nothing shown here has been authenticated by Bazunk or a third-party expert.</p>}
    {reviewed&&<p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Reviewed {proof.reviewedAt?new Date(proof.reviewedAt).toLocaleDateString():"by Bazunk"}. The media was reviewed for consistency, not independently authenticated.</p>}
   </div>
   {reviewed&&proof.media.length>0&&<div className="mt-3 grid grid-cols-2 gap-3">
    {proof.media.map(m=><figure key={m.kind} className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
     <img src={m.url} alt={m.kind==="item"?"Seller's reviewed item and challenge photo":"Seller's reviewed condition photo"}
      loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-slate-100 object-contain"/>
     <figcaption className="p-2 text-center text-xs font-bold capitalize">{m.kind==="item"?"Challenge + item":"Item condition"}</figcaption>
    </figure>)}
   </div>}
  </>}
  {authenticated&&proof?.independentAuthentication&&<div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">
   <h3 className="flex items-center gap-2 font-black"><BadgeCheck className="h-5 w-5"/> Independently authenticated goods</h3>
   <p className="mt-2 text-sm font-semibold">Third-party issuer: <strong>{proof.independentAuthentication.provider}</strong></p>
   <p className="text-sm font-semibold">Report reference: <strong>{proof.independentAuthentication.reference}</strong></p>
   <p className="mt-1 text-xs font-bold">Confirmation recorded: {new Date(proof.independentAuthentication.checkedAt).toLocaleDateString()}</p>
   <p className="mt-2 text-xs font-semibold">Bazunk recorded an administrator's confirmation that the external report was checked with the third-party issuer. Bazunk does not issue authenticity certificates.</p>
  </div>}
  <details className="mt-3 border-t border-slate-200 pt-2 text-xs dark:border-[#385174]">
   <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-300"><CircleHelp className="h-4 w-4"/> What do these checks mean?</summary>
   <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">Seller ID checks the account. Item proof means evidence was reviewed, not authenticated. Authenticity requires a verified third-party report. Private verification evidence is not publicly displayed. Use secure checkout.</p>
  </details>
 </section>;
}
