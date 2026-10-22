import {useEffect,useRef,useState} from "react";
import {useLocation} from "wouter";
import {ImagePlus,History,Monitor,Smartphone,Check,RefreshCw,ExternalLink,Trash2,Palette,Image as ImageIcon,FileText,Save,LayoutGrid,ArrowUp,ArrowDown,GripVertical,Eye,EyeOff} from "lucide-react";
import {AdminLayout} from "./AdminLayout";
import {useAdmin} from "@/context/AdminContext";
import {AdminPageHeader,AdminAction} from "@/components/admin/AdminUi";
import {parseHomeSections,OPTIONAL_HOME_SECTIONS,HOME_SECTIONS_DEFAULT_JSON,type HomeSectionEntry} from "@/design-system/homepageSections";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
type Fields={site_name:string;site_tagline:string;site_logo_url:string;site_favicon_url:string;hero_image_url:string;home_sections_layout:string;hero_title:string;hero_subtitle:string;hero_cta_primary:string;hero_cta_secondary:string;footer_about:string;footer_copyright:string};
type Asset={id:string;filename:string;mime:string;url:string;created_at:string};
type Version={id:string;at:string;fields:Fields};
const fallback:Fields={site_name:"Bazunk",site_tagline:"Buy and sell anything, locally.",site_logo_url:"",site_favicon_url:"",hero_image_url:"",home_sections_layout:HOME_SECTIONS_DEFAULT_JSON,
 hero_title:"Buy, Make an Offer & List for Free!",hero_subtitle:"The smarter way to buy and sell — fixed prices, open offers, and free listings.",
 hero_cta_primary:"Start Shopping",hero_cta_secondary:"Become a Seller",footer_about:"Buy, Sell, and Save More.",footer_copyright:"Bazunk Marketplace"};
const sections=[
 {id:"identity",label:"Site identity",icon:Palette,subtitle:"Names, tagline and logo"},
 {id:"homepage",label:"Homepage content",icon:FileText,subtitle:"Headlines and buttons"},
 {id:"builder",label:"Homepage builder",icon:LayoutGrid,subtitle:"Reorder sections and visibility"},
 {id:"footer",label:"Footer",icon:FileText,subtitle:"About and copyright"},
 {id:"media",label:"Media Library",icon:ImageIcon,subtitle:"Upload and choose images"},
 {id:"history",label:"History & restore",icon:History,subtitle:"Earlier published designs"},
] as const;
type Section=(typeof sections)[number]["id"];
const textClass="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-500 dark:bg-[#20344e] dark:text-white";
const labelClass="block text-sm font-semibold text-slate-800 dark:text-white";
const url=(assetPath:string)=>assetPath.startsWith("/api/site-media/")?API_BASE+assetPath:assetPath;
export function AdminThemeStudioPage(){
 const {authFetch,isAdmin}=useAdmin();const [,go]=useLocation();
 const [section,setSection]=useState<Section>("identity");
 const [draft,setDraft]=useState<Fields>(fallback);
 const [published,setPublished]=useState<Fields>(fallback);
 const [assets,setAssets]=useState<Asset[]>([]);
 const [history,setHistory]=useState<Version[]>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [notice,setNotice]=useState(""),[error,setError]=useState("");
 const [auto,setAuto]=useState("No unpublished changes");
 const [screen,setScreen]=useState<"desktop"|"mobile">("desktop");
 const [dirty,setDirty]=useState(false);
 const [ready,setReady]=useState(false);
 const iframe=useRef<HTMLIFrameElement>(null);
 const file=useRef<HTMLInputElement>(null);
 const editVersion=useRef(0);
 const homeSections=parseHomeSections(draft.home_sections_layout);
 useEffect(()=>{if(!isAdmin)go("/admin")},[isAdmin,go]);
 async function readStudio(){
  setLoading(true);setError("");
  try{
   const [a,m]=await Promise.all([authFetch("/api/admin/theme-studio"),authFetch("/api/admin/theme-studio/media")]);
   const theme=await a.json(),media=await m.json();
   if(!a.ok||!m.ok)throw Error(theme.error||media.error||"Cannot load Theme Studio");
   setDraft({...fallback,...theme.draft});setPublished({...fallback,...theme.published});
   setHistory(Array.isArray(theme.history)?theme.history:[]);
   setAssets(Array.isArray(media.assets)?media.assets:[]);setDirty(false);
  }catch(e){setError(e instanceof Error?e.message:"Theme Studio unavailable")}
  finally{setLoading(false);setReady(true)}
 }
 useEffect(()=>{void readStudio()},[]);
 const update=(key:keyof Fields,value:string)=>{editVersion.current++;setDraft(p=>({...p,[key]:value}));setDirty(true);setAuto("Unsaved draft changes");setNotice("")};
 async function saveDraft(silent=false){
  const snapshot={...draft},version=editVersion.current;
  const r=await authFetch("/api/admin/theme-studio/draft",{method:"PUT",body:JSON.stringify({fields:snapshot})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"Could not save draft");
  if(version===editVersion.current){setAuto("Draft saved");setDirty(false);if(!silent)setNotice("Draft saved. Your public website has not changed.");}
 }
 useEffect(()=>{
  if(!ready||!dirty||busy)return;
  const t=window.setTimeout(()=>{void saveDraft(true).catch(e=>setAuto(e.message||"Autosave failed — use Save draft"))},1200);
  return()=>window.clearTimeout(t);
 },[draft,dirty,ready,busy]);
 async function performSave(){
  setBusy(true);setError("");try{await saveDraft()}catch(e){setError(e instanceof Error?e.message:"Saving failed")}finally{setBusy(false)}
 }
 async function publish(){
  setBusy(true);setError("");setNotice("");
  try{
   const snapshot={...draft},version=editVersion.current;
   const response=await authFetch("/api/admin/theme-studio/publish",{method:"POST",body:JSON.stringify({fields:snapshot})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Could not publish theme");
   setPublished(snapshot);setHistory(Array.isArray(result.history)?result.history:[]);
   if(editVersion.current===version){setDirty(false);setAuto("All changes published")}else setAuto("New draft changes remain unpublished");
   setNotice("Published to Bazunk. Your updated branding, content and homepage layout are live.");
   window.dispatchEvent(new Event("bazunk-settings-updated"));
  }catch(e){setError(e instanceof Error?e.message:"Publishing failed")}finally{setBusy(false)}
 }
 async function upload(selected:File|null){
  if(!selected)return;
  if(!["image/png","image/jpeg","image/webp"].includes(selected.type)||selected.size>1048576){setError("Choose PNG, JPG or WebP under 1 MB");return}
  setBusy(true);setError("");
  try{
   const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(Error("Could not read image"));reader.readAsDataURL(selected)});
   const r=await authFetch("/api/admin/theme-studio/media",{method:"POST",body:JSON.stringify({filename:selected.name,dataUrl})});
   const asset=await r.json();
   if(!r.ok)throw Error(asset.error||"Could not upload image");
   setAssets(p=>[asset,...p]);setNotice("Image uploaded. Choose whether to use it as a logo, hero image or favicon.");
  }catch(e){setError(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false);if(file.current)file.current.value=""}
 }
 async function remove(asset:Asset){
  if(!window.confirm("Delete "+asset.filename+" from the Media Library?"))return;
  setBusy(true);setError("");
  try{
   const r=await authFetch("/api/admin/theme-studio/media/"+asset.id,{method:"DELETE"});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Delete failed");
   setAssets(p=>p.filter(x=>x.id!==asset.id));
   if(draft.site_logo_url===asset.url)update("site_logo_url","");
   if(draft.hero_image_url===asset.url)update("hero_image_url","");
   if(draft.site_favicon_url===asset.url)update("site_favicon_url","");
  }catch(e){setError(e instanceof Error?e.message:"Could not delete image")}finally{setBusy(false)}
 }
 const applyLayout=(sections:HomeSectionEntry[])=>update("home_sections_layout",JSON.stringify(sections));
 const reorder=(from:string,to:string)=>{
  if(from===to)return;
  const reordered=[...homeSections];
  const fromIndex=reordered.findIndex(x=>x.id===from),toIndex=reordered.findIndex(x=>x.id===to);
  if(fromIndex<0||toIndex<0)return;
  const [item]=reordered.splice(fromIndex,1);reordered.splice(toIndex,0,item);
  applyLayout(reordered);
 };
 const stepSection=(id:string,offset:number)=>{
  const position=homeSections.findIndex(x=>x.id===id),target=position+offset;
  if(target<0||target>=homeSections.length)return;
  reorder(id,homeSections[target].id);
 };
 const setVisible=(id:string,enabled:boolean)=>applyLayout(homeSections.map(item=>item.id===id?{...item,enabled}:item));
 const sendPreview=()=>{
  if(!iframe.current?.contentWindow)return;
  iframe.current.contentWindow.postMessage({type:"bazunk:theme-preview-settings",settings:draft},window.location.origin);
 };
 useEffect(()=>{if(!ready)return;sendPreview()},[draft,ready,screen]);
 useEffect(()=>{
  const select=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==iframe.current?.contentWindow||event.data?.type!=="bazunk:theme-preview-select")return;
   const field=String(event.data?.field||"");
   const block=String(event.data?.section||"");
   if(["hero_title","hero_subtitle"].includes(field)){setSection("homepage");setNotice("Hero text selected. Edit it in Homepage content.")}
   else if(field==="footer_about"){setSection("footer");setNotice("Footer text selected. Edit it in Footer.")}
   else if(block){setSection("builder");setNotice("Selected "+block+". Change its order or visibility in Homepage builder.")}
   if(field){window.setTimeout(()=>document.querySelector<HTMLInputElement>('[data-studio-field="'+field+'"]')?.focus(),60);}
  };
  window.addEventListener("message",select);
  return()=>window.removeEventListener("message",select);
 },[]);

 const textInput=(key:keyof Fields,label:string,description?:string,max=180,rows=1)=><label className={labelClass}>{label}
  {rows===1?<input data-studio-field={key} className={textClass} value={draft[key]} maxLength={max} onChange={e=>update(key,e.target.value)}/>:<textarea data-studio-field={key} rows={rows} className={textClass} value={draft[key]} maxLength={max} onChange={e=>update(key,e.target.value)}/>}
  {description&&<span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-300">{description}</span>}
 </label>;
 return <AdminLayout><div className="wp-theme-studio space-y-5">
  <AdminPageHeader title="Theme Studio" description="Change branding, homepage wording and footer content without writing code. Preview drafts before publishing."/>
  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#17243a]">
   <AdminAction variant="secondary" onClick={()=>void performSave()} disabled={loading||busy} icon={Save}>Save draft</AdminAction>
   <AdminAction variant="primary" onClick={()=>void publish()} disabled={loading||busy||JSON.stringify(draft)===JSON.stringify(published)} icon={Check}>{busy?"Working…":"Publish changes"}</AdminAction>
   <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-300" role="status">{JSON.stringify(draft)!==JSON.stringify(published)?"Unpublished changes · ":""}{auto}</span>
  </div>
  {error&&<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</div>}
  {notice&&<p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900 dark:border-blue-700 dark:bg-[#213d60] dark:text-white">{notice}</p>}
  <div className="grid min-w-0 gap-4 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[205px_minmax(280px,365px)_minmax(0,1fr)]">
   <nav aria-label="Theme Studio sections" className="self-start rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-[#17243a]">
    {sections.map(item=><button key={item.id} type="button" onClick={()=>setSection(item.id)} aria-current={section===item.id?"page":undefined} className={"block w-full rounded-lg px-3 py-3 text-left "+(section===item.id?"bg-blue-600 text-white":"text-slate-800 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-[#304761]")}>
     <span className="flex items-center gap-2 text-sm font-bold"><item.icon className="h-4 w-4"/>{item.label}</span>
     <small className={"mt-1 block pl-6 text-xs "+(section===item.id?"text-blue-50":"text-slate-600 dark:text-slate-300")}>{item.subtitle}</small>
    </button>)}
   </nav>
   <section aria-label="Theme settings editor" className="min-w-0 self-start space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#17243a]">
    {loading?<p>Loading Theme Studio…</p>:<>
     {section==="identity"&&<><h2 className="text-lg font-bold">Site identity</h2>{textInput("site_name","Website name","Shown in accessible logo labels and site settings.",90)}
      {textInput("site_tagline","Tagline","Short description of the marketplace.",180)}
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Brand images can be reused across the logo, homepage artwork and favicon without uploading duplicates.</p>
      <div><p className={labelClass}>Website logo</p><div className="mt-2 flex min-h-20 items-center justify-center rounded-lg border bg-slate-50 p-3 dark:border-slate-600 dark:bg-[#243550]">
       <img src={draft.site_logo_url?url(draft.site_logo_url):"/bazunk-logo-header.png"} alt="Current draft logo" className="max-h-16 max-w-full object-contain"/></div>
       <button type="button" onClick={()=>setSection("media")} className="mt-2 text-sm font-bold text-blue-700 underline dark:text-blue-200">Choose or upload an image</button>
       {draft.site_logo_url&&<button type="button" onClick={()=>update("site_logo_url","")} className="ml-3 text-sm font-semibold text-slate-700 underline dark:text-slate-200">Use default logo</button>}
       <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-600"><p className={labelClass}>Favicon (browser tab icon)</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Use a square PNG or WebP, ideally 64 × 64 pixels.</p>{draft.site_favicon_url&&<img alt="Selected favicon" src={url(draft.site_favicon_url)} className="mt-2 h-14 w-14 object-contain"/>}<button type="button" onClick={()=>setSection("media")} className="mt-2 block text-sm font-bold text-blue-700 underline dark:text-blue-200">Choose favicon</button>{draft.site_favicon_url&&<button type="button" onClick={()=>update("site_favicon_url","")} className="mt-2 block text-xs font-bold text-slate-600 underline dark:text-slate-300">Use default favicon</button>}</div>
      </div>
     </>}
     {section==="homepage"&&<><h2 className="text-lg font-bold">Homepage content</h2>
      {textInput("hero_title","Homepage heading",undefined,160)}
      {textInput("hero_subtitle","Supporting text",undefined,600,4)}
      {textInput("hero_cta_primary","Primary button text",undefined,50)}
      {textInput("hero_cta_secondary","Secondary button text",undefined,50)}
      <div className="rounded-lg border border-slate-300 p-3 dark:border-slate-600"><p className={labelClass}>Homepage hero artwork</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Optional image displayed next to the homepage heading.</p>{draft.hero_image_url&&<img alt="Selected hero artwork" src={url(draft.hero_image_url)} className="my-2 h-28 w-full object-contain"/>}<button type="button" onClick={()=>setSection("media")} className="text-sm font-bold text-blue-700 underline dark:text-blue-200">Select image from library</button>{draft.hero_image_url&&<button type="button" onClick={()=>update("hero_image_url","")} className="ml-3 text-sm font-bold text-slate-600 underline dark:text-slate-300">Remove artwork</button>}</div>
     </>}
     {section==="builder"&&<div className="space-y-4">
      <h2 className="text-lg font-bold">Homepage section builder</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">Drag sections to reorder them, or use the up and down arrows. Turn optional sections on or off. Changes appear in your private preview and only become public after Publish.</p>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-800 dark:bg-[#1b3456] dark:text-white">
       <strong className="block">Always visible: shopping first</strong>
       <p className="mt-1 text-xs">Hero · Shop by category · Newest listings. These remain at the top so buyers can still find products.</p>
      </div>
      <ul className="space-y-2" aria-label="Reorderable optional homepage sections">
       {homeSections.map((entry,index)=>{
        const meta=OPTIONAL_HOME_SECTIONS.find(x=>x.id===entry.id)!;
        return <li key={entry.id} draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",entry.id);e.dataTransfer.effectAllowed="move"}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain");reorder(from,entry.id)}} className="rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-[#223750]">
         <div className="flex items-center gap-2">
          <GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300"/>
          <div className="min-w-0 flex-1"><strong className="block text-sm text-slate-950 dark:text-white">{meta.label}</strong><span className="block text-xs text-slate-600 dark:text-slate-300">{meta.description}</span></div>
          <button type="button" onClick={()=>stepSection(entry.id,-1)} disabled={index===0} title={"Move "+meta.label+" up"} aria-label={"Move "+meta.label+" up"} className="rounded border border-slate-300 p-2 disabled:opacity-30 dark:border-slate-500"><ArrowUp className="h-4 w-4"/></button>
          <button type="button" onClick={()=>stepSection(entry.id,1)} disabled={index===homeSections.length-1} title={"Move "+meta.label+" down"} aria-label={"Move "+meta.label+" down"} className="rounded border border-slate-300 p-2 disabled:opacity-30 dark:border-slate-500"><ArrowDown className="h-4 w-4"/></button>
         </div>
         <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
          <input type="checkbox" checked={entry.enabled} onChange={e=>setVisible(entry.id,e.target.checked)} className="h-4 w-4 accent-blue-600"/>
          {entry.enabled?<><Eye className="h-4 w-4"/>Visible on homepage</>:<><EyeOff className="h-4 w-4"/>Hidden from homepage</>}
         </label>
        </li>;
       })}
      </ul>
      <button type="button" onClick={()=>applyLayout(parseHomeSections(HOME_SECTIONS_DEFAULT_JSON))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-blue-700 dark:border-slate-500 dark:text-blue-200">Restore default section order</button>
     </div>}
     {section==="footer"&&<><h2 className="text-lg font-bold">Footer</h2>
      {textInput("footer_about","About Bazunk",undefined,800,4)}
      {textInput("footer_copyright","Copyright notice",undefined,160)}
     </>}
     {section==="media"&&<><h2 className="text-lg font-bold">Media Library</h2>
      <p className="text-xs text-slate-600 dark:text-slate-300">Upload PNG, JPG or WebP under 1 MB. Images are stored on the server database, not ephemeral Render storage. Up to 40 images.</p>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose image" onChange={e=>void upload(e.target.files?.[0]||null)}/>
      <button type="button" disabled={busy} onClick={()=>file.current?.click()} className="wp-action wp-action-primary"><ImagePlus className="h-4 w-4"/>Upload image</button>
      {assets.length===0?<p className="text-sm text-slate-600 dark:text-slate-300">No uploaded images yet.</p>:<div className="grid grid-cols-2 gap-2">{assets.map(asset=><div key={asset.id} className="min-w-0 rounded-lg border border-slate-200 p-2 dark:border-slate-600">
       <img src={url(asset.url)} alt={asset.filename} loading="lazy" className="h-20 w-full rounded bg-slate-50 object-contain dark:bg-slate-800"/>
       <p className="mt-1 truncate text-xs font-semibold" title={asset.filename}>{asset.filename}</p>
       <div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={()=>{update("site_logo_url",asset.url);setSection("identity")}} className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">Use logo</button>
        <button type="button" onClick={()=>{update("hero_image_url",asset.url);setSection("homepage")}} className="rounded border border-blue-500 px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-200">Use hero</button>
        <button type="button" onClick={()=>{update("site_favicon_url",asset.url);setSection("identity")}} className="rounded border border-blue-500 px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-200">Use favicon</button>
        <button type="button" disabled={busy||published.site_logo_url===asset.url} onClick={()=>void remove(asset)} aria-label={"Delete "+asset.filename} className="rounded border border-slate-300 px-2 py-1 text-slate-600 disabled:opacity-40 dark:border-slate-500 dark:text-slate-200"><Trash2 className="h-3.5 w-3.5"/></button></div>
      </div>)}</div>}
     </>}
     {section==="history"&&<><h2 className="text-lg font-bold">Published versions</h2>
      <p className="text-xs text-slate-600 dark:text-slate-300">Restore previous branding and text to a draft first. Nothing changes publicly until you publish.</p>
      {history.length===0?<p className="text-sm">No saved versions yet.</p>:<div className="space-y-2">{history.map(v=><div key={v.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
       <strong className="block text-sm">{new Date(v.at).toLocaleString("en-GB")}</strong>
       <p className="my-1 truncate text-xs text-slate-600 dark:text-slate-300">{v.fields.site_name} · {v.fields.hero_title}</p>
       <button type="button" onClick={()=>{editVersion.current++;setDraft({...fallback,...v.fields});setDirty(true);setSection("identity");setAuto("History restored as draft")}} className="text-sm font-bold text-blue-700 underline dark:text-blue-200">Restore as draft</button>
      </div>)}</div>}
     </>}
    </>}
   </section>
   <section aria-label="Live website preview" className="min-w-0 self-start lg:col-span-2 xl:col-span-1 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#17243a]">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
     <div><h2 className="font-bold text-slate-900 dark:text-white">Live preview</h2><p className="text-xs text-slate-600 dark:text-slate-300">Private preview — click hero text, footer text or a homepage section to edit</p></div>
     <div className="flex items-center gap-1"><button type="button" aria-pressed={screen==="desktop"} onClick={()=>setScreen("desktop")} className={"rounded p-2 "+(screen==="desktop"?"bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-white":"text-slate-600 dark:text-white")} aria-label="Desktop preview"><Monitor className="h-4 w-4"/></button><button type="button" aria-pressed={screen==="mobile"} onClick={()=>setScreen("mobile")} className={"rounded p-2 "+(screen==="mobile"?"bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-white":"text-slate-600 dark:text-white")} aria-label="Mobile preview"><Smartphone className="h-4 w-4"/></button></div>
    </div>
    <div className="flex justify-center overflow-auto rounded-lg bg-slate-100 p-2 dark:bg-[#20324c]">
     <iframe ref={iframe} title="Bazunk draft homepage preview" src="/?bazunk-theme-preview=1" onLoad={sendPreview}
      sandbox="allow-scripts allow-same-origin" className="h-[660px] rounded-md border border-slate-300 bg-white dark:border-slate-600"
      style={{width:screen==="mobile"?375:"100%",maxWidth:"100%"}}/>
    </div>
    <a href="/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-200">Open published website <ExternalLink className="h-3 w-3"/></a>
   </section>
  </div>
 </div></AdminLayout>;
}
