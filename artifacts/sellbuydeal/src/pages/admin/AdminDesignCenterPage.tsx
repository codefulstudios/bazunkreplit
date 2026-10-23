import {useCallback,useEffect,useRef,useState} from "react";
import {useLocation} from "wouter";
import {Home,PanelTop,PanelBottom,Palette,Type,Shapes,Search,Image as ImageIcon,Layers3,History,LayoutTemplate,Monitor,Smartphone,Save,Upload,ExternalLink,ArrowUp,ArrowDown,GripVertical,Eye,ChevronRight,CheckCircle2,AlertCircle,Trash2,RefreshCw,ShoppingBag} from "lucide-react";
import {AdminLayout} from "./AdminLayout";
import {useAdmin} from "@/context/AdminContext";
import {parseHomeSections,OPTIONAL_HOME_SECTIONS,HOME_SECTIONS_DEFAULT_JSON,type HomeSectionEntry} from "@/design-system/homepageSections";
import {THEME_CENTER_DEFAULTS,ICON_CHOICES,ICON_PLACEMENTS,parseIconOverrides,iconForPlacement,type DesignFields,type IconPlacement,type IconChoice} from "@/design-system/designCenterFields";
import "./admin-design-center.css";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
const assetUrl=(src:string)=>src.startsWith("/api/site-media/")?API_BASE+src:src;
type Asset={id:string;filename:string;mime:string;url:string;created_at:string};
type Version={id:string;at:string;fields:Partial<DesignFields>};
const TABS=[
 {id:"overview",name:"Overview",icon:Home,description:"Manage your design"},
 {id:"homepage",name:"Homepage",icon:Home,description:"Edit and reorder sections"},
 {id:"header",name:"Header & Navigation",icon:PanelTop,description:"Search, notices and icons"},
 {id:"footer",name:"Footer",icon:PanelBottom,description:"Text, links and social media"},
 {id:"branding",name:"Branding & Logos",icon:Palette,description:"Logos, favicon and brand name"},
 {id:"sitewide",name:"Sitewide Text",icon:Type,description:"Global messages and labels"},
 {id:"icons",name:"Icons",icon:Shapes,description:"Icons by page and location"},
 {id:"seo",name:"SEO & Meta",icon:Search,description:"Search and social previews"},
 {id:"media",name:"Media Library",icon:ImageIcon,description:"Your uploaded images"},
 {id:"templates",name:"Templates",icon:LayoutTemplate,description:"Advanced styling tools"},
 {id:"history",name:"Version History",icon:History,description:"Restore earlier publications"},
] as const;
type Tab=(typeof TABS)[number]["id"];
const isTab=(value:string|null):value is Tab=>TABS.some(tab=>tab.id===value);
const routeTab=()=>{const param=new URLSearchParams(window.location.search).get("tab");return isTab(param)?param:"overview"};
const useSections=[{id:"hero",label:"Hero Banner",subtitle:"Primary heading, call to action and artwork"},{id:"categories",label:"Featured Categories",subtitle:"Category heading and description"},{id:"recent",label:"Newest Listings",subtitle:"Real recently listed products"},...OPTIONAL_HOME_SECTIONS.map(item=>({id:item.id,label:item.label,subtitle:item.description}))];
const imageTargets=[
 {key:"site_logo_url",title:"Primary logo",description:"Used in the store header and footer"},
 {key:"site_favicon_url",title:"Favicon",description:"Small browser-tab icon"},
 {key:"hero_image_url",title:"Homepage artwork",description:"Image next to the hero text"},
 {key:"seo_og_image_url",title:"Social sharing image",description:"Open Graph preview image"},
] as const;
type MediaTarget=(typeof imageTargets)[number]["key"];

export function AdminDesignCenterPage(){
 const {authFetch}=useAdmin();
 const [,navigate]=useLocation();
 const [tab,setTab]=useState<Tab>(routeTab);
 const [draft,setDraft]=useState<DesignFields>({...THEME_CENTER_DEFAULTS});
 const [published,setPublished]=useState<DesignFields>({...THEME_CENTER_DEFAULTS});
 const [history,setHistory]=useState<Version[]>([]);
 const [assets,setAssets]=useState<Asset[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [auto,setAuto]=useState("Ready");
 const [dirty,setDirty]=useState(false);
 const [device,setDevice]=useState<"desktop"|"mobile">("desktop");
 const [activeBlock,setActiveBlock]=useState("hero");
 const [mediaTarget,setMediaTarget]=useState<MediaTarget>("site_logo_url");
 const [query,setQuery]=useState("");
 const frame=useRef<HTMLIFrameElement>(null),file=useRef<HTMLInputElement>(null);
 const editVersion=useRef(0);
 const pendingSave=useRef<Promise<void>|null>(null);
 const homeSections=parseHomeSections(draft.home_sections_layout);
 const icons=parseIconOverrides(draft.icon_overrides);
 const unpublished=JSON.stringify(draft)!==JSON.stringify(published);
 const changeTab=useCallback((next:Tab)=>{
  setTab(next);
  const nextUrl=new URL(window.location.href);nextUrl.searchParams.set("tab",next);
  window.history.replaceState(window.history.state,"",nextUrl.pathname+nextUrl.search+nextUrl.hash);
 },[]);
 const update=(key:keyof DesignFields,value:string)=>{
  editVersion.current++;
  setDraft(prev=>({...prev,[key]:value}));setDirty(true);setAuto("Unsaved changes");setError("");
 };
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [result,media]=await Promise.all([authFetch("/api/admin/theme-studio"),authFetch("/api/admin/theme-studio/media")]);
   const theme=await result.json(),images=await media.json();
   if(!result.ok||!media.ok)throw Error(theme.error||images.error||"Could not load Design Center");
   setDraft({...THEME_CENTER_DEFAULTS,...theme.draft});
   setPublished({...THEME_CENTER_DEFAULTS,...theme.published});
   setHistory(Array.isArray(theme.history)?theme.history:[]);
   setAssets(Array.isArray(images.assets)?images.assets:[]);
   setDirty(false);setAuto("All changes saved");
  }catch(e){setError(e instanceof Error?e.message:"Design Center unavailable")}
  finally{setLoading(false)}
 },[authFetch]);
 useEffect(()=>{void load()},[load]);
 const persist=async(manual=false)=>{
  if(pendingSave.current)await pendingSave.current;
  const snapshot={...draft},version=editVersion.current;
  const operation=(async()=>{
   const result=await authFetch("/api/admin/theme-studio/draft",{method:"PUT",body:JSON.stringify({fields:snapshot})});
   const data=await result.json().catch(()=>({}));
   if(!result.ok)throw Error(data.error||"Could not save draft");
   if(version===editVersion.current){setDirty(false);setAuto("Draft saved automatically");if(manual)setNotice("Draft saved. Your website has not changed.")}
  })();
  pendingSave.current=operation;
  try{await operation}finally{if(pendingSave.current===operation)pendingSave.current=null}
 };
 useEffect(()=>{
  if(loading||busy||!dirty)return;
  const timer=window.setTimeout(()=>{void persist().catch(e=>setAuto(e instanceof Error?e.message:"Autosave failed"))},1300);
  return()=>window.clearTimeout(timer);
 },[loading,busy,dirty,draft]);
 const save=async()=>{setBusy(true);setError("");try{await persist(true)}catch(e){setError(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}};
 const publish=async()=>{
  setBusy(true);setError("");setNotice("");
  try{
   if(pendingSave.current)await pendingSave.current;
   const snapshot={...draft},version=editVersion.current;
   const response=await authFetch("/api/admin/theme-studio/publish",{method:"POST",body:JSON.stringify({fields:snapshot})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||"Publishing failed");
   setPublished(snapshot);setHistory(Array.isArray(data.history)?data.history:[]);
   if(editVersion.current===version){setDirty(false);setAuto("Published successfully")}else setAuto("New changes remain in draft");
   setNotice("Changes published successfully across Bazunk.");
   window.dispatchEvent(new Event("bazunk-settings-updated"));
  }catch(e){setError(e instanceof Error?e.message:"Could not publish design")}finally{setBusy(false)}
 };
 const upload=async(selected:File|null)=>{
  if(!selected)return;
  if(!["image/png","image/jpeg","image/webp"].includes(selected.type)||selected.size>1048576){setError("Upload a PNG, JPG or WebP smaller than 1 MB.");return}
  setBusy(true);setError("");
  try{
   const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Unable to read image"));reader.readAsDataURL(selected)});
   const response=await authFetch("/api/admin/theme-studio/media",{method:"POST",body:JSON.stringify({filename:selected.name,dataUrl})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Upload failed");
   setAssets(previous=>[data,...previous]);setNotice("Image uploaded to your Media Library.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to upload image")}finally{setBusy(false);if(file.current)file.current.value=""}
 };
 const remove=async(asset:Asset)=>{
  if(!window.confirm("Permanently delete "+asset.filename+" from the library?"))return;
  setBusy(true);setError("");
  try{
   const response=await authFetch("/api/admin/theme-studio/media/"+asset.id,{method:"DELETE"});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Could not delete image");
   setAssets(previous=>previous.filter(item=>item.id!==asset.id));setNotice("Unused image deleted");
  }catch(e){setError(e instanceof Error?e.message:"Delete failed")}finally{setBusy(false)}
 };
 const setIcon=(placement:IconPlacement,choice:IconChoice)=>update("icon_overrides",JSON.stringify({...icons,[placement]:choice}));
 const applyLayout=(entries:HomeSectionEntry[])=>update("home_sections_layout",JSON.stringify(entries));
 const reorder=(from:string,to:string)=>{
  if(from===to)return;
  const list=[...homeSections],first=list.findIndex(x=>x.id===from),second=list.findIndex(x=>x.id===to);
  if(first<0||second<0)return;
  const [item]=list.splice(first,1);list.splice(second,0,item);applyLayout(list);
 };
 const move=(id:string,offset:number)=>{const from=homeSections.findIndex(x=>x.id===id),to=from+offset;if(to>=0&&to<homeSections.length)reorder(id,homeSections[to].id)};
 const sendPreview=useCallback(()=>{frame.current?.contentWindow?.postMessage({type:"bazunk:theme-preview-settings",settings:draft},window.location.origin)},[draft]);
 useEffect(()=>{sendPreview()},[sendPreview,tab,device]);
 useEffect(()=>{
  const listener=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow||event.data?.type!=="bazunk:theme-preview-select")return;
   const field=String(event.data.field||""),section=String(event.data.section||"");
   if(field==="site_logo_url"){changeTab("branding");setMediaTarget("site_logo_url")}
   else if(field==="footer_about")changeTab("footer");
   else if(field==="header_search_placeholder")changeTab("header");
   else if(field==="icon_overrides")changeTab("icons");
   else if(field){changeTab("homepage");setActiveBlock("hero")}
   else if(section){changeTab("homepage");setActiveBlock(section)}
  };
  window.addEventListener("message",listener);return()=>window.removeEventListener("message",listener);
 },[changeTab]);
 const input=(key:keyof DesignFields,label:string,description?:string,max=180,multiline=false)=><label key={key} className="bzdc-field">
  <span>{label}</span>{description&&<small>{description}</small>}
  {multiline?<textarea value={draft[key]} maxLength={max} rows={3} onChange={e=>update(key,e.target.value)}/>:<input type="text" value={draft[key]} maxLength={max} onChange={e=>update(key,e.target.value)}/>}
  <em>{draft[key].length}/{max}</em>
 </label>;
 const imageControl=(key:MediaTarget,label:string)=> <div className="bzdc-image-target" key={key}>
  <div className="bzdc-image-thumb">{draft[key]?<img src={assetUrl(draft[key])} alt={label}/>:<ImageIcon size={28}/>}</div>
  <div className="bzdc-image-detail"><strong>{label}</strong><small>{draft[key]?"Image selected":"Using default artwork"}</small><div className="bzdc-image-buttons">
   <button type="button" className="bzdc-mini" onClick={()=>{setMediaTarget(key);changeTab("media")}}>Choose from Media Library</button>
   {draft[key]&&<button type="button" className="bzdc-text-button" onClick={()=>update(key,"")}>Reset</button>}
  </div></div>
 </div>;
 const preview=(compact=false)=><section className={"bzdc-panel bzdc-preview "+(compact?"bzdc-preview-compact":"")}>
  <div className="bzdc-panel-title"><div><h3>Storefront preview</h3><small>Live private draft — not published</small></div><a href="/" target="_blank" rel="noopener noreferrer">Open store <ExternalLink size={13}/></a></div>
  <div className="bzdc-device-tabs">
   <button type="button" aria-pressed={device==="desktop"} onClick={()=>setDevice("desktop")}><Monitor size={15}/> Desktop</button>
   <button type="button" aria-pressed={device==="mobile"} onClick={()=>setDevice("mobile")}><Smartphone size={15}/> Mobile</button>
  </div>
  <div className={"bzdc-frame-shell "+(device==="mobile"?"is-mobile":"is-desktop")}>
   <iframe ref={frame} key={tab+"-"+device} title={"Bazunk "+device+" private design preview"} src="/?bazunk-theme-preview=1" onLoad={sendPreview}/>
  </div>
 </section>;
 const overviewCards=[
  {tab:"homepage",title:"Homepage",description:"Edit banners, product sections and content",icon:Home},
  {tab:"header",title:"Header & Navigation",description:"Set header wording and navigation icons",icon:PanelTop},
  {tab:"footer",title:"Footer",description:"Edit copyright, links and social icons",icon:PanelBottom},
  {tab:"branding",title:"Branding & Logos",description:"Choose logos, favicons and brand assets",icon:Palette},
  {tab:"sitewide",title:"Sitewide Text",description:"Change global titles, labels and notices",icon:Type},
  {tab:"seo",title:"SEO & Meta",description:"Edit search titles and social previews",icon:Search},
  {tab:"media",title:"Media Library",description:"Upload and reuse your images",icon:ImageIcon},
  {tab:"icons",title:"Icons",description:"Choose individual header and footer symbols",icon:Shapes},
 ] as const;
 const mediaLibrary=<section className="bzdc-panel">
  <div className="bzdc-panel-title"><div><h3>Media Library</h3><small>PNG, JPG or WebP under 1 MB. Images are stored in Bazunk's database.</small></div>
   <button type="button" disabled={busy} className="bzdc-btn bzdc-primary" onClick={()=>file.current?.click()}><Upload size={16}/> Upload image</button>
  </div>
  <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>void upload(e.target.files?.[0]||null)}/>
  <p className="bzdc-help">Choosing an image assigns it to: <strong>{imageTargets.find(item=>item.key===mediaTarget)?.title}</strong>. The change stays in your draft until you publish.</p>
  <div className="bzdc-library">
   {assets.length===0?<div className="bzdc-empty"><ImageIcon/><strong>No media yet</strong><p>Upload an image to start your library.</p></div>:assets.filter(asset=>asset.filename.toLowerCase().includes(query.toLowerCase())).map(asset=><article key={asset.id} className="bzdc-asset">
    <img src={assetUrl(asset.url)} alt={asset.filename} loading="lazy"/>
    <strong title={asset.filename}>{asset.filename}</strong>
    <div><button type="button" className="bzdc-mini" onClick={()=>{update(mediaTarget,asset.url);setNotice("Image assigned to "+imageTargets.find(item=>item.key===mediaTarget)?.title);changeTab(mediaTarget==="seo_og_image_url"?"seo":mediaTarget==="hero_image_url"?"homepage":"branding")}}>Use image</button>
    <button type="button" disabled={busy} title={"Delete "+asset.filename} aria-label={"Delete "+asset.filename} onClick={()=>void remove(asset)}><Trash2 size={16}/></button></div>
   </article>)}
  </div>
  {assets.length>0&&<label className="bzdc-search-assets"><Search size={15}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter uploaded images"/></label>}
 </section>;
 return <AdminLayout>
  <div className="bzdc-root">
   <div className="bzdc-heading">
    <div><span className="bzdc-breadcrumb">Bazunk Administration / Design Center {tab!=="overview"&&" / "+TABS.find(x=>x.id===tab)?.name}</span><h1>{tab==="overview"?"Design Center":TABS.find(x=>x.id===tab)?.name}</h1>
     <p>{tab==="overview"?"Manage the appearance and wording of your Bazunk storefront from one place.":TABS.find(x=>x.id===tab)?.description}</p>
    </div>
    <div className="bzdc-header-actions">
     <button type="button" className="bzdc-btn" onClick={()=>changeTab("homepage")}><Eye size={17}/> Preview</button>
     <button type="button" className="bzdc-btn" disabled={loading||busy} onClick={()=>void save()}><Save size={17}/> Save draft</button>
     <button type="button" className="bzdc-btn bzdc-primary" disabled={loading||busy||!unpublished} onClick={()=>void publish()}><CheckCircle2 size={17}/> {busy?"Working…":"Publish changes"}</button>
    </div>
   </div>
   <div className="bzdc-workspace">
    <nav className="bzdc-menu" aria-label="Design Center sections">
     <div className="bzdc-menu-title"><Palette size={18}/><strong>Design Center</strong></div>
     {TABS.map(item=><button type="button" key={item.id} aria-current={tab===item.id?"page":undefined} onClick={()=>changeTab(item.id)} className={"bzdc-menu-link "+(tab===item.id?"selected":"")}>
      <item.icon size={18}/><span>{item.name}</span>{tab===item.id&&<ChevronRight size={14}/>}
     </button>)}
    </nav>
    <main className="bzdc-content" aria-label="Design Center editor">
     {error&&<div role="alert" className="bzdc-alert error"><AlertCircle size={17}/>{error}</div>}
     {notice&&<div role="status" className="bzdc-alert success"><CheckCircle2 size={17}/>{notice}<button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
     {loading?<div className="bzdc-panel bzdc-loading">Loading your saved design…</div>:<>
      {tab==="overview"&&<div className="bzdc-overview-grid">
       <div className="bzdc-stack">
        <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h2>Manage your design</h2><small>Choose an area. Every setting has its own focused editor.</small></div></div>
         <div className="bzdc-card-grid">{overviewCards.map(item=><button type="button" key={item.tab} className="bzdc-launch" onClick={()=>changeTab(item.tab)}><span className="bzdc-launch-icon"><item.icon size={23}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={17}/></button>)}</div>
        </section>
        <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Quick start</h3><small>Make your storefront your own in four simple steps.</small></div></div>
         {([{tab:"branding",title:"1. Upload your logo",description:"Set the primary logo and favicon"},{tab:"homepage",title:"2. Customise the homepage",description:"Edit headings and section order"},{tab:"icons",title:"3. Check the website icons",description:"Choose header and footer icon designs"},{tab:"seo",title:"4. Review search results",description:"Check the homepage title and sharing preview"}] as const).map(item=><button type="button" className="bzdc-quick-step" key={item.tab} onClick={()=>changeTab(item.tab)}><span><strong>{item.title}</strong><small>{item.description}</small></span><span>Open <ChevronRight size={14}/></span></button>)}
        </section>
       </div>
       <div className="bzdc-stack">{preview(true)}
        <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Current design version</h3><small>Unpublished edits are private until you press Publish.</small></div></div>
         <div className="bzdc-version"><span>Publication status</span><strong>{unpublished?"Draft changes":"Published"}</strong></div>
         <div className="bzdc-version"><span>Draft status</span><strong>{auto}</strong></div>
         <div className="bzdc-version"><span>Previous versions</span><strong>{history.length}</strong></div>
         <button type="button" className="bzdc-btn bzdc-full" onClick={()=>changeTab("history")}>View version history <ChevronRight size={15}/></button>
        </section>
       </div>
      </div>}
      {tab==="homepage"&&<div className="bzdc-builder-grid">
       <section className="bzdc-panel">
        <div className="bzdc-panel-title"><div><h3>Homepage sections</h3><small>Reorder optional sections, choose one to edit and set visibility.</small></div></div>
        <div className="bzdc-section-list">
         {useSections.map(item=>{
          const fixed=["hero","categories","recent"].includes(item.id);
          const optional=homeSections.find(x=>x.id===item.id);
          const position=homeSections.findIndex(x=>x.id===item.id);
          return <div key={item.id} className={"bzdc-section-item "+(activeBlock===item.id?"selected":"")} draggable={!fixed}
             onDragStart={event=>event.dataTransfer.setData("text/plain",item.id)}
             onDragOver={event=>{if(!fixed)event.preventDefault()}}
             onDrop={event=>{event.preventDefault();reorder(event.dataTransfer.getData("text/plain"),item.id)}}>
           {!fixed?<GripVertical size={16}/>:<ShoppingBag size={16}/>}
           <button type="button" onClick={()=>setActiveBlock(item.id)}><strong>{item.label}</strong><small>{item.subtitle}</small></button>
           <div className="bzdc-section-actions">{fixed?<span className="bzdc-fixed">Core</span>:<>
            <label className="bzdc-switch" title={"Show "+item.label}><input type="checkbox" checked={optional?.enabled??true} onChange={e=>applyLayout(homeSections.map(x=>x.id===item.id?{...x,enabled:e.target.checked}:x))}/><span/></label>
            <button type="button" aria-label={"Move "+item.label+" up"} disabled={position===0} onClick={()=>move(item.id,-1)}><ArrowUp size={14}/></button>
            <button type="button" aria-label={"Move "+item.label+" down"} disabled={position===homeSections.length-1} onClick={()=>move(item.id,1)}><ArrowDown size={14}/></button>
           </>}</div>
          </div>;
         })}
        </div>
        <button type="button" className="bzdc-btn bzdc-full" onClick={()=>applyLayout(parseHomeSections(HOME_SECTIONS_DEFAULT_JSON))}><RefreshCw size={15}/> Reset section order</button>
       </section>
       <section className="bzdc-panel bzdc-builder-editor"><div className="bzdc-panel-title"><div><h3>Edit section</h3><small>{useSections.find(x=>x.id===activeBlock)?.label}</small></div></div>
        {activeBlock==="hero"?<div className="bzdc-fields">
          {input("hero_title","Main heading",undefined,160)}
          {input("hero_subtitle","Subtitle",undefined,600,true)}
          {input("hero_cta_primary","Primary button label",undefined,50)}
          {input("hero_cta_secondary","Secondary button label",undefined,50)}
          {imageControl("hero_image_url","Desktop hero image")}
         </div>:activeBlock==="categories"?<div className="bzdc-fields">{input("categories_title","Category section title",undefined,120)}{input("categories_subtitle","Supporting text",undefined,240)}<p className="bzdc-help">Category products and symbols are populated from Bazunk's real categories. Their icon styling can be edited in Icons.</p><button type="button" className="bzdc-btn" onClick={()=>changeTab("icons")}>Edit category icon appearance <ChevronRight size={15}/></button></div>
         :activeBlock==="features"?<div className="bzdc-fields">{input("features_title","Feature section title",undefined,120)}{input("features_subtitle","Feature section introduction",undefined,240)}</div> :activeBlock==="perks"?<div className="bzdc-fields">{input("features_title","Benefits heading",undefined,120)}{input("features_subtitle","Benefits introduction",undefined,240)}<p className="bzdc-help">The individual benefit cards are currently generated by the storefront. Their text is not yet editable here. This section lets you edit the heading, introduction, ordering and visibility.</p></div>:activeBlock==="promos"?<div className="bzdc-fields"><p className="bzdc-help">Promotional cards are shortcuts to Bazunk shopping, flash sales, offers and rewards. Their visibility depends on existing feature settings; this editor currently controls the section order and visibility, not individual card text.</p><button type="button" className="bzdc-btn" onClick={()=>navigate("/admin/promotions")}>Open promotions management <ChevronRight size={15}/></button><button type="button" className="bzdc-btn" onClick={()=>navigate("/admin/feature-toggles")}>Open feature toggles <ChevronRight size={15}/></button></div>
         :activeBlock==="announcement"?<div className="bzdc-fields">{input("announcement_text","Announcement message",undefined,220)}<label className="bzdc-check"><input type="checkbox" checked={draft.announcement_enabled==="true"} onChange={e=>update("announcement_enabled",String(e.target.checked))}/> Show announcement banner</label></div>
         :<div className="bzdc-guidance"><Layers3 size={27}/><strong>{useSections.find(x=>x.id===activeBlock)?.label} uses live marketplace data</strong><p>Set its position and visibility in the left panel. Product content is taken from actual Bazunk listings and its existing administration screens.</p></div>}
       </section>
       {preview(true)}
      </div>}
      {tab==="header"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
        <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Header & Navigation</h3><small>Change what appears in your storefront header.</small></div></div>
         <div className="bzdc-fields">{imageControl("site_logo_url","Header logo")}{input("header_search_placeholder","Search field placeholder","The hint shoppers see inside the search field",100)}<p className="bzdc-help">The search, basket and account links stay available so customers can complete purchases. Change their icons individually from the Icons page.</p><button type="button" className="bzdc-btn" onClick={()=>changeTab("icons")}>Edit header icons <ChevronRight size={15}/></button></div>
        </section>
        <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Announcement bar</h3><small>Show a short message above the homepage sections.</small></div></div>
         <div className="bzdc-fields"><label className="bzdc-check"><input type="checkbox" checked={draft.announcement_enabled==="true"} onChange={e=>update("announcement_enabled",String(e.target.checked))}/> Show announcement</label>{input("announcement_text","Banner text",undefined,220)}
          <label className="bzdc-color">Banner colour <input type="color" value={draft.announcement_color} onChange={e=>update("announcement_color",e.target.value)}/></label></div>
        </section>
       </div>{preview()}</div>}
      {tab==="footer"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Footer text</h3><small>Storefront introduction and copyright.</small></div></div><div className="bzdc-fields">{input("footer_about","About Bazunk",undefined,800,true)}{input("footer_copyright","Copyright",undefined,160)}</div></section>
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Social links</h3><small>Paste public HTTPS social profile URLs; leave blank to hide.</small></div></div><div className="bzdc-fields">{input("footer_facebook","Facebook",undefined,220)}{input("footer_twitter","X / Twitter",undefined,220)}{input("footer_instagram","Instagram",undefined,220)}{input("footer_youtube","YouTube",undefined,220)}<button type="button" className="bzdc-btn" onClick={()=>changeTab("icons")}>Change social icons <ChevronRight size={15}/></button></div></section>
       </div>{preview()}</div>}
      {tab==="branding"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Site identity</h3><small>Update your brand name and description.</small></div></div><div className="bzdc-fields">{input("site_name","Store name",undefined,90)}{input("site_tagline","Site tagline",undefined,180)}</div></section>
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Logos & Images</h3><small>Choose uploaded assets for each location separately.</small></div></div><div className="bzdc-target-list">{imageTargets.map(target=>imageControl(target.key,target.title))}</div></section>
      </div>{preview()}</div>}
      {tab==="sitewide"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Global messages</h3><small>Edit wording already used across your actual website.</small></div></div><div className="bzdc-fields">
        {input("site_tagline","Marketplace tagline",undefined,180)}{input("announcement_text","Announcement text",undefined,220)}
        {input("header_search_placeholder","Search bar hint",undefined,100)}
        {input("categories_title","Categories heading",undefined,120)}{input("categories_subtitle","Categories introduction",undefined,240)}
        {input("features_title","Features heading",undefined,120)}{input("features_subtitle","Features introduction",undefined,240)}
       </div></section>
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Buttons & page wording</h3><small>Edit real homepage and footer labels, not payment or protection policies.</small></div></div>
        <div className="bzdc-fields">{input("hero_cta_primary","Primary button",undefined,50)}{input("hero_cta_secondary","Secondary button",undefined,50)}{input("footer_copyright","Copyright",undefined,160)}</div>
       </section>
      </div>{preview()}</div>}
      {tab==="icons"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Icons by location</h3><small>Choose each header or footer icon separately. Your draft updates the preview.</small></div></div>
        <div className="bzdc-icons-list">{ICON_PLACEMENTS.map(item=>{
         const Icon=iconForPlacement(icons,item.key);
         return <label key={item.key} className="bzdc-icon-row">
          <span className="bzdc-icon-preview"><Icon size={23}/></span><span><strong>{item.label}</strong><small>{item.area} · {item.key.replaceAll("_"," ")}</small></span>
          <select aria-label={"Icon for "+item.label} value={icons[item.key]} onChange={e=>setIcon(item.key,e.target.value as IconChoice)}>
           {Object.keys(ICON_CHOICES).map(choice=><option key={choice} value={choice}>{choice[0].toUpperCase()+choice.slice(1)}</option>)}
          </select>
         </label>
        })}</div><p className="bzdc-help">Icons keep their existing navigation actions. Footer icons display when their social URL is set.</p>
       </section>
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Homepage category icons</h3><small>Category and promotional tile icon styling uses the existing advanced editor.</small></div></div>
        <p className="bzdc-help">The advanced appearance editor manages category icon size, colour, badges and promotional tile icons in light and dark mode. It has its own independent Save control.</p>
        <button type="button" className="bzdc-btn" onClick={()=>navigate("/admin/design-advanced")}>Open category icon appearance editor <ExternalLink size={15}/></button>
       </section>
      </div>{preview()}</div>}
      {tab==="seo"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Homepage SEO & Metadata</h3><small>Edit the browser title, search description and social sharing image.</small></div></div><div className="bzdc-fields">
        {input("seo_title","SEO title","Recommended: about 50–60 characters",150)}
        {input("seo_description","SEO description","Recommended: about 140–160 characters",320,true)}
        {imageControl("seo_og_image_url","Open Graph image")}
       </div></section>
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Search result preview</h3><small>Illustration of the title and description search engines may display.</small></div></div>
        <div className="bzdc-search-preview"><span>https://www.bazunk.com</span><strong>{draft.seo_title||draft.site_name}</strong><p>{draft.seo_description}</p></div>
        <p className="bzdc-help">Search engines control the final snippet. This editor updates homepage metadata, not product-specific SEO.</p>
       </section>
      </div>{preview()}</div>}
      {tab==="media"&&mediaLibrary}
      {tab==="templates"&&<div className="bzdc-edit-grid"><div className="bzdc-stack">
       <section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Theme & component tools</h3><small>Advanced appearance settings without cluttering everyday editing.</small></div></div>
        <div className="bzdc-template-links"><button type="button" onClick={()=>navigate("/admin/design-advanced")}><Palette size={24}/><span><strong>Theme Gallery & Colours</strong><small>Advanced palettes, component styling and light/dark design checks</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>changeTab("branding")}><ImageIcon size={24}/><span><strong>Site branding</strong><small>Manage logos, favicons and main artwork</small></span><ChevronRight size={17}/></button>
        <button type="button" onClick={()=>changeTab("history")}><History size={24}/><span><strong>Version history</strong><small>Restore previous published content safely as a draft</small></span><ChevronRight size={17}/></button></div>
        <p className="bzdc-help">The advanced design editor has separate theme/component publishing controls; these are not part of the unified site-content draft.</p>
       </section>
       </div>{preview()}</div>}
      {tab==="history"&&<section className="bzdc-panel"><div className="bzdc-panel-title"><div><h3>Version History</h3><small>Restore an earlier published configuration into your draft. Publication always requires approval.</small></div></div>
       <div className="bzdc-history">{history.length===0?<div className="bzdc-empty"><History/><strong>No previous versions yet</strong><p>Each publication creates a restorable version.</p></div>:history.map(version=><div key={version.id} className="bzdc-history-row">
        <span className="bzdc-history-icon"><History size={19}/></span>
        <div><strong>{new Date(version.at).toLocaleString("en-GB")}</strong><small>{version.fields.site_name||"Bazunk"} · {version.fields.hero_title||"Earlier design"}</small></div>
        <button type="button" className="bzdc-btn" onClick={()=>{editVersion.current++;setDraft({...THEME_CENTER_DEFAULTS,...version.fields});setDirty(true);setAuto("Restored into draft");setNotice("Historical design loaded as a draft. Review before publishing.");changeTab("overview")}}>Restore to draft</button>
       </div>)}</div>
      </section>}
     </>}
    </main>
   </div>
  </div>
 </AdminLayout>;
}
