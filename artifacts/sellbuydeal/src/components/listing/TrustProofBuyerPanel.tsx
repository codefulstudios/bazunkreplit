import { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock3, Image as ImageIcon, Info, LockKeyhole, ShieldCheck, Video } from "lucide-react";
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
 return <section data-testid="trust-proof-buyer-panel" className={card} aria-label="TrustProof evidence and verification">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="flex items-center gap-2 text-lg font-black"><ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300"/> Bazunk TrustProof</h2>
    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Check exactly what has and hasn't been verified about this listing.</p></div>
   {reviewed&&<span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-900 dark:bg-indigo-800 dark:text-white">Human-reviewed evidence</span>}
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-[#10203a]">
    <p className="flex items-center gap-2 text-sm font-black"><BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300"/> Seller identity</p>
    <p className={"mt-2 text-sm font-black "+(verified?"text-emerald-700 dark:text-emerald-300":"text-slate-700 dark:text-slate-200")}>{verified?"Identity verified":"Not identity verified"}</p>
    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">Account identity checks are separate from this item's proof.</p>
   </div>
   <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-[#10203a]">
    <p className="flex items-center gap-2 text-sm font-black"><ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300"/> Item evidence</p>
    <p className={"mt-2 text-sm font-black "+(reviewed?"text-emerald-700 dark:text-emerald-300":"text-slate-700 dark:text-slate-200")}>{reviewed?"Evidence reviewed":proof?.evidenceStatus==="submitted"?"Submitted · awaiting review":"No reviewed evidence"}</p>
    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">Guided photos or video can show condition, but don't prove authenticity.</p>
   </div>
   <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-[#10203a]">
    <p className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300"/> Independent goods check</p>
    <p className={"mt-2 text-sm font-black "+(authenticated?"text-emerald-700 dark:text-emerald-300":"text-slate-700 dark:text-slate-200")}>{authenticated?"Third-party authenticated":"Not independently authenticated"}</p>
    <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">Requires an external authenticator report checked with its issuer.</p>
   </div>
  </div>
  {loading&&<p role="status" className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><Clock3 className="h-4 w-4"/> Loading TrustProof status…</p>}
  {failed&&<p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Current item evidence could not be checked. Do not assume verification.</p>}
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
  <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200"><Info className="mt-0.5 h-4 w-4 shrink-0"/>
   Proof media, identity verification and independent product authentication are distinct. Private serial-number and video evidence are not shown publicly. Inspect listings and use Bazunk checkout protections before buying.</p>
 </section>;
}
