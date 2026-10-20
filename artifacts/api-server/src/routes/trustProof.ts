import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import {
 ensureTrustProofTables,getProofListing,validListingId,listingFingerprint,getProof,
 assetSummary,proofCurrent,proofComplete,challengeCode,mediaFromDataUrl,auditProof,
 EXTERNAL_PROVIDER_NOTICE,type ProofKind,type ProofRecord
} from "../lib/trustProof.js";

const router=Router();
const cache=(res:any)=>res.setHeader("Cache-Control","private,no-store");
const error=(res:any,err:unknown)=>{console.error("TrustProof error",err);res.status(503).json({error:"TrustProof is temporarily unavailable."});};
const kinds=["item","condition","serial","video"] as const;
const mediaKind=(k:string):k is ProofKind=>kinds.includes(k as ProofKind);
const alive=(p:ProofRecord)=>new Date(p.expires_at).getTime()>Date.now();
async function own(req:any,res:any){
 const email=await authenticatedSellerEmail(req,res);if(!email)return null;
 const id=validListingId(req.params.listingId);
 if(!id){res.status(400).json({error:"Invalid listing"});return null;}
 const l=await getProofListing(id);
 if(!l||l.seller_email.toLowerCase()!==email){res.status(404).json({error:"Your listing was not found"});return null;}
 return {email,id,listing:l};
}

/* Buyer summary is read-only and never exposes seller email, code,
 * raw serial photos, personal documents or private reviewer notes. */
router.get("/trust-proof/:listingId",async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);if(!id){res.status(400).json({error:"Invalid listing"});return;}
  await ensureTrustProofTables();cache(res);
  const listing=await getProofListing(id);
  if(!listing || listing.status!=="active"){res.status(404).json({error:"Listing unavailable"});return;}
  const identity=(await db.execute(sql`SELECT verification_status FROM users
    WHERE LOWER(email)=LOWER(${listing.seller_email}) LIMIT 1`)).rows[0] as any;
  const identityVerified=identity?.verification_status==="verified";
  const p=await getProof(id);
  if(!p||!["submitted","approved"].includes(p.status)||!proofCurrent(p,listing)){
   res.json({identityVerified,evidenceStatus:"none",evidenceKinds:[],media:[],independentAuthentication:null,
    explanation:EXTERNAL_PROVIDER_NOTICE});return;
  }
  const assets=await assetSummary(id);
  const approved=p.status==="approved";
  const media=approved?assets.filter(a=>a.kind==="item"||a.kind==="condition")
   .map(a=>({kind:a.kind,url:`/api/trust-proof/${id}/media/${a.kind}`})):[];
  res.json({identityVerified,evidenceStatus:approved?"reviewed":"submitted",
    evidenceKinds:assets.map(a=>a.kind),media,reviewedAt:approved?p.reviewed_at:null,
    independentAuthentication:approved&&p.external_provider&&p.external_reference&&p.external_checked_at
      ?{provider:p.external_provider,reference:p.external_reference,checkedAt:p.external_checked_at}:null,
    explanation:EXTERNAL_PROVIDER_NOTICE});
 }catch(e){error(res,e);}
});
router.get("/trust-proof/:listingId/media/:kind",async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);
  if(!id||!["item","condition"].includes(req.params.kind)){res.status(404).end();return;}
  await ensureTrustProofTables();
  const [listing,p]=await Promise.all([getProofListing(id),getProof(id)]);
  if(!listing||listing.status!=="active"||!p||p.status!=="approved"||!proofCurrent(p,listing)){
    res.status(404).end();return;
  }
  const row=(await db.execute(sql`SELECT media_type,media_bytes FROM marketplace_trust_proof_media
    WHERE listing_id=${id} AND kind=${req.params.kind} LIMIT 1`)).rows[0] as any;
  if(!row||!["image/jpeg","image/png","image/webp"].includes(row.media_type)){res.status(404).end();return;}
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Type",row.media_type);
  res.send(Buffer.from(row.media_bytes));
 }catch(e){error(res,e);}
});
router.get("/trust-proof/me/:listingId",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  await ensureTrustProofTables();cache(res);
  const proof=await getProof(owner.id);
  const media=proof?await assetSummary(owner.id):[];
  res.json({listing:{id:owner.id,title:owner.listing.title,status:owner.listing.status},
   proof:proof?{...proof,current:proofCurrent(proof,owner.listing)}:null,
   media:media.map(({kind,media_type,byte_size})=>({kind,mediaType:media_type,bytes:byte_size}))});
 }catch(e){error(res,e);}
});
router.post("/trust-proof/me/:listingId/start",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  if(owner.listing.status!=="active"){res.status(409).json({error:"Publish your listing before starting TrustProof."});return;}
  if(typeof req.body?.hasSerial!=="boolean"){res.status(400).json({error:"Specify whether the item has a serial number."});return;}
  await ensureTrustProofTables();
  const prior=await getProof(owner.id);
  if(prior && prior.status==="collecting" && prior.has_serial===req.body.hasSerial &&
     proofCurrent(prior,owner.listing)&&alive(prior)){
    res.json({challenge:prior.challenge,issuedAt:prior.issued_at,expiresAt:prior.expires_at,
      hasSerial:prior.has_serial,reused:true});return;
  }
  if(prior && req.body?.replace!==true){
   res.status(409).json({error:"This proof already exists or expired. Confirm starting again to replace its evidence and revoke any previously reviewed status.",requiresConfirmation:true});return;
  }
  const challenge=challengeCode(),expires=new Date(Date.now()+30*60*1000);
  const fingerprint=listingFingerprint(owner.listing);
  await db.transaction(async tx=>{
   // The listing row serialises concurrent restarts and evidence uploads.
   await tx.execute(sql`SELECT id FROM listings WHERE id=${owner.id} FOR UPDATE`);
   await tx.execute(sql`INSERT INTO marketplace_trust_proofs
    (listing_id,seller_email,challenge,issued_at,expires_at,fingerprint,has_serial,status)
    VALUES(${owner.id},${owner.email},${challenge},NOW(),${expires},${fingerprint},
      ${req.body.hasSerial},'collecting')
    ON CONFLICT(listing_id) DO UPDATE SET seller_email=EXCLUDED.seller_email,
      challenge=EXCLUDED.challenge,issued_at=NOW(),expires_at=EXCLUDED.expires_at,
      fingerprint=EXCLUDED.fingerprint,has_serial=EXCLUDED.has_serial,status='collecting',
      submitted_at=NULL,reviewed_at=NULL,reviewed_by=NULL,review_note=NULL,
      external_provider=NULL,external_reference=NULL,external_checked_at=NULL,external_admin=NULL,
      updated_at=NOW()`);
   await tx.execute(sql`DELETE FROM marketplace_trust_proof_media WHERE listing_id=${owner.id}`);
  });
  await auditProof(owner.id,owner.email,"start",{replacement:Boolean(prior),hasSerial:req.body.hasSerial});
  res.status(201).json({challenge,issuedAt:new Date().toISOString(),expiresAt:expires.toISOString(),hasSerial:req.body.hasSerial});
 }catch(e){error(res,e);}
});
router.post("/trust-proof/me/:listingId/media/:kind",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  if(!mediaKind(req.params.kind)){res.status(400).json({error:"Unknown evidence type"});return;}
  let data:ReturnType<typeof mediaFromDataUrl>;
  try{data=mediaFromDataUrl(req.params.kind,req.body?.dataUrl);}
  catch(e){res.status(400).json({error:e instanceof Error?e.message:"Invalid evidence media"});return;}
  await ensureTrustProofTables();
  const p=await getProof(owner.id);
  if(!p||p.status!=="collecting"||!alive(p)||!proofCurrent(p,owner.listing)){
   res.status(409).json({error:"Start a new challenge. Evidence must match the current listing and be uploaded within 30 minutes."});return;
  }
  if(req.params.kind==="serial"&&!p.has_serial){
   res.status(400).json({error:"This proof is marked as having no serial number."});return;
  }
  // A single upload replaces one unsubmitted evidence slot.
  const updated=await db.transaction(async tx=>{
   const lock=(await tx.execute(sql`SELECT status,challenge,expires_at,fingerprint FROM marketplace_trust_proofs
      WHERE listing_id=${owner.id} FOR UPDATE`)).rows[0] as any;
   if(!lock||lock.status!=="collecting"||lock.challenge!==p.challenge||
     new Date(lock.expires_at).getTime()<Date.now()||lock.fingerprint!==listingFingerprint(owner.listing))return false;
   await tx.execute(sql`INSERT INTO marketplace_trust_proof_media
    (listing_id,kind,media_type,media_bytes,sha256,byte_size,uploaded_at)
    VALUES(${owner.id},${req.params.kind},${data.mime},${data.bytes},${data.sha256},${data.bytes.length},NOW())
    ON CONFLICT(listing_id,kind) DO UPDATE SET media_type=EXCLUDED.media_type,
     media_bytes=EXCLUDED.media_bytes,sha256=EXCLUDED.sha256,byte_size=EXCLUDED.byte_size,uploaded_at=NOW()`);
   return true;
  });
  if(!updated){res.status(409).json({error:"Challenge changed. Please restart your evidence capture."});return;}
  await auditProof(owner.id,owner.email,"upload",{kind:req.params.kind,sha256:data.sha256,bytes:data.bytes.length});
  res.status(201).json({kind:req.params.kind,bytes:data.bytes.length,sha256:data.sha256});
 }catch(e){error(res,e);}
});
router.get("/trust-proof/me/:listingId/media/:kind",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  if(!mediaKind(req.params.kind)){res.status(404).end();return;}
  await ensureTrustProofTables();const row=(await db.execute(sql`SELECT media_type,media_bytes
    FROM marketplace_trust_proof_media WHERE listing_id=${owner.id} AND kind=${req.params.kind}`)).rows[0] as any;
  if(!row){res.status(404).end();return;}
  res.setHeader("Cache-Control","private,no-store");res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Type",row.media_type);res.send(Buffer.from(row.media_bytes));
 }catch(e){error(res,e);}
});
router.post("/trust-proof/me/:listingId/submit",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  await ensureTrustProofTables();
  const proof=await getProof(owner.id);
  if(!proof||proof.status!=="collecting"||!alive(proof)||!proofCurrent(proof,owner.listing)){
   res.status(409).json({error:"Challenge expired or listing changed. Start again."});return;
  }
  const media=await assetSummary(owner.id);
  if(!proofComplete(media.map(a=>a.kind),proof.has_serial)){
   res.status(400).json({error:proof.has_serial
    ?"Supply an item-and-code photo, condition photo and private serial photo, or one complete short video."
    :"Supply an item-and-code photo plus a condition photo, or one complete short video."});return;
  }
  const success=await db.transaction(async tx=>{
   const updated=await tx.execute(sql`UPDATE marketplace_trust_proofs SET status='submitted',submitted_at=NOW(),updated_at=NOW()
    WHERE listing_id=${owner.id} AND status='collecting' AND expires_at>NOW()
      AND fingerprint=${listingFingerprint(owner.listing)} RETURNING listing_id`);
   return updated.rows.length>0;
  });
  if(!success){res.status(409).json({error:"Challenge changed. Refresh and try again."});return;}
  await auditProof(owner.id,owner.email,"submit",{kinds:media.map(a=>a.kind)});
  res.json({status:"submitted",message:"Evidence submitted for human review. It is not yet verified."});
 }catch(e){error(res,e);}
});
router.post("/trust-proof/me/:listingId/revoke",async(req,res)=>{
 try{
  const owner=await own(req,res);if(!owner)return;
  await ensureTrustProofTables();
  const rows=await db.execute(sql`UPDATE marketplace_trust_proofs SET status='revoked',
   reviewed_at=NULL,reviewed_by=NULL,external_provider=NULL,external_reference=NULL,
   external_checked_at=NULL,external_admin=NULL,updated_at=NOW()
   WHERE listing_id=${owner.id} AND LOWER(seller_email)=${owner.email} RETURNING listing_id`);
  if(!rows.rows.length){res.status(404).json({error:"Proof not found"});return;}
  await auditProof(owner.id,owner.email,"seller_revoke");
  res.json({status:"revoked"});
 }catch(e){error(res,e);}
});

/* Private moderation: identity checks and independent third-party authentication
 * are NEVER set through any seller endpoint or by mere receipt of media. */
router.get("/admin/trust-proof",requireAdmin,async(req,res)=>{
 try{
  await ensureTrustProofTables();cache(res);
  const report=await db.execute(sql`SELECT p.listing_id,p.status,p.has_serial,p.submitted_at,p.reviewed_at,
      p.external_provider,l.title,l.condition,l.seller_email,l.status AS listing_status
    FROM marketplace_trust_proofs p JOIN listings l ON l.id=p.listing_id
    ORDER BY CASE p.status WHEN 'submitted' THEN 0 WHEN 'approved' THEN 1
      WHEN 'rejected' THEN 2 ELSE 3 END,p.submitted_at DESC NULLS LAST LIMIT 100`);
  const counts=await db.execute(sql`SELECT status,COUNT(*)::int AS total FROM marketplace_trust_proofs GROUP BY status`);
  res.json({records:report.rows,counts:counts.rows,notice:EXTERNAL_PROVIDER_NOTICE});
 }catch(e){error(res,e);}
});
router.get("/admin/trust-proof/:listingId",requireAdmin,async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);if(!id){res.status(400).json({error:"Invalid listing"});return;}
  await ensureTrustProofTables();const [listing,p]=await Promise.all([getProofListing(id),getProof(id)]);
  if(!listing||!p){res.status(404).json({error:"Proof not found"});return;}
  cache(res);
  const assets=await assetSummary(id);
  const audit=(await db.execute(sql`SELECT actor,action,details,created_at FROM marketplace_trust_proof_audit
    WHERE listing_id=${id} ORDER BY id DESC LIMIT 30`)).rows;
  res.json({listing:{id,title:listing.title,condition:listing.condition,status:listing.status},
    proof:{...p,current:proofCurrent(p,listing)},assets,audit});
 }catch(e){error(res,e);}
});
router.get("/admin/trust-proof/:listingId/media/:kind",requireAdmin,async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);
  if(!id||!mediaKind(String(req.params.kind))){res.status(404).end();return;}
  await ensureTrustProofTables();
  const row=(await db.execute(sql`SELECT media_type,media_bytes FROM marketplace_trust_proof_media
    WHERE listing_id=${id} AND kind=${req.params.kind}`)).rows[0] as any;
  if(!row){res.status(404).end();return;}
  res.setHeader("Cache-Control","private,no-store");
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Content-Type",row.media_type);
  res.send(Buffer.from(row.media_bytes));
 }catch(e){error(res,e);}
});
router.post("/admin/trust-proof/:listingId/review",requireAdmin,async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);
  if(!id){res.status(400).json({error:"Invalid listing"});return;}
  const decision=req.body?.decision;
  if(decision!=="approve"&&decision!=="reject"){res.status(400).json({error:"Choose approve or reject"});return;}
  const note=String(req.body?.note??"").trim().slice(0,1000);
  if(decision==="reject"&&note.length<10){res.status(400).json({error:"Explain the rejection (at least 10 characters)."});return;}
  if(decision==="approve"&&(!req.body?.challengeVisible||!req.body?.itemMatches||
     !req.body?.conditionVisible)){res.status(400).json({error:"A reviewer must confirm code, item and condition before approval."});return;}
  await ensureTrustProofTables();
  const [listing,p]=await Promise.all([getProofListing(id),getProof(id)]);
  if(!listing||!p||p.status!=="submitted"||!proofCurrent(p,listing)||listing.status!=="active"){
   res.status(409).json({error:"Proof unavailable, already reviewed or no longer matches the active listing."});return;
  }
  const assets=await assetSummary(id);
  if(!proofComplete(assets.map(a=>a.kind),p.has_serial)||
    (decision==="approve"&&p.has_serial&&req.body?.serialChecked!==true)){
   res.status(400).json({error:"The required evidence and serial-number review are incomplete."});return;
  }
  const row=await db.execute(sql`UPDATE marketplace_trust_proofs SET status=${decision==="approve"?"approved":"rejected"},
    reviewed_at=NOW(),reviewed_by='Bazunk administrator',review_note=${note},
    external_provider=NULL,external_reference=NULL,external_checked_at=NULL,external_admin=NULL,
    updated_at=NOW() WHERE listing_id=${id} AND status='submitted' AND fingerprint=${listingFingerprint(listing)}
    RETURNING listing_id`);
  if(!row.rows.length){res.status(409).json({error:"Review status changed."});return;}
  await auditProof(id,"Bazunk administrator",decision==="approve"?"evidence_approved":"evidence_rejected",
   {note,challengeVisible:req.body?.challengeVisible===true,
    itemMatches:req.body?.itemMatches===true,conditionVisible:req.body?.conditionVisible===true,
    serialChecked:req.body?.serialChecked===true});
  res.json({status:decision==="approve"?"approved":"rejected"});
 }catch(e){error(res,e);}
});
router.post("/admin/trust-proof/:listingId/authentication",requireAdmin,async(req,res)=>{
 try{
  const id=validListingId(req.params.listingId);if(!id){res.status(400).json({error:"Invalid listing"});return;}
  const action=req.body?.action;
  if(action!=="record"&&action!=="revoke"){res.status(400).json({error:"Invalid action"});return;}
  const provider=String(req.body?.provider??"").trim().slice(0,120);
  const reference=String(req.body?.reference??"").trim().slice(0,160);
  const howChecked=String(req.body?.howChecked??"").trim().slice(0,750);
  if(action==="record" && (provider.length<3||reference.length<4||howChecked.length<20||
      req.body?.confirmedWithProvider!==true)){
   res.status(400).json({error:"Record the third-party authenticator, report reference and at least 20 characters explaining how you independently confirmed the report with that provider."});return;
  }
  await ensureTrustProofTables();
  const [listing,p]=await Promise.all([getProofListing(id),getProof(id)]);
  if(!listing||!p||p.status!=="approved"||listing.status!=="active"||!proofCurrent(p,listing)){
   res.status(409).json({error:"First approve current listing evidence before recording a third-party authentication report."});return;
  }
  const row=await db.execute(sql`UPDATE marketplace_trust_proofs SET
    external_provider=${action==="record"?provider:null},
    external_reference=${action==="record"?reference:null},
    external_checked_at=${action==="record"?new Date():null},
    external_admin=${action==="record"?"Bazunk administrator":null},updated_at=NOW()
    WHERE listing_id=${id} AND status='approved' AND fingerprint=${listingFingerprint(listing)}
    RETURNING listing_id`);
  if(!row.rows.length){res.status(409).json({error:"Proof changed before authentication."});return;}
  await auditProof(id,"Bazunk administrator",action==="record"?"third_party_auth_recorded":"third_party_auth_revoked",
    {provider:action==="record"?provider:undefined,reference:action==="record"?reference:undefined,
     howChecked:action==="record"?howChecked:undefined});
  res.json({independentlyAuthenticated:action==="record"});
 }catch(e){error(res,e);}
});
export default router;
