import { Router } from "express";
import { randomUUID } from "crypto";
import { db, classifiedAdsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { amountMinor, ensureFindItTables, findPhoto, findQuote } from "../lib/findIt.js";
import { dealTerms } from "../lib/dealPilot.js";

const router=Router();
const sendError=(res:any,e:unknown)=>{console.error("Find It failed",e);res.status(503).json({error:"Find It is temporarily unavailable."});};
const safeText=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
const validId=(id:unknown)=>typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id);
const expires=(days:unknown)=>new Date(Date.now()+([7,14,30].includes(Number(days))?Number(days):14)*86400000);
const photoError=(res:any,e:unknown)=>{res.status(400).json({error:e instanceof Error?e.message:"Invalid photo"});};
const validatedFields=(body:any)=>{
  const title=safeText(body?.title,120),description=safeText(body?.description,2000);
  const category=safeText(body?.category,100),location=safeText(body?.location,120);
  const contactName=safeText(body?.contactName,100);
  const region=body?.region,amount=amountMinor(body?.budget);
  if(title.length<3||description.length<10||!category||!location||!contactName||
    !["uk","us"].includes(region)||amount<100) return null;
  return {title,description,category,location,contactName,region:region as "uk"|"us",amount};
};
/** Disallow mutating an accepted request during a valid Stripe reservation. */
async function liveCheckout(selectedOfferId:string|null|undefined){
 if(!selectedOfferId)return false;
 const exists=(await db.execute(sql`SELECT to_regclass('public.special_checkout_reservations') AS ref`)).rows[0]?.ref;
 if(!exists)return false;
 const rows=await db.execute(sql`SELECT 1 FROM special_checkout_reservations
   WHERE source=${"find_it:"+selectedOfferId} AND (fulfilled_at IS NOT NULL OR expires_at>NOW()) LIMIT 1`);
 return rows.rows.length>0;
}

// Public marketplace results: NEVER return buyer email, phone or private seller bid details.
router.get("/find-it",async(req,res)=>{
 try{
  await ensureFindItTables();
  const region=String(req.query.region??"uk");
  if(!["uk","us"].includes(region)){res.status(400).json({error:"Choose UK or USA"});return;}
  const raw=Math.trunc(Number(req.query.limit)||30),limit=Math.min(60,Math.max(1,raw));
  const rows=await db.execute(sql`SELECT r.id,r.classified_id,r.region,r.budget_minor,r.status,r.expires_at,r.created_at,
    a.title,a.description,a.category,a.subcategory,a.location,a.condition,a.photos,
    (SELECT COUNT(*)::int FROM marketplace_find_offers o WHERE o.request_id=r.id AND o.status IN ('pending','selected')) AS offer_count
    FROM marketplace_find_requests r JOIN classified_ads a ON a.id=r.classified_id
    WHERE r.region=${region} AND r.status='open' AND r.expires_at>NOW() AND a.status='active'
    ORDER BY r.created_at DESC LIMIT ${limit}`);
  res.setHeader("Cache-Control","no-store");res.json(rows.rows);
 }catch(e){sendError(res,e);}
});
router.get("/find-it/mine",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensureFindItTables();
  const requests=(await db.execute(sql`SELECT r.id,r.classified_id,r.region,r.budget_minor,r.status,r.expires_at,
     r.selected_offer_id,r.created_at,a.title,a.description,a.category,a.condition,a.location,a.photos
     FROM marketplace_find_requests r JOIN classified_ads a ON a.id=r.classified_id
     WHERE LOWER(r.buyer_email)=${email} ORDER BY r.created_at DESC LIMIT 100`)).rows as any[];
  const buyerOffers=(await db.execute(sql`SELECT o.id,o.request_id,o.seller_name,o.item_title,o.description,o.condition,
      o.price_minor,o.photo,o.status,o.created_at,r.region,r.budget_minor,a.category
      FROM marketplace_find_offers o JOIN marketplace_find_requests r ON r.id=o.request_id
      JOIN classified_ads a ON a.id=r.classified_id
      WHERE LOWER(r.buyer_email)=${email} ORDER BY o.created_at DESC LIMIT 160`)).rows as any[];
  const sellerOffers=(await db.execute(sql`SELECT o.id,o.request_id,o.seller_name,o.item_title,o.description,o.condition,
      o.price_minor,o.photo,o.status,o.created_at,r.region,r.status AS request_status,r.expires_at,
      a.title AS request_title
      FROM marketplace_find_offers o JOIN marketplace_find_requests r ON r.id=o.request_id
      JOIN classified_ads a ON a.id=r.classified_id
      WHERE LOWER(o.seller_email)=${email} ORDER BY o.created_at DESC LIMIT 100`)).rows;
  const offers=await Promise.all(buyerOffers.map(async o=>{
    try {return {...o,quote:await findQuote(o)};} catch {return {...o,quote:null};}
  }));
  res.setHeader("Cache-Control","private,no-store");res.json({requests,offers,sellerOffers});
 }catch(e){sendError(res,e);}
});
router.get("/find-it/eligible",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  await ensureFindItTables();
  const ads=(await db.execute(sql`SELECT a.id,a.title,a.description,a.category,a.location,a.price,a.marketplace_region,a.photos
    FROM classified_ads a LEFT JOIN marketplace_find_requests r ON r.classified_id=a.id
    WHERE a.type='wanted' AND a.status='active' AND (a.expires_at IS NULL OR a.expires_at>NOW())
    AND LOWER(a.contact_email)=${email} AND r.id IS NULL
    ORDER BY a.posted_at DESC LIMIT 40`)).rows;
  res.json(ads);
 }catch(e){sendError(res,e);}
});
// Deterministic existing-inventory suggestions, with strict regional filtering.
router.get("/find-it/suggested",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const region=String(req.query.region??"uk");
  if(!["uk","us"].includes(region)){res.status(400).json({error:"Invalid region"});return;}
  await ensureFindItTables();
  const [inventory,requests]=await Promise.all([
    db.execute(sql`SELECT id,title,category,specifications FROM listings
      WHERE LOWER(seller_email)=${email} AND status='active' ORDER BY updated_at DESC LIMIT 200`),
    db.execute(sql`SELECT r.id,a.title,a.category,r.budget_minor FROM marketplace_find_requests r
      JOIN classified_ads a ON a.id=r.classified_id
      WHERE r.region=${region} AND r.status='open' AND r.expires_at>NOW()
      ORDER BY r.created_at DESC LIMIT 120`)
  ]);
  const valid=(inventory.rows as any[]).filter(l=>{
    try{
      const specs=JSON.parse(String(l.specifications||"{}"));
      return specs.marketplace_region===region && specs.demo_creator!==true && specs.demo_creator!=="true";
    }catch{return false;}
  });
  const suggestions=(requests.rows as any[]).map(r=>{
    const target=dealTerms(String(r.title));
    const match=valid.map(l=>{
      const words=dealTerms(String(l.title));
      const overlap=target.filter(w=>words.includes(w)).length;
      const sameCat=String(l.category).toLowerCase()===String(r.category).toLowerCase();
      return {listingId:l.id,listingTitle:l.title,score:overlap+(sameCat?1:0),overlap};
    }).filter(m=>m.overlap>=Math.min(2,target.length)&&m.overlap>0)
     .sort((a,b)=>b.score-a.score)[0];
    return match?{requestId:r.id,...match}:null;
  }).filter(Boolean);
  res.setHeader("Cache-Control","private,no-store");res.json(suggestions);
 }catch(e){sendError(res,e);}
});
router.post("/find-it",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const f=validatedFields(req.body);
  if(!f){res.status(400).json({error:"Enter a title, description (10+ characters), category, location, name, region and budget."});return;}
  let photo:string|null;
  try{photo=findPhoto(req.body?.photo);}catch(e){photoError(res,e);return;}
  await ensureFindItTables();
  const count=(await db.execute(sql`SELECT COUNT(*)::int n FROM marketplace_find_requests WHERE LOWER(buyer_email)=${email} AND status IN ('open','accepted')`)).rows[0] as any;
  if(Number(count?.n)>=20){res.status(409).json({error:"Maximum 20 active requests per buyer"});return;}
  const id=randomUUID();
  const created=await db.transaction(async tx=>{
    const [ad]=await tx.insert(classifiedAdsTable).values({
      title:f.title,description:f.description,category:f.category,type:"wanted",price:(f.amount/100).toFixed(2),
      marketplaceRegion:f.region,location:f.location,contactName:f.contactName,contactEmail:email,
      condition:safeText(req.body?.condition,30)||null,photos:photo?JSON.stringify([photo]):null,
      priceLabel:"Maximum budget",status:"active",expiresAt:expires(req.body?.days)
    }).returning({id:classifiedAdsTable.id});
    await tx.execute(sql`INSERT INTO marketplace_find_requests(id,classified_id,buyer_email,region,budget_minor,expires_at)
      VALUES(${id},${ad.id},${email},${f.region},${f.amount},${expires(req.body?.days).toISOString()})`);
    return ad.id;
  });
  res.status(201).json({id,classifiedId:created});
 }catch(e){sendError(res,e);}
});
router.post("/find-it/upgrade",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  const classifiedId=Number(req.body?.classifiedId),budget=amountMinor(req.body?.budget);
  if(!Number.isSafeInteger(classifiedId)||classifiedId<=0||!budget){res.status(400).json({error:"Choose your Wanted listing and maximum budget."});return;}
  await ensureFindItTables();
  const id=randomUUID();
  const row=await db.transaction(async tx=>{
    const a=(await tx.execute(sql`SELECT a.id,a.marketplace_region FROM classified_ads a
      WHERE a.id=${classifiedId} AND a.type='wanted' AND a.status='active'
        AND LOWER(a.contact_email)=${email} FOR UPDATE`)).rows[0] as any;
    if(!a||!["uk","us"].includes(a.marketplace_region))return null;
    const already=(await tx.execute(sql`SELECT 1 FROM marketplace_find_requests WHERE classified_id=${classifiedId}`)).rows.length;
    if(already)return null;
    await tx.execute(sql`INSERT INTO marketplace_find_requests(id,classified_id,buyer_email,region,budget_minor,expires_at)
      VALUES(${id},${classifiedId},${email},${a.marketplace_region},${budget},${expires(req.body?.days).toISOString()})`);
    await tx.execute(sql`UPDATE classified_ads SET price=${(budget/100).toFixed(2)},price_label='Maximum budget',expires_at=${expires(req.body?.days).toISOString()} WHERE id=${classifiedId}`);
    return id;
  });
  if(!row){res.status(409).json({error:"This Wanted listing cannot be upgraded or is already using Find It."});return;}
  res.status(201).json({id:row});
 }catch(e){sendError(res,e);}
});
router.get("/find-it/:id",async(req,res)=>{
 try{
  if(!validId(req.params.id)){res.status(400).json({error:"Invalid request"});return;}
  await ensureFindItTables();
  const request=(await db.execute(sql`SELECT r.id,r.region,r.budget_minor,r.status,r.expires_at,r.created_at,
   a.title,a.description,a.category,a.location,a.condition,a.photos,
   (SELECT COUNT(*)::int FROM marketplace_find_offers o WHERE o.request_id=r.id AND o.status IN ('pending','selected')) offer_count
   FROM marketplace_find_requests r JOIN classified_ads a ON a.id=r.classified_id
   WHERE r.id=${req.params.id} AND r.status <> 'paused'`)).rows[0];
  if(!request){res.status(404).json({error:"Request not available"});return;}
  res.json(request);
 }catch(e){sendError(res,e);}
});
router.post("/find-it/:id/offers",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)){res.status(400).json({error:"Invalid request"});return;}
  const title=safeText(req.body?.title,120),description=safeText(req.body?.description,1000);
  const sellerName=safeText(req.body?.sellerName,100),condition=safeText(req.body?.condition,30);
  const price=amountMinor(req.body?.price);
  if(title.length<3||description.length<10||!sellerName||!price||!["new","excellent","good","fair","used"].includes(condition)){
    res.status(400).json({error:"Enter item title, description, seller name, condition and price."});return;
  }
  let photo:string|null;
  try{photo=findPhoto(req.body?.photo);}catch(e){photoError(res,e);return;}
  await ensureFindItTables();
  const id=randomUUID();
  const result=await db.transaction(async tx=>{
    const r=(await tx.execute(sql`SELECT r.id,r.region,r.budget_minor,r.status,r.expires_at,r.buyer_email,a.category
      FROM marketplace_find_requests r JOIN classified_ads a ON a.id=r.classified_id
      WHERE r.id=${req.params.id} FOR UPDATE OF r`)).rows[0] as any;
    if(!r||r.status!=="open"||new Date(r.expires_at).getTime()<=Date.now())return "closed";
    if(String(r.buyer_email).toLowerCase()===email)return "own";
    const existing=(await tx.execute(sql`SELECT 1 FROM marketplace_find_offers WHERE request_id=${req.params.id} AND LOWER(seller_email)=${email}`)).rows.length;
    if(existing)return "duplicate";
    const count=(await tx.execute(sql`SELECT COUNT(*)::int n FROM marketplace_find_offers WHERE request_id=${req.params.id}`)).rows[0] as any;
    if(Number(count.n)>=100)return "full";
    // The advertised bid must fit the buyer's all-in limit at today's exchange rate and fee policy.
    const quote=await findQuote({price_minor:price,seller_email:email,region:r.region,category:r.category});
    if(quote.total_minor>Number(r.budget_minor))return "budget";
    await tx.execute(sql`INSERT INTO marketplace_find_offers(id,request_id,seller_email,seller_name,item_title,
       description,condition,price_minor,photo)
       VALUES(${id},${req.params.id},${email},${sellerName},${title},${description},${condition},${price},${photo})`);
    return "ok";
  });
  if(result!=="ok"){res.status(409).json({error:({
    closed:"This request is no longer accepting offers.",own:"You cannot bid on your own request.",
    duplicate:"You've already submitted an offer to this buyer.",full:"This request has reached its offer limit.",
    budget:"The item, delivery and buyer protection exceed the buyer's maximum budget."
  } as Record<string,string>)[result]});return;}
  res.status(201).json({id});
 }catch(e){sendError(res,e);}
});
router.post("/find-it/:id/accept/:offerId",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)||!validId(req.params.offerId)){res.status(400).json({error:"Invalid offer"});return;}
  await ensureFindItTables();
  const r=await db.transaction(async tx=>{
    const row=(await tx.execute(sql`SELECT r.*,a.category FROM marketplace_find_requests r
      JOIN classified_ads a ON a.id=r.classified_id WHERE r.id=${req.params.id} FOR UPDATE OF r`)).rows[0] as any;
    if(!row||String(row.buyer_email).toLowerCase()!==email)return "forbidden";
    if(row.status!=="open"||new Date(row.expires_at).getTime()<Date.now())return "closed";
    const offer=(await tx.execute(sql`SELECT * FROM marketplace_find_offers WHERE id=${req.params.offerId}
      AND request_id=${req.params.id} AND status='pending' FOR UPDATE`)).rows[0] as any;
    if(!offer)return "missing";
    const quote=await findQuote({...offer,region:row.region,category:row.category});
    if(quote.total_minor>Number(row.budget_minor))return "budget";
    await tx.execute(sql`UPDATE marketplace_find_requests SET status='accepted',selected_offer_id=${offer.id},
      updated_at=NOW() WHERE id=${row.id}`);
    await tx.execute(sql`UPDATE marketplace_find_offers SET status=CASE WHEN id=${offer.id} THEN 'selected'
      ELSE 'declined' END,updated_at=NOW() WHERE request_id=${row.id} AND status='pending'`);
    return "ok";
  });
  if(r!=="ok"){res.status(r==="forbidden"?403:409).json({error:({
    forbidden:"This is not your request.",closed:"Request already accepted, closed or expired.",
    missing:"Offer is no longer available.",budget:"Fees or exchange rates changed and this offer exceeds your budget."
  } as Record<string,string>)[r]});return;}
  res.json({ok:true,selectedOfferId:req.params.offerId,checkoutReady:true});
 }catch(e){sendError(res,e);}
});
router.patch("/find-it/:id",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.id)||!["open","closed"].includes(req.body?.status)){res.status(400).json({error:"Invalid request update"});return;}
  await ensureFindItTables();
  const status=req.body.status as string;
  const row=await db.transaction(async tx=>{
    const current=(await tx.execute(sql`SELECT * FROM marketplace_find_requests WHERE id=${req.params.id} FOR UPDATE`)).rows[0] as any;
    if(!current||String(current.buyer_email).toLowerCase()!==email||current.status==="purchased"||current.status==="paused")return null;
    if(current.status==="accepted"&&await liveCheckout(current.selected_offer_id))return null;
    if(status==="open"&&new Date(current.expires_at).getTime()<=Date.now())return null;
    await tx.execute(sql`UPDATE marketplace_find_requests SET status=${status},
      selected_offer_id=NULL,updated_at=NOW() WHERE id=${req.params.id}`);
    if(status==="open")await tx.execute(sql`UPDATE marketplace_find_offers SET status='pending',updated_at=NOW() WHERE request_id=${req.params.id} AND status IN ('selected','declined')`);
    await tx.execute(sql`UPDATE classified_ads SET status=${status==="open"?"active":"closed"} WHERE id=${current.classified_id}`);
    return current.id;
  });
  if(!row){res.status(409).json({error:"Request cannot be changed"});return;}
  res.json({ok:true});
 }catch(e){sendError(res,e);}
});
// A seller can improve a pending bid without posting multiple offers or changing an accepted price.
router.patch("/find-it/offers/:offerId",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.offerId)){res.status(400).json({error:"Invalid offer"});return;}
  const price=amountMinor(req.body?.price);
  if(!price){res.status(400).json({error:"Enter a valid revised item price"});return;}
  await ensureFindItTables();
  const outcome=await db.transaction(async tx=>{
    const o=(await tx.execute(sql`SELECT o.*,r.region,r.budget_minor,r.status AS request_status,r.expires_at,a.category
      FROM marketplace_find_offers o JOIN marketplace_find_requests r ON r.id=o.request_id
      JOIN classified_ads a ON a.id=r.classified_id WHERE o.id=${req.params.offerId} FOR UPDATE OF o`)).rows[0] as any;
    if(!o||String(o.seller_email).toLowerCase()!==email)return "forbidden";
    if(o.status!=="pending"||o.request_status!=="open"||new Date(o.expires_at).getTime()<=Date.now())return "closed";
    const quote=await findQuote({price_minor:price,seller_email:email,region:o.region,category:o.category});
    if(quote.total_minor>Number(o.budget_minor))return "budget";
    await tx.execute(sql`UPDATE marketplace_find_offers SET price_minor=${price},updated_at=NOW()
      WHERE id=${req.params.offerId} AND status='pending'`);
    return "ok";
  });
  if(outcome!=="ok"){res.status(outcome==="forbidden"?403:409).json({error:({
    forbidden:"This is not your offer",closed:"Only open pending bids may be improved",
    budget:"The revised bid would exceed the buyer's total budget"
  } as Record<string,string>)[outcome]});return;}
  res.json({ok:true});
 }catch(e){sendError(res,e);}
});
router.post("/find-it/offers/:offerId/withdraw",async(req,res)=>{
 try{
  const email=await authenticatedSellerEmail(req,res);if(!email)return;
  if(!validId(req.params.offerId)){res.status(400).json({error:"Invalid offer"});return;}
  await ensureFindItTables();
  const rows=await db.execute(sql`UPDATE marketplace_find_offers SET status='withdrawn',updated_at=NOW()
    WHERE id=${req.params.offerId} AND LOWER(seller_email)=${email} AND status='pending' RETURNING id`);
  if(!rows.rows.length){res.status(409).json({error:"Only pending offers can be withdrawn"});return;}
  res.json({ok:true});
 }catch(e){sendError(res,e);}
});
router.get("/admin/find-it",requireAdmin,async(_req,res)=>{
 try{
  await ensureFindItTables();
  const [summary,rows,regions]=await Promise.all([
    db.execute(sql`SELECT status,COUNT(*)::int n FROM marketplace_find_requests GROUP BY status`),
    db.execute(sql`SELECT r.id,r.region,r.status,r.budget_minor,r.created_at,r.expires_at,
      a.title,a.location,r.buyer_email,(SELECT COUNT(*)::int FROM marketplace_find_offers o WHERE o.request_id=r.id) offer_count
      FROM marketplace_find_requests r JOIN classified_ads a ON a.id=r.classified_id
      ORDER BY r.created_at DESC LIMIT 150`),
    db.execute(sql`SELECT region,COUNT(*)::int n FROM marketplace_find_requests GROUP BY region`)
  ]);
  res.setHeader("Cache-Control","private,no-store");res.json({summary:summary.rows,requests:rows.rows,regions:regions.rows});
 }catch(e){sendError(res,e);}
});
router.patch("/admin/find-it/:id",requireAdmin,async(req,res)=>{
 try{
  if(!validId(req.params.id)||!["paused","closed","open"].includes(req.body?.status)){
    res.status(400).json({error:"Invalid moderation action"});return;
  }
  await ensureFindItTables();
  const status=String(req.body.status);
  const changed=await db.transaction(async tx=>{
    const r=(await tx.execute(sql`SELECT id,status,selected_offer_id,classified_id,expires_at FROM marketplace_find_requests
       WHERE id=${req.params.id} FOR UPDATE`)).rows[0] as any;
    if(!r||r.status==="purchased"||(status==="open"&&new Date(r.expires_at).getTime()<=Date.now()))return false;
    if(r.status==="accepted"&&await liveCheckout(r.selected_offer_id))return false;
    await tx.execute(sql`UPDATE marketplace_find_requests SET status=${status},
      selected_offer_id=CASE WHEN ${status}='open' THEN NULL ELSE selected_offer_id END,updated_at=NOW() WHERE id=${r.id}`);
    if(status==="open")await tx.execute(sql`UPDATE marketplace_find_offers SET status='pending',updated_at=NOW()
      WHERE request_id=${r.id} AND status IN ('selected','declined')`);
    await tx.execute(sql`UPDATE classified_ads SET status=${status==="open"?"active":"closed"} WHERE id=${r.classified_id}`);
    await tx.execute(sql`INSERT INTO marketplace_find_audit(request_id,actor,action)
      VALUES(${r.id},${String((req as any).admin?.email||"admin")},${"moderate:"+status})`);
    return true;
  });
  if(!changed){res.status(409).json({error:"Request cannot be moderated"});return;}
  res.json({ok:true});
 }catch(e){sendError(res,e);}
});
export default router;
