import { Router } from "express";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { recordAdminAudit } from "../lib/adminAudit.js";

export const publicThemeStudioRouter = Router();
export const adminThemeStudioRouter = Router();

const keys = [
 "site_name","site_tagline","site_logo_url","site_favicon_url","hero_image_url","seo_og_image_url",
 "home_sections_layout","home_sections_content","visual_elements_v1","hero_title","hero_subtitle","hero_cta_primary","hero_cta_secondary",
 "footer_about","footer_copyright","footer_facebook","footer_twitter","footer_instagram","footer_youtube",
 "announcement_enabled","announcement_text","announcement_color",
 "categories_title","categories_subtitle","features_title","features_subtitle",
 "header_search_placeholder","seo_title","seo_description","icon_overrides"
] as const;
type ThemeFields=Record<(typeof keys)[number],string>;
const HOME_LAYOUT_DEFAULT=["promoted","live","promos","perks","features","rewards","announcement","ads"].map(id=>({id,enabled:true}));
const HOME_LAYOUT_IDS=new Set(HOME_LAYOUT_DEFAULT.map(x=>x.id));
const ICON_PLACEMENTS=["header_home","header_search","header_cart","header_account","footer_facebook","footer_twitter","footer_instagram","footer_youtube"] as const;
const ICON_TYPES=new Set(["home","search","cart","account","heart","package","store","menu","star","bell","message","mail","globe","categories","facebook","instagram","youtube","twitter","shield"]);
const DEFAULT_ICONS={
 header_home:"home",header_search:"search",header_cart:"cart",header_account:"account",
 footer_facebook:"facebook",footer_twitter:"twitter",footer_instagram:"instagram",footer_youtube:"youtube"
};
function validIconOverrides(source:string){
 try{
  const value=JSON.parse(source);
  return value&&typeof value==="object"&&!Array.isArray(value)&&
   Object.keys(value).sort().join(",")===ICON_PLACEMENTS.slice().sort().join(",")&&
   ICON_PLACEMENTS.every(k=>typeof value[k]==="string"&&ICON_TYPES.has(value[k]));
 }catch{return false}
}
function validHomeLayout(value:string){
 try{
  const sections=JSON.parse(value);
  return Array.isArray(sections)&&sections.length===HOME_LAYOUT_DEFAULT.length&&
   new Set(sections.map((x:any)=>x?.id)).size===HOME_LAYOUT_IDS.size&&
   sections.every((x:any)=>x&&typeof x==="object"&&!Array.isArray(x)&&
    Object.keys(x).sort().join(",")==="enabled,id"&&HOME_LAYOUT_IDS.has(x.id)&&typeof x.enabled==="boolean");
 }catch{return false}
}
const defaults:ThemeFields={
 site_name:"Bazunk",site_tagline:"Buy and sell anything, locally.",
 site_logo_url:"",site_favicon_url:"",hero_image_url:"",seo_og_image_url:"",
 visual_elements_v1:"[]",home_sections_layout:JSON.stringify(HOME_LAYOUT_DEFAULT),
 home_sections_content:JSON.stringify(Object.fromEntries(HOME_LAYOUT_DEFAULT.map(x=>[x.id,{title:x.id,description:"",button:"",url:""}]))),
 hero_title:"Buy, Make an Offer & List for Free!",
 hero_subtitle:"The smarter way to buy and sell — fixed prices, open offers, and free listings.",
 hero_cta_primary:"Start Shopping",hero_cta_secondary:"Become a Seller",
 footer_about:"Buy, Sell, and Save More.",footer_copyright:"Bazunk Marketplace",
 footer_facebook:"#",footer_twitter:"#",footer_instagram:"#",footer_youtube:"#",
 announcement_enabled:"false",announcement_text:"Welcome to Bazunk — buy and sell anything locally!",
 announcement_color:"#1769ff",
 categories_title:"Shop by Category",categories_subtitle:"Browse categories across Bazunk",
 features_title:"Why Bazunk?",features_subtitle:"A marketplace built around trust",
 header_search_placeholder:"Search listings...",
 seo_title:"Bazunk - Buy & Sell Anything Locally",
 seo_description:"The smarter way to buy and sell locally. Free listings, secure checkout, real reviews.",
 icon_overrides:JSON.stringify(DEFAULT_ICONS)
};
const lengths:Record<string,number>={
 site_name:90,site_tagline:180,site_logo_url:100,site_favicon_url:100,hero_image_url:100,
 seo_og_image_url:100,home_sections_layout:600,home_sections_content:12000,visual_elements_v1:12000,
 hero_title:160,hero_subtitle:600,hero_cta_primary:50,hero_cta_secondary:50,
 footer_about:800,footer_copyright:160,
 footer_facebook:220,footer_twitter:220,footer_instagram:220,footer_youtube:220,
 announcement_enabled:5,announcement_text:220,announcement_color:7,
 categories_title:120,categories_subtitle:240,features_title:120,features_subtitle:240,
 header_search_placeholder:100,seo_title:150,seo_description:320,icon_overrides:300
};
const assetPath=/^\/api\/site-media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mediaKeys=["site_logo_url","site_favicon_url","hero_image_url","seo_og_image_url"] as const;
const socialKeys=["footer_facebook","footer_twitter","footer_instagram","footer_youtube"] as const;
function validSectionContent(raw:string){
 try {
  const obj=JSON.parse(raw);
  if(!obj||typeof obj!=="object"||Array.isArray(obj))return false;
  if(Object.keys(obj).sort().join(",")!==HOME_LAYOUT_DEFAULT.map(x=>x.id).sort().join(","))return false;
  return Object.entries(obj).every(([id,value]:[string,any])=>{
   if(!value||typeof value!=="object"||Array.isArray(value))return false;
   let cardsValid=true;
   if(value.cards!==undefined){
    const expected=id==="promos"?4:id==="perks"?5:0;
    cardsValid=expected>0&&Array.isArray(value.cards)&&value.cards.length===expected;
    if(cardsValid)for(const card of value.cards){
     if(!card||typeof card!=="object"){cardsValid=false;break}
     for(const extra of ["image","background","textColor"]){
      const v=card[extra];
      if(v===undefined)continue;
      if(typeof v!=="string"||(extra==="image"?(v!==""&&!assetPath.test(v)):(v!==""&&!/^#[0-9a-fA-F]{6}$/.test(v))))cardsValid=false;
     }
     for(const key of ["title","description","url"]){
      const field=card[key];
      if(typeof field!=="string"||field.length>500||field.includes("<")||field.includes(">"))cardsValid=false;
      if(key==="url"&&field&&(!field.startsWith("/")||field.startsWith("//")||field.includes(":")))cardsValid=false;
     }
    }
   }
   return cardsValid&&["title","description","button","url"].every(key=>{
    const str=value[key];
    return typeof str==="string"&&str.length<=(key==="description"?500:key==="url"?200:140)
      && !/[<>]/.test(str) && !Array.from(str).some(char=>char.charCodeAt(0)<32)
      &&(key!=="url"||str===""||(str.startsWith("/")&&!str.startsWith("//")&&!str.includes(":")));
   });
  });
 }catch{return false}
}
function validElements(raw:string){
 try{
  const items=JSON.parse(raw);
  if(!Array.isArray(items)||items.length>24)return false;
  const ids=new Set();
  return items.every((item:any)=>{
   if(!item||typeof item!=="object"||!["heading","paragraph","image","button","banner","card"].includes(item.type))return false;
   if(typeof item.id!=="string"||!/^[a-z0-9-]{1,64}$/.test(item.id)||ids.has(item.id))return false;
   ids.add(item.id);
   if(item.hidden!==undefined&&typeof item.hidden!=="boolean")return false;
   if(item.responsive!==undefined){
    if(!item.responsive||typeof item.responsive!=="object"||Array.isArray(item.responsive)||Object.keys(item.responsive).some(k=>!["tablet","mobile"].includes(k)))return false;
    for(const responsive of Object.values(item.responsive) as any[]){if(!responsive||typeof responsive!=="object"||Array.isArray(responsive))return false;for(const [key,v] of Object.entries(responsive)){if(key==="align"){if(!["left","center","right"].includes(v as string))return false}else if(!["fontSize","padding","width","sectionSpacing"].includes(key)||typeof v!=="number"||!Number.isInteger(v)||v<(key==="width"?10:key==="fontSize"?10:0)||v>(key==="fontSize"?96:key==="width"?100:120))return false}}
   }
   if(item.style!==undefined){
    const st=item.style;
    if(!st||typeof st!=="object"||Array.isArray(st))return false;
    const ranges:Record<string,[number,number]>={fontSize:[10,96],fontWeight:[100,900],borderWidth:[0,12],borderRadius:[0,80],padding:[0,120],gap:[0,100],width:[10,100],columns:[1,4],sectionSpacing:[0,120],imageHeight:[40,1000],imagePositionX:[0,100],imagePositionY:[0,100]};
    const allowed=new Set([...Object.keys(ranges),"fontFamily","borderColor","shadow","align","imageFit","buttonHoverBackground","buttonHoverColor","buttonVariant"]);
    for(const [key,value] of Object.entries(st)){
     if(!allowed.has(key))return false;
     if(key in ranges){const [min,max]=ranges[key];if(typeof value!=="number"||!Number.isInteger(value)||value<min||value>max)return false}
     else if(["buttonHoverBackground","buttonHoverColor","borderColor"].includes(key)){if(typeof value!=="string"||(value!==""&&!/^#[0-9a-fA-F]{6}$/.test(value)))return false}
     else if(key==="imageFit"){if(!["cover","contain","fill"].includes(value as string))return false}
     else if(key==="buttonVariant"){if(!["solid","outline","ghost"].includes(value as string))return false}
     else if(key==="fontFamily"){if(!["","inherit","Arial","Georgia","Verdana","system-ui","Tahoma"].includes(value as string))return false}
     else if(key==="shadow"){if(!["","none","small","medium","large"].includes(value as string))return false}
     else if(key==="align"){if(!["","left","center","right"].includes(value as string))return false}
    }
   }
   return ["text","url","image","background","color"].every(key=>{
    const v=item[key];if(typeof v!=="string"||v.length>500||/[<>\\u0000-\\u001f]/.test(v))return false;
    if(key==="url"&&v&&(!v.startsWith("/")||v.startsWith("//")||v.includes(":")))return false;
    if(key==="image"&&v&&!assetPath.test(v))return false;
    if(["background","color"].includes(key)&&v&&!/^#[0-9a-fA-F]{6}$/.test(v))return false;
    return true;
   });
  });
 }catch{return false}
}
function validTheme(raw:unknown):raw is ThemeFields{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
 const v=raw as Record<string,unknown>;
 return Object.keys(v).sort().join(",")===keys.slice().sort().join(",")&&keys.every(key=>{
  const str=v[key];
  return typeof str==="string"&&str.length<=lengths[key]&&
   !/[<>\u0000-\u0009\u000b-\u001f]/.test(str)&&
   (!mediaKeys.includes(key as any)||str===""||assetPath.test(str))&&
   (!socialKeys.includes(key as any)||str==="#"||str===""||/^https:\/\/[^\s]+$/i.test(str))&&
   (key!=="announcement_enabled"||str==="true"||str==="false")&&
   (key!=="announcement_color"||/^#[0-9a-fA-F]{6}$/.test(str))&&
   (key!=="home_sections_layout"||validHomeLayout(str))&&
   (key!=="home_sections_content"||validSectionContent(str))&&
   (key!=="visual_elements_v1"||validElements(str))&&
   (key!=="icon_overrides"||validIconOverrides(str));
 });
}
function normalizeTheme(raw:unknown,base:ThemeFields=defaults):ThemeFields|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const candidate={...base,...raw};
 return validTheme(candidate)?candidate:null;
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
  'site_name',
  'site_tagline',
  'site_logo_url',
  'site_favicon_url',
  'hero_image_url',
  'seo_og_image_url',
  'home_sections_layout',
  'visual_elements_v1',
  'hero_title',
  'hero_subtitle',
  'hero_cta_primary',
  'hero_cta_secondary',
  'footer_about',
  'footer_copyright',
  'footer_facebook',
  'footer_twitter',
  'footer_instagram',
  'footer_youtube',
  'announcement_enabled',
  'announcement_text',
  'announcement_color',
  'categories_title',
  'categories_subtitle',
  'features_title',
  'features_subtitle',
  'header_search_placeholder',
  'seo_title',
  'seo_description',
  'icon_overrides',
  'theme_studio_draft_v1',
  'theme_studio_history_v1'
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
  res.json({published:current,draft:normalizeTheme(draft,current)||current,
   history:Array.isArray(history)?history.slice(0,12).map((x:any)=>x&&({...x,fields:normalizeTheme(x.fields)})).filter((x:any)=>x&&x.fields):[]});
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
  const selectedImages=mediaKeys.map(key=>fields[key]).filter(Boolean);
  if(selectedImages.length){
   await mediaTable();
   for(const image of selectedImages){
    const selected=image.split("/").pop()!;
    const match=await db.execute(sql`SELECT id FROM site_media_assets WHERE id=${selected}`);
    if(!match.rows.length){res.status(400).json({error:"A selected image is no longer in the media library"});return}
   }
  }
  const rows=await settings(),before=currentFrom(rows);
  const historic=parse(rows.theme_studio_history_v1);
  const history=[{id:randomUUID(),at:new Date().toISOString(),fields:before},
   ...(Array.isArray(historic)?historic.map((x:any)=>x&&({...x,fields:normalizeTheme(x.fields)})).filter((x:any)=>x&&x.fields):[])].slice(0,12);
  // One SQL statement commits all public settings, draft and version history together.
  // A partial theme is never exposed if a database write fails.
  const updates=[...keys.map(key=>[key,fields[key]] as const),
   ["theme_studio_enabled","true"],["theme_studio_history_v1",JSON.stringify(history)],
   ["theme_studio_draft_v1",JSON.stringify(fields)]] as const;
  await db.execute(sql`INSERT INTO site_settings(key,value,updated_at) VALUES ${sql.join(updates.map(([key,value])=>sql`(${key},${value},NOW())`),sql`, `)}
   ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
  try{await recordAdminAudit({req,category:"settings",action:"theme_studio.publish",targetType:"site_settings",
   targetId:"theme_studio",summary:"Published site identity, content and homepage layout from Theme Studio",
   before,after:fields})}catch(auditError){logger.error({err:auditError},"Theme published but audit recording failed")}
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
  const selected="/api/site-media/"+req.params.id;
  const current=currentFrom(rows),draft=normalizeTheme(parse(rows.theme_studio_draft_v1));
  const history=parse(rows.theme_studio_history_v1);
  const inUse=(v:ThemeFields)=>mediaKeys.some(key=>v[key]===selected);
  if(inUse(current)||draft&&inUse(draft)||Array.isArray(history)&&history.some((h:any)=>{const v=normalizeTheme(h?.fields);return v&&inUse(v)})){
   res.status(409).json({error:"This image is used by the published site, a draft or version history. Replace it before deleting."});return
  }
  await mediaTable();
  await db.execute(sql`DELETE FROM site_media_assets WHERE id=${req.params.id}`);
  res.json({success:true});
 }catch(err){logger.error({err},"Media delete failed");res.status(503).json({error:"Could not delete media"})}
});
