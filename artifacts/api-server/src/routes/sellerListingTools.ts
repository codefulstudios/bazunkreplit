import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { isBanned } from "../lib/banned.js";
import { toGbp } from "../fxRates.js";

const router=Router();
type Action="pause"|"resume"|"renew"|"duplicate"|"relist"|"edit";
const validActions:Action[]=["pause","resume","renew","duplicate","relist","edit"];
const conditionValues=["brand-new","like-new","new","like new","good","fair","poor"];
type Source={id:number;title:string;price:string;currency:string;status:string;specifications:string|null;condition:string;category:string};
function validPrice(v:unknown):number|null {
  const n=Number(v);
  return typeof v==="number" || typeof v==="string" && v.trim()!=="" ? (Number.isFinite(n)&&n>=0.01&&n<=1000000?Math.round(n*100)/100:null) : null;
}
function regionValid(spec:string|null):boolean {
  try { return ["uk","us"].includes(String(JSON.parse(spec||"{}")?.marketplace_region)); }
  catch {return false;}
}
async function applyAction(id:number,email:string,action:Action,edit:Record<string,unknown>) {
  const existing=(await db.execute(sql`SELECT id,title,price,currency,status,specifications,condition,category
      FROM listings WHERE id=${id} AND LOWER(seller_email)=${email} LIMIT 1`)).rows[0] as Source|undefined;
  if(!existing)throw Error("Listing not found or not yours");
  if(action==="pause") {
    if(existing.status!=="active")throw Error("Only active listings can be paused");
    const rows=await db.execute(sql`UPDATE listings SET status='suspended',updated_at=NOW()
       WHERE id=${id} AND LOWER(seller_email)=${email} AND status='active' RETURNING id,status`);
    if(!rows.rows.length)throw Error("Listing changed during update");
    return rows.rows[0];
  }
  if(action==="resume"){
    if(!["suspended","inactive","draft"].includes(existing.status))throw Error("Only paused, inactive or draft listings can be published");
    if(!regionValid(existing.specifications)||!existing.title?.trim()||Number(existing.price)<=0)throw Error("Complete the title, price and UK/USA region before publishing");
    const rows=await db.execute(sql`UPDATE listings SET status='active',updated_at=NOW()
      WHERE id=${id} AND LOWER(seller_email)=${email} AND status=${existing.status} RETURNING id,status`);
    if(!rows.rows.length)throw Error("Listing changed during update");
    return rows.rows[0];
  }
  if(action==="renew"){
    if(existing.status!=="active")throw Error("Only active listings can be renewed");
    // Renew bumps the discovery date; retaining the original date in the spec prevents losing provenance.
    const rows=await db.execute(sql`UPDATE listings SET
      specifications=CASE WHEN COALESCE(specifications,'') ~ '^\\s*\\{'
        THEN jsonb_set(specifications::jsonb,'{original_created_at}',
          COALESCE(specifications::jsonb->'original_created_at',to_jsonb(created_at)))::text
        ELSE specifications END,
      created_at=NOW(),updated_at=NOW()
      WHERE id=${id} AND LOWER(seller_email)=${email} AND status='active' RETURNING id,status,created_at`);
    if(!rows.rows.length)throw Error("Listing changed during update");
    return rows.rows[0];
  }
  if(action==="edit"){
    if(existing.status==="sold")throw Error("Sold listings cannot be bulk edited; relist instead");
    const condition=edit.condition;
    const adjustment=edit.priceAdjustment;
    const absolute=edit.price;
    if(condition===undefined && adjustment===undefined && absolute===undefined)throw Error("Choose a price or condition change");
    if(condition!==undefined && (typeof condition!=="string" || !conditionValues.includes(condition)))throw Error("Invalid condition");
    if(adjustment!==undefined && (typeof adjustment!=="number"||!Number.isFinite(adjustment)||adjustment < -90 || adjustment > 500))throw Error("Price adjustment must be between -90% and +500%");
    const price=absolute!==undefined ? validPrice(absolute) :
      adjustment!==undefined ? validPrice(Math.round(Number(existing.price)*(1+Number(adjustment)/100)*100)/100) : Number(existing.price);
    if(price===null)throw Error("Invalid resulting price");
    let gbp:string|null=null;
    if(adjustment!==undefined||absolute!==undefined)gbp=(await toGbp(price,existing.currency||"GBP")).toFixed(2);
    const rows=await db.execute(sql`UPDATE listings SET
      price=CASE WHEN ${adjustment!==undefined||absolute!==undefined} THEN ${price}::numeric ELSE price END,
      price_gbp=CASE WHEN ${adjustment!==undefined||absolute!==undefined} THEN ${gbp}::numeric ELSE price_gbp END,
      condition=COALESCE(${condition===undefined?null:condition}::text,condition),updated_at=NOW()
      WHERE id=${id} AND LOWER(seller_email)=${email} AND status=${existing.status}
      RETURNING id,title,price,status,condition`);
    if(!rows.rows.length)throw Error("Listing changed during update");
    return rows.rows[0];
  }
  if(action==="relist" && !["sold","inactive","suspended"].includes(existing.status))throw Error("Only sold, inactive or paused listings can be relisted");
  if(action==="relist" && (!regionValid(existing.specifications)||!existing.title?.trim()||Number(existing.price)<=0))throw Error("Listing needs a valid region, title and price before relisting");
  // Clone into a fresh listing ID; never copy watchers, promotions, sales, or the original public ID.
  const status=action==="duplicate"?"draft":"active";
  return await db.transaction(async tx => {
    const copied=await tx.execute(sql`
      INSERT INTO listings (title,price,category,subcategory,subsubcategory,description,condition,image,
        seller_email,seller_name,seller_username,currency,price_gbp,tags,extra_categories,specifications,
        ship_origin,ship_origin_other,ship_zone,carrier,shipping_price,handling_charge,quantity,sku,status)
      SELECT title,price,category,subcategory,subsubcategory,description,condition,image,
        seller_email,seller_name,seller_username,currency,price_gbp,tags,extra_categories,specifications,
        ship_origin,ship_origin_other,ship_zone,carrier,shipping_price,handling_charge,quantity,sku,${status}
      FROM listings WHERE id=${id} AND LOWER(seller_email)=${email}
      RETURNING id`);
    const newId=Number((copied.rows[0] as any)?.id);
    if(!Number.isSafeInteger(newId))throw Error("Could not duplicate listing");
    const result=await tx.execute(sql`UPDATE listings SET public_id=${"BZL-"+newId}
      WHERE id=${newId} AND LOWER(seller_email)=${email}
      RETURNING id,public_id,title,price,status`);
    if(!result.rows.length)throw Error("Could not finish the duplicated listing");
    return result.rows[0];
  });
}

router.post("/listings/seller-tools",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    if(await isBanned(email)){res.status(403).json({error:"Seller account suspended"});return;}
    const {action,ids,edit}=req.body??{};
    if(!validActions.includes(action)){res.status(400).json({error:"Invalid seller action"});return;}
    if(!Array.isArray(ids)||ids.length===0||ids.length>50||ids.some((v:unknown)=>!Number.isSafeInteger(v)||Number(v)<=0)||new Set(ids).size!==ids.length){
      res.status(400).json({error:"Select 1 to 50 unique listing IDs"});return;
    }
    if(edit!==undefined && (typeof edit!=="object"||edit===null||Array.isArray(edit))) {res.status(400).json({error:"Invalid edit data"});return;}
    const updated:unknown[]=[];const failures:{id:number;error:string}[]=[];
    for(const id of ids as number[]){
      try{updated.push(await applyAction(id,email,action,edit??{}));}
      catch(e){failures.push({id,error:e instanceof Error?e.message:"Unknown update error"});}
    }
    res.setHeader("Cache-Control","no-store");
    res.status(updated.length?200:409).json({action,updated,failures});
  }catch(e){console.error("Seller listing tools failed",e);res.status(500).json({error:"Could not complete listing action"});}
});
export default router;
