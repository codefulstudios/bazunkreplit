import {Router} from 'express';
import {getAuth,clerkClient} from '@clerk/express';
import {db} from '@workspace/db';
import {sql} from 'drizzle-orm';
import {createHash} from 'node:crypto';
import {getUncachableStripeClient} from '../stripeClient.js';
import {quoteCart,saveFeeSnapshot,getFeeSnapshot,QuoteError} from '../lib/checkoutQuote.js';
import {fulfillCartSession} from '../lib/fulfillment.js';
import {isBanned} from '../lib/banned.js';
import {logger} from '../lib/logger.js';
const router=Router();
router.get('/mobile/checkout-return',(_req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
 res.type('html').send('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to Bazunk</title><body style="font-family:system-ui;padding:32px;max-width:520px;margin:auto"><h1>Return to Bazunk</h1><p>Open the app to check your payment status. Your cart stays saved until payment and orders are confirmed.</p><p><a href="bazunk://cart">Open Bazunk</a></p><p>If the link does not open the app, switch back to Bazunk and select Check payment status.</p></body></html>');
});
let schema:Promise<void>|undefined;
function ensureSchema(){return schema??=(async()=>{await db.execute(sql`CREATE TABLE IF NOT EXISTS mobile_checkout_attempts (
 owner_id TEXT NOT NULL, attempt TEXT NOT NULL, email TEXT NOT NULL, params JSONB,
 session_id TEXT, cancelled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(owner_id,attempt))`);})().catch(e=>{schema=undefined;throw e});}
router.use('/mobile/checkout',async(req,res,next)=>{try{const auth=getAuth(req);if(!auth.isAuthenticated||!auth.userId){res.status(401).json({error:'Please sign in.'});return;}const user=await clerkClient.users.getUser(auth.userId);const primary=user.primaryEmailAddress;if(!primary||primary.verification?.status!=='verified'){res.status(403).json({error:'Verify your account email before checkout.'});return;}const email=primary.emailAddress.trim().toLowerCase();if(await isBanned(email)){res.status(403).json({error:'This account is suspended.'});return;}res.locals.checkoutIdentity={id:auth.userId,email};res.setHeader('Cache-Control','no-store');await ensureSchema();next();}catch(e){logger.error({err:e},'Mobile checkout identity failed');res.status(503).json({error:'Checkout is temporarily unavailable.'});}});
function attemptId(raw:unknown){if(typeof raw!=='string'||!/^app_[A-Za-z0-9_-]{8,100}$/.test(raw))throw new QuoteError('Invalid checkout reference.');return raw;}
function failure(res:any,e:unknown){logger.error({err:e},'Mobile checkout failed');res.status(e instanceof QuoteError?e.status:503).json({error:e instanceof QuoteError?e.message:'Could not verify checkout. Keep your cart and check payment status before paying again.'});}
async function ownedSession(row:any,owner:string){const stripe=await getUncachableStripeClient();const session=await stripe.checkout.sessions.retrieve(row.session_id);if(session.metadata?.mobileOwner!==owner||session.metadata?.type!=='cart'||session.client_reference_id!==row.email)throw new QuoteError('Checkout not found.',404);return session;}
async function status(row:any,owner:string){
 if(row.cancelled)return {status:'expired'};
 if(!row.session_id)return {status:'unpaid'};
 const session=await ownedSession(row,owner);
 if(session.payment_status==='paid'){
  await fulfillCartSession(session.id,row.email);
  // The existing fulfiller's concurrent claim is not evidence that every order exists.
  const snapshot=await getFeeSnapshot(session.metadata!.feeQuoteId!);
  const count=(await db.execute(sql`SELECT COUNT(*)::int AS count FROM orders WHERE stripe_session_id=${session.id}`)).rows[0] as any;
  if(Number(count?.count)!==snapshot.units.length)return {status:'processing'};
  const shipping=session.collected_information?.shipping_details;
  if(!shipping?.address)throw new Error('Paid mobile checkout has no shipping address');
  const a=shipping.address;const address=[shipping.name,a.line1,a.line2,a.city,a.state,a.postal_code,a.country].filter(Boolean).join('\n');
  await db.execute(sql`UPDATE orders SET address=${address},updated_at=NOW() WHERE stripe_session_id=${session.id}`);
  return {status:'paid',orders:snapshot.units.length};
 }
 return {status:session.status==='expired'?'expired':'unpaid',url:session.status==='open'?session.url:undefined};
}
router.post('/mobile/checkout',async(req,res)=>{try{
 const {id:owner,email}=res.locals.checkoutIdentity;const attempt=attemptId(req.body?.attempt);
 const stripe=await getUncachableStripeClient();
 const row=await db.transaction(async tx=>{
  // Serialize concurrent starts/cancellations for this account and attempt.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${owner+':'+attempt},0))`);
  const existing=(await tx.execute(sql`SELECT * FROM mobile_checkout_attempts WHERE owner_id=${owner} AND attempt=${attempt}`)).rows[0] as any;
  if(existing)return existing;
  if(req.body.delivery!=='standard')throw new QuoteError('Select standard delivery.');
  const quote=await quoteCart(req.body.items);
  if(!Number.isFinite(req.body.expectedTotal)||Math.round(req.body.expectedTotal*100)!==quote.totalMinor)throw new QuoteError('Prices or fees changed. Cancel this unpaid checkout and refresh the total.',409);
  if(quote.units.some(u=>u.sellerEmail.toLowerCase()===email))throw new QuoteError('You cannot purchase your own listing.');
  const counts=new Map<number,number>();quote.units.forEach(u=>counts.set(u.id,(counts.get(u.id)||0)+1));
  for(const [listingId,quantity] of counts){
   const inventory=(await tx.execute(sql`SELECT quantity,specifications FROM listings WHERE id=${listingId}`)).rows[0] as any;
   if(!inventory||(inventory.quantity!=null&&Number(inventory.quantity)<quantity))throw new QuoteError('Requested quantity is no longer available. Cancel checkout and update your cart.',409);
   let metadata:any={};try{metadata=typeof inventory.specifications==='string'?JSON.parse(inventory.specifications||'{}'):inventory.specifications||{}}catch{throw new QuoteError('Listing options need to be checked before payment.',409)}
   if(Array.isArray(metadata.variants)&&metadata.variants.length)throw new QuoteError('Choose listing variations on the website before buying.',409);
  }
  const snapshot=await saveFeeSnapshot(quote);
  const grouped=new Map<string,{title:string;amount:number;quantity:number}>();
  for(const unit of quote.units){const key=unit.id+':'+unit.priceMinor;const item=grouped.get(key);if(item)item.quantity++;else grouped.set(key,{title:unit.title,amount:unit.priceMinor,quantity:1});}
  const lineItems=[...grouped.values()].map(i=>({price_data:{currency:'gbp',unit_amount:i.amount,product_data:{name:i.title}},quantity:i.quantity}));
  if(quote.buyerProtectionMinor)lineItems.push({price_data:{currency:'gbp',unit_amount:quote.buyerProtectionMinor,product_data:{name:'Buyer Protection'}},quantity:1});
  if(quote.deliveryMinor)lineItems.push({price_data:{currency:'gbp',unit_amount:quote.deliveryMinor,product_data:{name:'Standard delivery'}},quantity:1});
  const params={mode:'payment',customer_email:email,client_reference_id:email,line_items:lineItems,payment_method_types:['card'],shipping_address_collection:{allowed_countries:['GB','US']},metadata:{type:'cart',email,mobileOwner:owner,feeQuoteId:snapshot,feePolicy:quote.policy,chargeCurrency:'GBP',creditsApplied:'0'},success_url:'https://bazunk-api.onrender.com/api/mobile/checkout-return',cancel_url:'https://bazunk-api.onrender.com/api/mobile/checkout-return',expires_at:Math.floor(Date.now()/1000)+86400};
  return (await tx.execute(sql`INSERT INTO mobile_checkout_attempts(owner_id,attempt,email,params) VALUES(${owner},${attempt},${email},${JSON.stringify(params)}::jsonb) RETURNING *`)).rows[0] as any;
 });
 if(row.cancelled||row.session_id){res.json(await status(row,owner));return;}
 // Frozen parameters + stable Stripe key make a lost response safe to retry.
 if(Date.now()-new Date(row.created_at).getTime()>23*60*60*1000)throw new QuoteError('Checkout recovery window elapsed. Contact support to reconcile this attempt before retrying payment.',409);
 const session=await stripe.checkout.sessions.create(row.params,{idempotencyKey:'mobile-'+createHash('sha256').update(owner+':'+attempt).digest('hex')});
 await db.execute(sql`UPDATE mobile_checkout_attempts SET session_id=${session.id} WHERE owner_id=${owner} AND attempt=${attempt}`);
 // A cancellation racing creation must expire the newly-created session too.
 const latest=(await db.execute(sql`SELECT * FROM mobile_checkout_attempts WHERE owner_id=${owner} AND attempt=${attempt}`)).rows[0] as any;
 if(latest.cancelled&&session.status==='open')await stripe.checkout.sessions.expire(session.id);
 res.json(await status(latest,owner));
 }catch(e){failure(res,e)}});
router.get('/mobile/checkout/:attempt',async(req,res)=>{try{const owner=res.locals.checkoutIdentity.id;const attempt=attemptId(req.params.attempt);const row=(await db.execute(sql`SELECT * FROM mobile_checkout_attempts WHERE owner_id=${owner} AND attempt=${attempt}`)).rows[0] as any;res.json(row?await status(row,owner):{status:'unpaid'});}catch(e){failure(res,e)}});
router.post('/mobile/checkout/:attempt/cancel',async(req,res)=>{try{
 const {id:owner,email}=res.locals.checkoutIdentity;const attempt=attemptId(req.params.attempt);
 const result=await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${owner+':'+attempt},0))`);
  const row=(await tx.execute(sql`SELECT * FROM mobile_checkout_attempts WHERE owner_id=${owner} AND attempt=${attempt} FOR UPDATE`)).rows[0] as any;
  if(row?.session_id){const session=await ownedSession(row,owner);if(session.status==='complete'||session.payment_status==='paid')throw new QuoteError('Payment may have completed. Check payment status.',409);if(session.status==='open')await (await getUncachableStripeClient()).checkout.sessions.expire(session.id);}
  else if(row?.params)throw new QuoteError('Checkout creation is awaiting confirmation. Resume checkout to recover the session, then cancel.',409);
  await tx.execute(sql`INSERT INTO mobile_checkout_attempts(owner_id,attempt,email,cancelled) VALUES(${owner},${attempt},${email},TRUE) ON CONFLICT(owner_id,attempt) DO UPDATE SET cancelled=TRUE`);
  return {status:'expired'};
 });res.json(result);
 }catch(e){failure(res,e)}});
export default router;
