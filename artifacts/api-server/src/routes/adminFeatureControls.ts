import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { FEATURE_DEFINITIONS } from "../lib/featureFlags.js";
const router=Router();
const ENV=process.env.RENDER_SERVICE_ID==="srv-db732i2d0e5s73asr0kg" ? "staging":
 process.env.RENDER_SERVICE_ID==="srv-davd6f3bc2fs73ce9ohg" ? "production" :
 process.env.RENDER_SERVICE_ID==="srv-dal8qm6k1f9s73e37f2g" ? "legacy" :
 process.env.BAZUNK_DEPLOYMENT_ENV==="staging" ? "staging":
 process.env.BAZUNK_DEPLOYMENT_ENV==="production" ? "production":"unknown";
async function ensureHistory(){
 await db.execute(sql`CREATE TABLE IF NOT EXISTS feature_toggle_changes(
  id BIGSERIAL PRIMARY KEY,feature_key TEXT NOT NULL,environment TEXT NOT NULL,
  previous_enabled BOOLEAN NOT NULL,new_enabled BOOLEAN NOT NULL,
  reason TEXT NOT NULL,source_change_id BIGINT,actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db.execute(sql`CREATE INDEX IF NOT EXISTS feature_toggle_history_idx
 ON feature_toggle_changes(environment,created_at DESC,id DESC)`);
}
function definition(key:string){return FEATURE_DEFINITIONS.find(x=>x[0]===key);}
function context(req:any){return String(req.admin?.email||req.user?.email||"Authenticated Bazunk admin").slice(0,300);}
router.get("/admin/feature-flags",async (_req,res)=>{
 try{
  const rows=await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'feature_%'`);
  const values=Object.fromEntries((rows.rows as any[]).map(r=>[String(r.key).replace(/^feature_/,""),String(r.value)]));
  res.setHeader("Cache-Control","private,no-store");
  res.json(FEATURE_DEFINITIONS.map(([key,label,group])=>({key,label,group,enabled:values[key]!=="false"})));
 }catch(e){res.status(503).json({error:"Feature toggles unavailable"});}
});
router.get("/admin/feature-toggles/meta",async (_req,res)=>{
 try{
  await ensureHistory();
  res.setHeader("Cache-Control","private,no-store");
  res.json({environment:ENV,serviceId:process.env.RENDER_SERVICE_ID||null,
   environmentsIndependent:true,readOnly:ENV==="legacy"||ENV==="unknown",
   warning:ENV==="legacy"?"Legacy service is read-only. Use the active production API for toggles.":
    ENV==="unknown"?"Unrecognised service environment: changes are disabled.":
    "Changes apply only to this service's database. Staging and production must be changed separately."});
 }catch{res.status(503).json({error:"Cannot verify toggle history database"});}
});
router.get("/admin/feature-toggles/history",async(req,res)=>{
 try{
  await ensureHistory();
  const key=String(req.query.key||"").trim();
  if(key && !definition(key)){res.status(400).json({error:"Unknown feature key"});return;}
  const [result,legacy]=await Promise.all([
   db.execute(sql`SELECT id,feature_key,environment,previous_enabled,new_enabled,reason,
    source_change_id,actor,created_at FROM feature_toggle_changes
    WHERE environment=${ENV} AND (${key}='' OR feature_key=${key})
    ORDER BY id DESC LIMIT 100`),
   db.execute(sql`SELECT id,target_id,actor,summary,before_data,after_data,created_at
    FROM admin_audit_log WHERE action='feature_flag.change' AND target_type='feature'
    AND (${key}='' OR target_id=${key}) ORDER BY id DESC LIMIT 100`)
  ]);
  const historic=(legacy.rows as any[]).filter(r=>definition(String(r.target_id)))
    .map(r=>({id:-Number(r.id),feature_key:String(r.target_id),environment:"historical",
     previous_enabled:r.before_data?.enabled===true,new_enabled:r.after_data?.enabled===true,
     reason:String(r.summary||"Previously recorded toggle change"),source_change_id:null,
     actor:String(r.actor||"Admin"),created_at:r.created_at,legacy:true}));
  const changes=[...result.rows,...historic].sort((a:any,b:any)=>
    new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,100);
  res.setHeader("Cache-Control","private,no-store");
  res.json({environment:ENV,changes,limit:100,legacyReadOnly:true});
 }catch{res.status(503).json({error:"Feature history is currently unavailable"});}
});
async function change(req:any,res:any,isRollback:boolean){
 const key=String(req.params.key||"");
 if(!definition(key)){res.status(404).json({error:"Unknown feature"});return;}
 const body=req.body||{};
 if(ENV==="legacy"||ENV==="unknown"){res.status(403).json({error:"Feature changes are disabled for an unverified or legacy service"});return;}
 if(body.environment!==ENV){res.status(409).json({error:`Environment mismatch: connected to ${ENV}. Refresh the page before changing a toggle.`});return;}
 if(typeof body.expectedEnabled!=="boolean"){res.status(400).json({error:"Expected current state is required to prevent stale updates"});return;}
 const reason=String(body.reason||"").trim();
 if(reason.length<8||reason.length>500){res.status(400).json({error:"Explain the change in 8–500 characters"});return;}
 if(!isRollback && typeof body.enabled!=="boolean"){res.status(400).json({error:"Boolean enabled value required"});return;}
 const sourceId=Number(body.changeId);
 if(isRollback&&(!Number.isSafeInteger(sourceId)||sourceId<=0)){res.status(400).json({error:"Choose a valid historical change"});return;}
 try{
  await ensureHistory();
  const result=await db.transaction(async(tx)=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"feature-toggle:"+ENV+":"+key}))`);
   const row=(await tx.execute(sql`SELECT value FROM site_settings WHERE key=${"feature_"+key} LIMIT 1`)).rows[0] as any;
   const before=row?.value==null?true:String(row.value)!=="false";
   if(before!==body.expectedEnabled)return {conflict:true,current:before};
   let enabled=body.enabled as boolean;
   if(isRollback){
    const historical=(await tx.execute(sql`SELECT previous_enabled,new_enabled FROM feature_toggle_changes
      WHERE id=${sourceId} AND feature_key=${key} AND environment=${ENV} LIMIT 1`)).rows[0] as any;
    if(!historical)return {missing:true};
    enabled=historical.previous_enabled;
   }
   if(before===enabled)return {noop:true,current:before};
   await tx.execute(sql`INSERT INTO site_settings(key,value) VALUES(${"feature_"+key},${enabled?"true":"false"})
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`);
   const changed=await tx.execute(sql`INSERT INTO feature_toggle_changes
    (feature_key,environment,previous_enabled,new_enabled,reason,source_change_id,actor)
    VALUES(${key},${ENV},${before},${enabled},${reason},${isRollback?sourceId:null},${context(req)})
    RETURNING id,created_at`);
   return {ok:true,key,enabled,environment:ENV,change:changed.rows[0]};
  });
  if("conflict" in result){res.status(409).json({error:"Feature changed since this page loaded; refresh",enabled:result.current});return;}
  if("missing" in result){res.status(404).json({error:"Historical change not found"});return;}
  if("noop" in result){res.status(409).json({error:"Toggle is already in the requested state",enabled:result.current});return;}
  res.setHeader("Cache-Control","private,no-store");res.json(result);
 }catch(e){console.error("Feature toggle change failed",e);res.status(503).json({error:"Could not safely save feature change or audit history"});}
}
router.patch("/admin/feature-flags/:key",(req,res)=>{void change(req,res,false);});
router.post("/admin/feature-toggles/:key/rollback",(req,res)=>{void change(req,res,true);});
export default router;
