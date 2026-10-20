import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const logic=file("artifacts/api-server/src/lib/trustProof.ts");
const api=file("artifacts/api-server/src/routes/trustProof.ts");
const listings=file("artifacts/api-server/src/routes/listings.ts");
const buyer=file("artifacts/sellbuydeal/src/components/listing/TrustProofBuyerPanel.tsx");
const seller=file("artifacts/sellbuydeal/src/pages/TrustProofPage.tsx");
const admin=file("artifacts/sellbuydeal/src/pages/admin/AdminTrustProofPage.tsx");
const flags=file("artifacts/api-server/src/lib/featureFlags.ts");
const gate=file("artifacts/api-server/src/middlewares/featureGate.ts");
const app=file("artifacts/sellbuydeal/src/App.tsx");
const privacy=file("artifacts/sellbuydeal/src/pages/PrivacyPage.tsx");

test("separate identity, evidence and third-party authentication status",()=>{
 assert.match(buyer,/Identity verified/);
 assert.match(buyer,/Evidence reviewed/);
 assert.match(buyer,/Third-party authenticated/);
 assert.match(buyer,/Not independently authenticated/);
 assert.match(api,/SELECT verification_status FROM users/);
 assert.match(api,/p\.external_provider&&p\.external_reference&&p\.external_checked_at/);
 assert.match(api,/approved&&p\.external_provider/);
});
test("seller challenge is random, expires and binds to exact listing snapshot",()=>{
 assert.match(logic,/randomBytes\(5\)/);
 assert.match(api,/30\*60\*1000/);
 assert.match(api,/proofCurrent\(p,owner\.listing\)/);
 assert.match(logic,/createHash\("sha256"\)/);
 assert.match(api,/WHERE listing_id=\$\{owner\.id\}/);
 assert.match(api,/LOWER\(seller_email\)=\$\{owner\.email\}/);
 assert.match(listings,/status='revoked'/);
 assert.match(listings,/listing_changed/);
});
test("only approved item and condition photographs may be shown to buyers",()=>{
 assert.match(api,/approved\?assets\.filter\(a=>a\.kind==="item"\|\|a\.kind==="condition"\)/);
 assert.match(api,/!\["item","condition"\]\.includes\(req\.params\.kind\)/);
 assert.match(api,/p\.status!=="approved"/);
 assert.match(api,/proofCurrent\(p,listing\)/);
 assert.match(api,/listing\.status!=="active"/);
 assert.match(api,/X-Content-Type-Options/);
 assert.match(api,/no-store/);
 assert.doesNotMatch(api.split('router.get("/trust-proof/:listingId",')[1].split('router.get("/trust-proof/:listingId/media')[0],/p\.challenge/);
});
test("photo/video bytes are privately stored, bounded and checked by signature",()=>{
 assert.match(logic,/media_bytes BYTEA NOT NULL/);
 assert.match(logic,/kind TEXT NOT NULL CHECK\(kind IN/);
 assert.match(logic,/3\*1024\*1024/);
 assert.match(logic,/4\*1024\*1024/);
 assert.match(logic,/image\/jpeg/);
 assert.match(logic,/video\/webm/);
 assert.match(logic,/mime==="image\/png"&&png/);
 assert.match(logic,/mime==="video\/mp4"&&mp4/);
 assert.match(api,/requireAdmin/);
 assert.match(api,/authenticatedSellerEmail/);
 assert.match(api,/proofComplete/);
});
test("review requires an actual person to verify code, item, condition and serial",()=>{
 assert.match(api,/req\.body\?\.challengeVisible/);
 assert.match(api,/req\.body\?\.itemMatches/);
 assert.match(api,/req\.body\?\.conditionVisible/);
 assert.match(api,/p\.has_serial&&req\.body\?\.serialChecked!==true/);
 assert.match(api,/status='submitted'/);
 assert.match(admin,/Human reviewer checklist/);
});
test("only authorised administrators can record external authentication provenance",()=>{
 assert.match(api,/router\.post\("\/admin\/trust-proof\/:listingId\/authentication",requireAdmin/);
 assert.match(api,/confirmedWithProvider!==true/);
 assert.match(api,/howChecked\.length<20/);
 assert.match(api,/external_provider=\$\{action==="record"\?provider:null\}/);
 assert.match(api,/third_party_auth_recorded/);
 assert.match(api,/external_provider=NULL,external_reference=NULL/);
 const sellerPart=api.split('router.post("/trust-proof/me/:listingId/start"')[1].split('router.get("/admin/trust-proof"')[0];
 assert.doesNotMatch(sellerPart,/third_party_auth_recorded/);
 assert.doesNotMatch(sellerPart,/external_provider=\$\{provider\}/);
});
test("seller wizard has photos, video, private serial warning and submit control",()=>{
 assert.match(seller,/UTC date:/);
 assert.match(seller,/Take or choose photo/);
 assert.match(seller,/Record a six-second clip/);
 assert.match(seller,/data-testid="trust-proof-submit"/);
 assert.match(seller,/Private serial/);
 assert.match(seller,/does not verify identity or authenticate/);
});
test("privacy disclosures and media purge lifecycle",()=>{
 assert.match(privacy,/7A\. TrustProof listing evidence/);
 assert.match(privacy,/serial-number photos and verification videos remain private/);
 assert.match(logic,/p\.status='collecting' AND p\.expires_at<NOW\(\)-INTERVAL '48 hours'/);
 assert.match(logic,/p\.status='rejected'/);
 assert.match(logic,/p\.status='revoked'/);
 assert.match(app,/<Route path="\/trust-proof">/);
 assert.match(flags,/\["trust_proof","TrustProof listing evidence","Trust"\]/);
 assert.match(gate,/\^\\\/trust-proof/);
});

test("live camera preview is visible during TrustProof recording and tracks are cleaned up",()=>{
 assert.match(seller,/videoPreview=useRef<HTMLVideoElement\|null>/);
 assert.match(seller,/videoPreview\.current\.srcObject=stream/);
 assert.match(seller,/videoPreview\.current\.srcObject=null/);
 assert.match(seller,/aria-label="Live camera preview during verification video recording"/);
 assert.match(seller,/playsInline autoPlay muted/);
});
test("admin moderation audit records session attribution without storing bearer token",()=>{
 assert.match(api,/reviewActor=\(req:any\)/);
 assert.match(api,/admin-session:/);
 assert.match(api,/createHash\("sha256"\)/);
 assert.match(api,/reviewed_by=\$\{reviewActor\(req\)\}/);
 assert.match(api,/await auditProof\(id,reviewActor\(req\)/);
});
