import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
const router=Router();
let initialized:Promise<void>|undefined;
function ensure(){return initialized??(initialized=(async()=>{await db.execute(sql`CREATE TABLE IF NOT EXISTS live_commerce_entries (
 id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('stream','creator','product')),
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', platform TEXT NOT NULL DEFAULT 'tiktok',
 destination_url TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '', creator_name TEXT NOT NULL DEFAULT '',
 price NUMERIC(12,2), currency TEXT NOT NULL DEFAULT 'GBP', affiliate BOOLEAN NOT NULL DEFAULT FALSE,
 featured BOOLEAN NOT NULL DEFAULT FALSE, enabled BOOLEAN NOT NULL DEFAULT FALSE,
 status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','upcoming','live','ended')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);await db.execute(sql`ALTER TABLE live_commerce_entries ADD COLUMN IF NOT EXISTS sponsor_until TIMESTAMPTZ`);await db.execute(sql`ALTER TABLE live_commerce_entries ADD COLUMN IF NOT EXISTS sponsor_fee_pence INTEGER NOT NULL DEFAULT 0`);await db.execute(sql`ALTER TABLE live_commerce_entries ADD COLUMN IF NOT EXISTS sponsor_payment_status TEXT NOT NULL DEFAULT 'unpaid'`);await db.execute(sql`ALTER TABLE live_commerce_entries ADD COLUMN IF NOT EXISTS sponsor_clicks INTEGER NOT NULL DEFAULT 0`);})()).catch(e=>{initialized=undefined;throw e});}
const allowedHosts:Record<string,string[]>={
 tiktok:["tiktok.com"],ebay:["ebay.com","ebay.co.uk"],youtube:["youtube.com","youtu.be"],twitch:["twitch.tv"],
 instagram:["instagram.com"],facebook:["facebook.com","fb.watch"]
};
function platformHostAllowed(platform:string,url:string){
 try{const host=new URL(url).hostname.toLowerCase();
 return (allowedHosts[platform]||[]).some(domain=>host===domain||host.endsWith("."+domain));}catch{return false}
}
const clean=(v:unknown,n=500)=>String(v??"").trim().slice(0,n);
function safeUrl(v:unknown){try{const u=new URL(clean(v,2048));if(u.protocol!=="https:")return "";return u.toString()}catch{return ""}}
router.get("/live-commerce",async(_req,res)=>{try{await ensure();const q=await db.execute(sql`SELECT id,kind,title,description,platform,destination_url AS "destinationUrl",image_url AS "imageUrl",creator_name AS "creatorName",price,currency,affiliate,featured,CASE WHEN sponsor_payment_status='paid' AND sponsor_until>NOW() THEN TRUE ELSE FALSE END AS sponsored,status FROM live_commerce_entries WHERE enabled=TRUE AND status<>'unverified' ORDER BY (sponsor_payment_status='paid' AND sponsor_until>NOW()) DESC,featured DESC,updated_at DESC LIMIT 100`);res.json({entries:q.rows})}catch{res.status(503).json({error:"Live discovery is temporarily unavailable",entries:[]})}});
router.get("/admin/live-commerce",requireAdmin,async(_req,res)=>{try{await ensure();const q=await db.execute(sql`SELECT id,kind,title,description,platform,destination_url AS "destinationUrl",image_url AS "imageUrl",creator_name AS "creatorName",price,currency,affiliate,featured,enabled,status,sponsor_until AS "sponsorUntil",sponsor_fee_pence AS "sponsorFeePence",sponsor_payment_status AS "sponsorPaymentStatus",sponsor_clicks AS "sponsorClicks" FROM live_commerce_entries ORDER BY updated_at DESC LIMIT 250`);res.json({entries:q.rows})}catch{res.status(503).json({error:"Unable to load live commerce"})}});
router.post("/admin/live-commerce",requireAdmin,async(req,res)=>{
 try{await ensure();const b=req.body??{};const kind=clean(b.kind,20),platform=clean(b.platform,20),url=safeUrl(b.destinationUrl),img=b.imageUrl?safeUrl(b.imageUrl):"";
 if(!["stream","creator","product"].includes(kind)||!["tiktok","ebay","youtube","twitch","instagram","facebook"].includes(platform)||!clean(b.title,160)||!url||!platformHostAllowed(platform,url)||(b.imageUrl&&!img)){res.status(400).json({error:"A valid title, platform and HTTPS destination are required"});return}
 const status=["unverified","upcoming","live","ended"].includes(b.status)?b.status:"unverified";
 const price=b.price===""||b.price==null?null:Number(b.price);
 if(price!==null&&(!Number.isFinite(price)||price<0||price>1000000)){res.status(400).json({error:"Invalid price"});return}
 const id=Number(b.id);if(b.id&&(!Number.isSafeInteger(id)||id<1)){res.status(400).json({error:"Invalid entry ID"});return}
 const title=clean(b.title,160),description=clean(b.description,700),creator=clean(b.creatorName,120),currency=["GBP","USD","EUR"].includes(b.currency)?b.currency:"GBP";
 const affiliate=b.affiliate===true,featured=b.featured===true,enabled=b.enabled===true;
 const sponsorPaymentStatus=['unpaid','paid','refunded'].includes(b.sponsorPaymentStatus)?b.sponsorPaymentStatus:'unpaid';
 const sponsorFeePence=Number(b.sponsorFeePence??0);
 const sponsorUntil=b.sponsorUntil?new Date(b.sponsorUntil):null;
 if(!Number.isSafeInteger(sponsorFeePence)||sponsorFeePence<0||sponsorFeePence>100000000||(sponsorUntil&&!Number.isFinite(sponsorUntil.getTime()))){res.status(400).json({error:'Invalid sponsorship details'});return;}
 if(sponsorPaymentStatus==='paid'&&(!sponsorUntil||sponsorUntil<=new Date())){res.status(400).json({error:'Paid sponsorship requires a future expiry date'});return;}
 if(enabled&&status==="unverified"){res.status(400).json({error:"Verify the destination and rights before publishing."});return;}
 if(affiliate&&b.affiliateApproved!==true){res.status(400).json({error:"Affiliate links require confirmed programme approval."});return;}
 if(id){const q=await db.execute(sql`UPDATE live_commerce_entries SET kind=${kind},title=${title},description=${description},platform=${platform},destination_url=${url},image_url=${img},creator_name=${creator},price=${price},currency=${currency},affiliate=${affiliate},featured=${featured},enabled=${enabled},status=${status},sponsor_until=${sponsorUntil?sponsorUntil.toISOString():null},sponsor_fee_pence=${sponsorFeePence},sponsor_payment_status=${sponsorPaymentStatus},updated_at=NOW() WHERE id=${id} RETURNING id`);if(!q.rows.length){res.status(404).json({error:"Entry not found"});return}res.json({id})}
 else{const q=await db.execute(sql`INSERT INTO live_commerce_entries(kind,title,description,platform,destination_url,image_url,creator_name,price,currency,affiliate,featured,enabled,status,sponsor_until,sponsor_fee_pence,sponsor_payment_status) VALUES(${kind},${title},${description},${platform},${url},${img},${creator},${price},${currency},${affiliate},${featured},${enabled},${status},${sponsorUntil?sponsorUntil.toISOString():null},${sponsorFeePence},${sponsorPaymentStatus}) RETURNING id`);res.json({id:q.rows[0]?.id})}
 }catch{res.status(500).json({error:"Could not save entry"})}
});
router.delete("/admin/live-commerce/:id",requireAdmin,async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:"Invalid ID"});return}try{await ensure();await db.execute(sql`DELETE FROM live_commerce_entries WHERE id=${id}`);res.json({ok:true})}catch{res.status(500).json({error:"Unable to delete entry"})}});
export default router;
