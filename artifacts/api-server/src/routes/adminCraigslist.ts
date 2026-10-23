import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { rapidApiErrorMessage } from "../lib/rapidapi.js";

const router = Router();
const LIMIT = 100;
// Set these from the exact RapidAPI endpoint's Code Snippets tab.
const host = process.env.CRAIGSLIST_RAPIDAPI_HOST || "";
const endpoint = process.env.CRAIGSLIST_RAPIDAPI_SEARCH_URL || "";

async function ensureLedger() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS craigslist_api_usage (
    id BIGSERIAL PRIMARY KEY, used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status INTEGER NOT NULL DEFAULT 0
  )`);
}
async function usage() {
  await ensureLedger();
  const r = await db.execute(sql`SELECT COUNT(*)::int AS n FROM craigslist_api_usage
    WHERE used_at >= date_trunc('month', NOW())`);
  return Number(r.rows[0]?.n || 0);
}
router.get("/admin/craigslist/status",requireAdmin, async (_req,res)=>{
 try { const used=await usage(); res.setHeader("Cache-Control","no-store");
   res.json({used,remaining:Math.max(0,LIMIT-used),limit:LIMIT,configured:Boolean(host&&endpoint&&process.env.RAPIDAPI_KEY)});
 } catch {res.status(503).json({error:"Craigslist usage ledger unavailable"});}
});
router.get("/admin/craigslist/search",requireAdmin,async(req,res)=>{
 const q=String(req.query.q||"").trim();
 const city=String(req.query.city||"").trim();
 if(!q||q.length>120||city.length>80){res.status(400).json({error:"Enter a keyword (up to 120 characters) and optional city."});return;}
 if(!host||!endpoint||!process.env.RAPIDAPI_KEY){res.status(503).json({error:"Configure CRAIGSLIST_RAPIDAPI_HOST and CRAIGSLIST_RAPIDAPI_SEARCH_URL and subscribe using the server RapidAPI key."});return;}
 let url:URL;
 try {
   url=new URL(endpoint);
   if(url.protocol!=="https:"||url.hostname!==host||!host.endsWith(".p.rapidapi.com"))throw Error("Unsafe endpoint");
 } catch {res.status(503).json({error:"Craigslist RapidAPI endpoint configuration is invalid."});return;}
 let id=0;
 try {
   await ensureLedger();
   await db.transaction(async tx=>{
     await tx.execute(sql`SELECT pg_advisory_xact_lock(62890113)`);
     const r=await tx.execute(sql`SELECT COUNT(*)::int n FROM craigslist_api_usage WHERE used_at>=date_trunc('month',NOW())`);
     if(Number(r.rows[0]?.n||0)>=LIMIT)throw Error("Craigslist monthly 100-request limit reached.");
     const created=await tx.execute(sql`INSERT INTO craigslist_api_usage DEFAULT VALUES RETURNING id`);
     id=Number(created.rows[0].id);
   });
 } catch(e){res.status(429).json({error:e instanceof Error?e.message:"Usage reservation failed"});return;}
 try {
   url.searchParams.set("q",q);
   if(city)url.searchParams.set("city",city);
   const response=await fetch(url,{headers:{"X-RapidAPI-Key":process.env.RAPIDAPI_KEY!,"X-RapidAPI-Host":host},signal:AbortSignal.timeout(15000)});
   await db.execute(sql`UPDATE craigslist_api_usage SET status=${response.status} WHERE id=${id}`);
   if(!response.ok){res.status(502).json({error:rapidApiErrorMessage("Craigslist",response.status)});return;}
   const data=await response.json();
   res.setHeader("Cache-Control","no-store");
   res.json({data,used:await usage(),limit:LIMIT});
 }catch(e){res.status(502).json({error:e instanceof Error?e.message:"Craigslist provider request failed"});}
});
export default router;
