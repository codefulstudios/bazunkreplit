import { Router } from "express";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { recordAdminAudit } from "../lib/adminAudit.js";

export const publicThemeStudioRouter = Router();
export const adminThemeStudioRouter = Router();

const keys = [
  "site_name","site_tagline","site_logo_url","hero_title","hero_subtitle",
  "hero_cta_primary","hero_cta_secondary","footer_about","footer_copyright"
] as const;
type ThemeFields = Record<(typeof keys)[number],string>;
const defaults:ThemeFields = {
  site_name:"Bazunk",site_tagline:"Buy and sell anything, locally.",site_logo_url:"",
  hero_title:"Buy, Make an Offer & List for Free!",
  hero_subtitle:"The smarter way to buy and sell — fixed prices, open offers, and free listings.",
  hero_cta_primary:"Start Shopping",hero_cta_secondary:"Become a Seller",
  footer_about:"Buy, Sell, and Save More.",footer_copyright:"Bazunk Marketplace"
};
const lengths:Record<string,number>={site_name:90,site_tagline:180,site_logo_url:100,hero_title:160,
  hero_subtitle:600,hero_cta_primary:50,hero_cta_secondary:50,footer_about:800,footer_copyright:160};
const assetPath=/^\/api\/site-media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validTheme(raw:unknown):raw is ThemeFields {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
 const v=raw as Record<string,unknown>;
 return Object.keys(v).sort().join(",")===keys.slice().sort().join(",")&&keys.every(key=>{
  const str=v[key];return typeof str==="string"&&str.length<=lengths[key]&&
   !/[<>\u0000-\u001f]/.test(str)&&(key!=="site_logo_url"||str===""||assetPath.test(str));
 });
}
async function mediaTable(){
 await db.execute(sql`CREATE TABLE IF NOT EXISTS site_media_assets(
  id VARCHAR(36) PRIMARY KEY, filename VARCHAR(150) NOT NULL,
  mime VARCHAR(30) NOT NULL, data_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
async function settings(){
 const rows=await db.execute(sql`SELECT key,value FROM site_settings WHERE key IN (
 'site_name','site_tagline','site_logo_url','hero_title','hero_subtitle','hero_cta_primary',
 'hero_cta_secondary','footer_about','footer_copyright',
 'theme_studio_draft_v1','theme_studio_history_v1'
 )`);
 return Object.fromEntries((rows.rows as any[]).map(x=>[String(x.key),String(x.value??"")]));
}
async function put(key:string,value:string){
 await db.execute(sql`INSERT INTO site_settings(key,value,updated_at) VALUES(${key},${value},NOW())
 ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
}
const parse=(s?:string)=>{try{return JSON.parse(s||"")}catch{return null}};
const currentFrom=(rows:Record<string,string>):ThemeFields=>Object.fromEntries(keys.map(k=>[k,rows[k]??defaults[k]])) as ThemeFields;

// Only non-script image formats are allowed. The public image endpoint is separate
// from admin authentication, so published images work for anonymous shoppers.
publicThemeStudioRouter.get("/site-media/:id",async(req,res)=>{
 if(!assetId.test(req.params.id)){res.status(404).end();return}
 try{
  await mediaTable();
  const results=await db.execute(sql`SELECT mime,data_base64 FROM site_media_assets WHERE id=${req.params.id} LIMIT 1`);
  const r=results.rows[0] as any;
  if(!r){res.status(404).end();return}
  const bytes=Buffer.from(String(r.data_base64),"base64");
  res.setHeader("Content-Type",String(r.mime));
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Disposition","inline");
  res.setHeader("Cache-Control","public, max-age=300");
  res.end(bytes);
 }catch(err){logger.error({err},"Theme media retrieval error");res.status(503).end()}
});

adminThemeStudioRouter.get("/admin/theme-studio",async(_req,res)=>{
 try{
  const rows=await settings();
  const current=currentFrom(rows);
  const draft=parse(rows.theme_studio_draft_v1);
  const history=parse(rows.theme_studio_history_v1);
  res.setHeader("Cache-Control","no-store");
  res.json({published:current,draft:validTheme(draft)?draft:current,
   history:Array.isArray(history)?history.slice(0,12).filter(x=>x&&validTheme(x.fields)):[]});
 }catch(err){logger.error({err},"Theme Studio read failed");res.status(503).json({error:"Theme Studio is unavailable"})}
});
adminThemeStudioRouter.put("/admin/theme-studio/draft",async(req,res)=>{
 if(!validTheme(req.body?.fields)){res.status(400).json({error:"Invalid theme draft"});return}
 try{await put("theme_studio_draft_v1",JSON.stringify(req.body.fields));
  res.setHeader("Cache-Control","no-store");res.json({success:true});
 }catch(err){logger.error({err},"Theme draft save failed");res.status(503).json({error:"Could not save draft"})}
});
adminThemeStudioRouter.post("/admin/theme-studio/publish",async(req,res)=>{
 const fields=req.body?.fields;
 if(!validTheme(fields)){res.status(400).json({error:"Invalid theme values; check text and selected logo"});return}
 try{
  if(fields.site_logo_url){
   await mediaTable();
   const selected=fields.site_logo_url.split("/").pop()!;
   const match=await db.execute(sql`SELECT id FROM site_media_assets WHERE id=${selected}`);
   if(!match.rows.length){res.status(400).json({error:"Selected logo is no longer in the media library"});return}
  }
  const rows=await settings(),before=currentFrom(rows);
  const historic=parse(rows.theme_studio_history_v1);
  const history=[{id:randomUUID(),at:new Date().toISOString(),fields:before},
   ...(Array.isArray(historic)?historic.filter((x:any)=>x&&validTheme(x.fields)):[])].slice(0,12);
  // All storefront keys stay compatible with the original public settings reader.
  for(const key of keys)await put(key,fields[key]);
  await put("theme_studio_history_v1",JSON.stringify(history));
  await put("theme_studio_draft_v1",JSON.stringify(fields));
  await recordAdminAudit({req,category:"settings",action:"theme_studio.publish",targetType:"site_settings",
   targetId:"theme_studio",summary:"Published site identity and content from Theme Studio",
   before,after:fields});
  res.setHeader("Cache-Control","no-store");res.json({success:true,history});
 }catch(err){logger.error({err},"Theme publish failed");res.status(503).json({error:"Theme publishing failed; check settings before retrying"})}
});
adminThemeStudioRouter.get("/admin/theme-studio/media",async(_req,res)=>{
 try{
  await mediaTable();
  const r=await db.execute(sql`SELECT id,filename,mime,created_at FROM site_media_assets ORDER BY created_at DESC LIMIT 40`);
  res.setHeader("Cache-Control","no-store");
  res.json({assets:r.rows.map((x:any)=>({...x,url:"/api/site-media/"+x.id}))});
 }catch(err){logger.error({err},"Theme media list failed");res.status(503).json({error:"Media library unavailable"})}
});
adminThemeStudioRouter.post("/admin/theme-studio/media",async(req,res)=>{
 const {filename,dataUrl}=req.body||{};
 if(typeof filename!=="string"||filename.length<1||filename.length>150||/[<>\u0000-\u001f]/.test(filename)||
  typeof dataUrl!=="string"||dataUrl.length>1500000){
  res.status(400).json({error:"Choose a PNG, JPG or WebP image under 1 MB"});return
 }
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
 if(!match){res.status(400).json({error:"Unsupported image format"});return}
 const bytes=Buffer.from(match[2],"base64");
 const mime=match[1],valid=bytes.length>20&&bytes.length<=1048576&&(
  mime==="image/png"&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
  mime==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255||
  mime==="image/webp"&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP");
 if(!valid){res.status(400).json({error:"Invalid or oversized image"});return}
 try{
  await mediaTable();
  const count=await db.execute(sql`SELECT COUNT(*)::int AS count FROM site_media_assets`);
  if(Number((count.rows[0] as any)?.count||0)>=40){res.status(409).json({error:"Media library limit reached (40 images). Remove an unused image first."});return}
  const id=randomUUID();
  await db.execute(sql`INSERT INTO site_media_assets(id,filename,mime,data_base64) VALUES(${id},${filename},${mime},${match[2]})`);
  res.status(201).json({id,filename,mime,url:"/api/site-media/"+id});
 }catch(err){logger.error({err},"Theme media upload failed");res.status(503).json({error:"Could not store image"})}
});
adminThemeStudioRouter.delete("/admin/theme-studio/media/:id",async(req,res)=>{
 if(!assetId.test(req.params.id)){res.status(400).json({error:"Invalid image ID"});return}
 try{
  const rows=await settings();
  if(rows.site_logo_url==="/api/site-media/"+req.params.id){res.status(409).json({error:"This image is the published logo. Replace it before deleting."});return}
  await mediaTable();
  await db.execute(sql`DELETE FROM site_media_assets WHERE id=${req.params.id}`);
  res.json({success:true});
 }catch(err){logger.error({err},"Media delete failed");res.status(503).json({error:"Could not delete media"})}
});
