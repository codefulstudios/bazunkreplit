import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { ensureSavedSearchTables, normaliseSearchFilters, savedSearchPredicate, refreshSavedSearchMatches, type SearchFilters } from "../lib/savedSearches.js";

const router=Router();
const errorMessage=(err:unknown)=>err instanceof Error?err.message:"Saved search unavailable";

async function listSearches(email:string) {
  const rows=(await db.execute(sql`
    SELECT s.id,s.name,s.filters,s.alert_enabled,s.created_at,s.last_checked_at,
      (SELECT COUNT(*)::int FROM marketplace_saved_search_matches m WHERE m.search_id=s.id) AS new_matches
    FROM marketplace_saved_searches s WHERE LOWER(s.user_email)=${email}
    ORDER BY s.created_at DESC LIMIT 25
  `)).rows as any[];
  const result=[];
  for(const row of rows) {
    const filters=normaliseSearchFilters(row.filters);
    const count=(await db.execute(sql`SELECT COUNT(*)::int AS total FROM listings l
      WHERE ${savedSearchPredicate(filters)}`)).rows[0] as any;
    result.push({id:row.id,name:row.name,filters,alertEnabled:row.alert_enabled,
      createdAt:row.created_at,lastCheckedAt:row.last_checked_at,
      matchCount:Number(count?.total??0),newMatches:Number(row.new_matches||0)});
  }
  return result;
}

router.get("/saved-searches", async(req,res)=>{
  try {
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    await refreshSavedSearchMatches(email);
    res.setHeader("Cache-Control","no-store");
    res.json(await listSearches(email));
  }catch(err){console.error("Saved search list failed",err);res.status(500).json({error:"Could not load saved searches"});}
});
router.post("/saved-searches",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    const filters=normaliseSearchFilters(req.body?.filters);
    const name=String(req.body?.name||filters.q||"My saved search").trim().slice(0,80);
    if(!name){res.status(400).json({error:"Name this search"});return;}
    const enabled=req.body?.alertEnabled!==false;
    await ensureSavedSearchTables();
    const limit=(await db.execute(sql`SELECT COUNT(*)::int AS n FROM marketplace_saved_searches WHERE LOWER(user_email)=${email}`)).rows[0] as any;
    if(Number(limit.n)>=25){res.status(409).json({error:"Maximum 25 saved searches. Remove an old one first."});return;}
    const id=randomUUID();
    await db.execute(sql`INSERT INTO marketplace_saved_searches(id,user_email,name,filters,alert_enabled)
      VALUES(${id},${email},${name},${JSON.stringify(filters)}::jsonb,${enabled})`);
    res.status(201).json({id,name,filters,alertEnabled:enabled});
  }catch(err){const msg=errorMessage(err);res.status(msg.includes("Invalid")||msg.includes("Select")||msg.includes("price")?400:500).json({error:msg});}
});
router.patch("/saved-searches/:id",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    await ensureSavedSearchTables();
    const prev=(await db.execute(sql`SELECT * FROM marketplace_saved_searches WHERE id=${req.params.id} AND LOWER(user_email)=${email}`)).rows[0] as any;
    if(!prev){res.status(404).json({error:"Saved search not found"});return;}
    const name=req.body?.name===undefined?prev.name:String(req.body.name).trim().slice(0,80);
    const filters=req.body?.filters===undefined?normaliseSearchFilters(prev.filters):normaliseSearchFilters(req.body.filters);
    if(!name){res.status(400).json({error:"Search name required"});return;}
    const enabled=typeof req.body?.alertEnabled==="boolean"?req.body.alertEnabled:Boolean(prev.alert_enabled);
    const restarted=(!prev.alert_enabled&&enabled)||req.body?.filters!==undefined;
    await db.execute(sql`UPDATE marketplace_saved_searches SET
      name=${name},filters=${JSON.stringify(filters)}::jsonb, alert_enabled=${enabled},
      alert_since=CASE WHEN ${restarted} THEN NOW() ELSE alert_since END,
      last_checked_at=CASE WHEN ${restarted} THEN NULL ELSE last_checked_at END,
      updated_at=NOW()
      WHERE id=${req.params.id} AND LOWER(user_email)=${email}`);
    if(restarted)await db.execute(sql`DELETE FROM marketplace_saved_search_matches WHERE search_id=${req.params.id}`);
    res.json({ok:true,id:req.params.id,name,filters,alertEnabled:enabled});
  }catch(err){const msg=errorMessage(err);res.status(msg.includes("Invalid")||msg.includes("Select")||msg.includes("price")?400:500).json({error:msg});}
});
router.delete("/saved-searches/:id",async(req,res)=>{
  try{
    const email=await authenticatedSellerEmail(req,res);if(!email)return;
    await ensureSavedSearchTables();
    const rows=await db.execute(sql`DELETE FROM marketplace_saved_searches
      WHERE id=${req.params.id} AND LOWER(user_email)=${email} RETURNING id`);
    if(!rows.rows.length){res.status(404).json({error:"Saved search not found"});return;}
    res.json({ok:true});
  }catch(err){console.error("Saved search deletion failed",err);res.status(500).json({error:"Could not delete saved search"});}
});
export default router;
