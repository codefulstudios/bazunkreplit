import { createHash, randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type ProofStatus="collecting"|"submitted"|"approved"|"rejected"|"revoked";
export type ProofKind="item"|"condition"|"serial"|"video";
export type ProofListing={id:number;title:string;description:string;condition:string;image:string|null;
 seller_email:string;status:string;public_id:string|null};
export type ProofRecord={listing_id:number;seller_email:string;challenge:string;issued_at:Date|string;
 expires_at:Date|string;fingerprint:string;has_serial:boolean;status:ProofStatus;
 submitted_at:Date|string|null;reviewed_at:Date|string|null;reviewed_by:string|null;
 review_note:string|null;external_provider:string|null;external_reference:string|null;
 external_checked_at:Date|string|null;external_admin:string|null};
let tables:Promise<void>|null=null;

/** Small proof media is stored privately in PostgreSQL (not a public URL).
 * Maximum 3MB per photo and 4MB per short video, suitable for phone camera compression.
 * A production object store should be used before increasing these limits.
 */
export function ensureTrustProofTables():Promise<void>{
 if(tables)return tables;
 tables=(async()=>{
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_trust_proofs (
    listing_id INTEGER PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    seller_email TEXT NOT NULL, challenge TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    fingerprint CHAR(64) NOT NULL, has_serial BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL CHECK(status IN ('collecting','submitted','approved','rejected','revoked')),
    submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, reviewed_by TEXT,
    review_note TEXT, external_provider TEXT, external_reference TEXT,
    external_checked_at TIMESTAMPTZ, external_admin TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_trust_proof_media (
    listing_id INTEGER NOT NULL REFERENCES marketplace_trust_proofs(listing_id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('item','condition','serial','video')),
    media_type TEXT NOT NULL, media_bytes BYTEA NOT NULL,
    sha256 CHAR(64) NOT NULL, byte_size INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (listing_id,kind))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS marketplace_trust_proof_audit (
    id BIGSERIAL PRIMARY KEY,listing_id INTEGER NOT NULL,
    actor TEXT NOT NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS trust_proof_review_idx
    ON marketplace_trust_proofs(status,submitted_at DESC)`);
 })().catch(e=>{tables=null;throw e;});
 return tables;
}
export async function getProofListing(id:number):Promise<ProofListing|null>{
 const r=await db.execute(sql`SELECT id,title,description,condition,image,seller_email,status,public_id
   FROM listings WHERE id=${id} LIMIT 1`);
 return (r.rows[0] as unknown as ProofListing)||null;
}
export function validListingId(value:unknown):number|null{
 const str=String(value??"");
 if(!/^\d{1,10}$/.test(str))return null;
 const id=Number(str);
 return Number.isSafeInteger(id)&&id>0&&id<=2147483647?id:null;
}
export function listingFingerprint(l:ProofListing):string{
 return createHash("sha256").update(JSON.stringify([
  l.id,String(l.title||"").trim(),String(l.description||"").trim(),
  String(l.condition||"").trim(),l.image?createHash("sha256").update(l.image).digest("hex"):null,
  String(l.seller_email||"").toLowerCase()
 ])).digest("hex");
}
export async function getProof(id:number):Promise<ProofRecord|null>{
 const r=await db.execute(sql`SELECT listing_id,seller_email,challenge,issued_at,expires_at,
  fingerprint,has_serial,status,submitted_at,reviewed_at,reviewed_by,review_note,
  external_provider,external_reference,external_checked_at,external_admin
  FROM marketplace_trust_proofs WHERE listing_id=${id}`);
 return (r.rows[0] as unknown as ProofRecord)||null;
}
export async function assetSummary(id:number):Promise<{kind:ProofKind;media_type:string;byte_size:number;sha256:string}[]>{
 const r=await db.execute(sql`SELECT kind,media_type,byte_size,sha256 FROM marketplace_trust_proof_media
    WHERE listing_id=${id} ORDER BY CASE kind WHEN 'item' THEN 1 WHEN 'condition' THEN 2 WHEN 'serial' THEN 3 ELSE 4 END`);
 return r.rows as any[];
}
export function proofCurrent(proof:ProofRecord,listing:ProofListing):boolean{
 return proof.fingerprint===listingFingerprint(listing) && proof.seller_email.toLowerCase()===listing.seller_email.toLowerCase();
}
export function proofComplete(kinds:string[],hasSerial:boolean):boolean{
 return kinds.includes("video") ||
   (kinds.includes("item")&&kinds.includes("condition")&&(!hasSerial||kinds.includes("serial")));
}
export function challengeCode():string{return "BZ-"+randomBytes(5).toString("hex").toUpperCase();}
export function mediaFromDataUrl(kind:ProofKind,raw:unknown):{mime:string;bytes:Buffer;sha256:string}{
 if(typeof raw!=="string")throw Error("Upload a photo or short video.");
 const match=/^data:(image\/(?:jpeg|png|webp)|video\/(?:webm|mp4));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
 if(!match)throw Error("Use JPEG, PNG, WebP, MP4 or WebM evidence.");
 const mime=match[1],base64=match[2];
 if((kind==="video")!==mime.startsWith("video/"))throw Error("This evidence step needs a different media type.");
 const max=kind==="video"?4*1024*1024:3*1024*1024;
 if(base64.length>Math.ceil(max*4/3)+4)throw Error("Evidence exceeds the per-file size limit.");
 const bytes=Buffer.from(base64,"base64");
 if(!bytes.length||bytes.length>max || bytes.toString("base64")!==base64)
  throw Error("Invalid or oversized media.");
 const webp=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
 const mp4=bytes.toString("ascii",4,8)==="ftyp";
 const webm=bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const valid=(mime==="image/jpeg"&&jpg)||(mime==="image/png"&&png)||
  (mime==="image/webp"&&webp)||(mime==="video/mp4"&&mp4)||(mime==="video/webm"&&webm);
 if(!valid)throw Error("The file content does not match its declared type.");
 return {mime,bytes,sha256:createHash("sha256").update(bytes).digest("hex")};
}
export async function auditProof(listingId:number,actor:string,action:string,details:object={}){
 await db.execute(sql`INSERT INTO marketplace_trust_proof_audit(listing_id,actor,action,details)
   VALUES(${listingId},${actor.slice(0,250)},${action},${JSON.stringify(details)}::jsonb)`);
}
export const EXTERNAL_PROVIDER_NOTICE=
 "Independent product authentication requires a separately checked third-party report. Seller photos and a Bazunk proof review do not establish authenticity.";
