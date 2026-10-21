import { useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { DESIGN_DEFAULTS, designSettingKey, parseDesignPalette } from "@/design-system/palette";
import { AdminLayout } from "./AdminLayout";
import { AdminSettingsPage } from "./AdminSettingsPage";
import { IconAppearanceEditor } from "./IconAppearanceEditor";
import {DesignTargetGuide,type DesignTarget} from "./DesignTargetGuide";
import { DesignSectionsEditor } from "./DesignSectionsEditor";
import type {DesignSection} from "@/design-system/sectionAppearance";
import { ShieldCheck, Copy, RotateCcw, Globe, Monitor, Moon, Sun, PanelsTopLeft, ExternalLink, Save, Rocket, Palette, Type, LayoutGrid, Menu, Link2, Image as ImageIcon, Smartphone, Shirt, Gamepad2, Armchair, Dumbbell, BookOpen, Gem, CarFront, Package } from "lucide-react";

// Deliberately isolated: these settings render only inside the preview.
// Publishing requires a validated, authenticated server-side settings endpoint.
type Mode = "light" | "dark";
type Area = "storefront" | "admin" | "dealpilot" | "mobile";
type Palette = { background: string; surface: string; text: string; secondaryText: string; field: string; action: string; actionText: string };
const PRESETS: Record<Area, Record<Mode, Palette>> = {
  mobile: DESIGN_DEFAULTS.storefront,
  dealpilot: DESIGN_DEFAULTS.dealpilot,
  storefront: {
    light: { background:"#f8fafc",surface:"#ffffff",text:"#111827",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827" },
    dark: { background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827" },
  },
  admin: {
    light: { background:"#f3f6fc",surface:"#ffffff",text:"#152345",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827" },
    dark: { background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827" },
  },
};
const LABELS: Record<keyof Palette,string> = { background:"Page background",surface:"Card surface",text:"Main text",secondaryText:"Secondary text",field:"Dropdown / field",action:"Primary button",actionText:"Button text" };
function luminance(hex: string): number {
  const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a:string,b:string): number {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const ICONS = {smartphone:Smartphone,shirt:Shirt,gaming:Gamepad2,home:Armchair,sports:Dumbbell,books:BookOpen,collectibles:Gem,automotive:CarFront,package:Package};
const DESIGN_CATEGORIES = ["electronics","fashion","gaming","home","sports","books","collectibles","automotive"] as const;
function DesignAssetsEditor() {
 const {authFetch}=useAdmin();
 const [items,setItems]=useState<Record<string,string>>({});
 const [saving,setSaving]=useState(false);
 const [status,setStatus]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Could not load");return r.json()}).then((data:Record<string,string>)=>{if(active)setItems(data)}).catch(()=>{if(active)setStatus("Could not load saved graphics settings.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[authFetch]);
 function change(key:string,value:string){setItems(p=>({...p,[key]:value}));setStatus("Unsaved changes");}
 async function save(){setSaving(true);setStatus("");try{
  const keys=["design_hero_image_url","design_hero_image_alt",...DESIGN_CATEGORIES.map(c=>"design_category_icon_"+c)];
  const updates=Object.fromEntries(keys.map(k=>[k,items[k]||""]));
  const response=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify(updates)});
  if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.error||"Save failed");}
  window.dispatchEvent(new Event("bazunk-settings-updated"));setStatus("Graphics and icons saved successfully.");
 }catch(e){setStatus(e instanceof Error?e.message:"Could not save assets.")}finally{setSaving(false)}}
 return <div className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
  <DesignTargetGuide target="assets" />
  <div className="flex items-center gap-2"><ImageIcon className="h-6 w-6"/><h2 className="text-xl font-extrabold">Choose category icons and hero graphic</h2></div>
  <p className="text-sm font-semibold">Step 1: choose individual category icons. Step 2: optionally add a homepage graphic. More detailed icon colours and sizes are in Icon appearance below. Choose approved category icons and an optional HTTPS homepage hero graphic (PNG, JPEG or WebP). Files must be hosted online; direct uploads are not enabled yet.</p>
  {loading?<p>Loading appearance settings…</p>:<>
   <h3 className="text-base font-extrabold">1. Individual category symbols · <a href="/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline dark:text-blue-300">View on homepage ↗</a></h3>
   <div className="grid gap-4 md:grid-cols-2">{DESIGN_CATEGORIES.map(category=>{
    const value=items["design_category_icon_"+category]||category;
    const Icon=ICONS[value as keyof typeof ICONS]||Package;
    return <label key={category} className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 p-3 dark:border-slate-500">
      <span className="flex items-center gap-2 font-bold capitalize"><Icon className="h-6 w-6"/>{category}</span>
      <select aria-label={category+" icon"} value={value} onChange={e=>change("design_category_icon_"+category,e.target.value)} className="max-w-[55%] rounded-lg border border-slate-400 bg-white p-2 text-slate-950 dark:bg-slate-800 dark:text-white">
      {Object.keys(ICONS).map(name=><option key={name} value={name}>{name}</option>)}</select>
    </label>
   })}</div>
   <h3 className="text-base font-extrabold">2. Optional homepage graphic</h3>
   <label className="block text-sm font-bold">Homepage hero graphic URL
    <input type="url" value={items.design_hero_image_url||""} onChange={e=>change("design_hero_image_url",e.target.value)} placeholder="https://example.com/hero.webp" className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950 dark:bg-slate-800 dark:text-white"/>
   </label>
   <label className="block text-sm font-bold">Hero graphic description (alt text)
    <input value={items.design_hero_image_alt||""} onChange={e=>change("design_hero_image_alt",e.target.value)} maxLength={150} placeholder="Description of the image" className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950 dark:bg-slate-800 dark:text-white"/>
   </label>
   {items.design_hero_image_url&&/^https:\/\//.test(items.design_hero_image_url)&&<p className="text-sm font-bold">Hero image will be displayed only after saving a valid HTTPS image URL.</p>}
   <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-orange-300 px-6 py-3 font-extrabold text-slate-950 disabled:opacity-60">{saving?"Saving…":"Save Icons & Graphics"}</button><p role="status" className="font-semibold">{status}</p></div>
  </>}
 </div>;
}
export function AdminDesignSystemPage() {
  const [designTab,setDesignTab]=useState<"colours"|"branding"|"homepage"|"footer"|"advertising"|"assets"|"sections">("colours");
  const [selectedPlatform,setSelectedPlatform]=useState<"admin"|"storefront"|"mobile">("storefront");
  const [platformModes,setPlatformModes]=useState<Record<"admin"|"storefront"|"mobile",Mode>>({admin:"dark",storefront:"dark",mobile:"dark"});
  const [previewPage,setPreviewPage]=useState<"home"|"listing"|"dealpilot"|"dashboard">("home");
  const desktopRef=useRef<HTMLIFrameElement>(null);
  const mobileRef=useRef<HTMLIFrameElement>(null);
  const [inspectMode,setInspectMode]=useState(false);
  const [picked,setPicked]=useState("");
  const [pickedSection,setPickedSection]=useState<DesignSection|undefined>(undefined);
  const [syncMobile,setSyncMobile]=useState(false);
  const [mobileSyncBusy,setMobileSyncBusy]=useState(false);
  const [area,setArea]=useState<Area>("storefront");
  const [mode,setMode]=useState<Mode>("light");
  const [drafts,setDrafts]=useState(PRESETS);
  const [notice,setNotice]=useState("");
  const {authFetch}=useAdmin();
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{let live=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Settings unavailable");return r.json()}).then((values:Record<string,string>)=>{if(!live)return;setSyncMobile(values.design_mobile_inherit_web==="true");setDrafts({mobile:{light:parseDesignPalette(values[designSettingKey("mobile","light")],"mobile","light"),dark:parseDesignPalette(values[designSettingKey("mobile","dark")],"mobile","dark")},storefront:{light:parseDesignPalette(values[designSettingKey("storefront","light")],"storefront","light"),dark:parseDesignPalette(values[designSettingKey("storefront","dark")],"storefront","dark")},admin:{light:parseDesignPalette(values[designSettingKey("admin","light")],"admin","light"),dark:parseDesignPalette(values[designSettingKey("admin","dark")],"admin","dark")},dealpilot:{light:parseDesignPalette(values[designSettingKey("dealpilot","light")],"dealpilot","light"),dark:parseDesignPalette(values[designSettingKey("dealpilot","dark")],"dealpilot","dark")}});}).catch(()=>{if(live)setNotice("Unable to load saved settings. Showing defaults.");});return()=>{live=false}},[authFetch]);
  async function publish(){if(!safe||saving||(area==="mobile"&&syncMobile)){setNotice("Disable mobile sync to edit mobile independently.");return;}setSaving(true);setNotice("");try{const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[designSettingKey(area,mode)]:JSON.stringify(palette)})});if(!r.ok)throw Error("Save rejected");window.dispatchEvent(new Event("bazunk-settings-updated"));setNotice("Changes saved successfully for "+area+" / "+mode+".");setDirty(false);}catch{setNotice("Unable to publish palette. No confirmation from server.");}finally{setSaving(false)}}
  const palette=drafts[area][mode];
  const sendPreview=()=>{
    for(const [frame,platform] of [[desktopRef.current,"storefront"],[mobileRef.current,"mobile"]] as const){
      if(!frame?.contentWindow)continue;
      const source=platform==="mobile"&&syncMobile?"storefront":platform;
      const previewMode=platform==="mobile"?platformModes.mobile:platformModes.storefront;
      const values=drafts[source][previewMode];
      frame.contentWindow.postMessage({type:"bazunk:design-preview",palette:values,mode:previewMode,select:inspectMode},window.location.origin);
    }
  };
  useEffect(()=>{sendPreview()},[drafts,platformModes,inspectMode,syncMobile,previewPage]);
  useEffect(()=>{const handler=(e:MessageEvent)=>{if(e.origin!==window.location.origin)return;if(e.data?.type==="bazunk:design-ready")sendPreview();if(e.data?.type==="bazunk:design-selected"){setPicked(String(e.data.label||"Component"));const match:Record<string,DesignSection>={"Category tiles":"home_categories","Spotlight":"home_spotlight","Promotions":"home_promos","Homepage hero":"home_hero"};setPickedSection(match[String(e.data.label)]);setDesignTab(match[String(e.data.label)]?"sections":"colours")}};window.addEventListener("message",handler);return()=>window.removeEventListener("message",handler)},[drafts,platformModes,inspectMode,syncMobile,previewPage]);
  const pageUrl=previewPage==="home"?"/":previewPage==="listing"?"/browse":previewPage==="dealpilot"?"/deal-pilot":"/admin/dashboard";
  const previewUrl=pageUrl+(pageUrl.includes("?")?"&":"?")+"bzDesignPreview=1";
  function selectPlatform(next:"admin"|"storefront"|"mobile"){setSelectedPlatform(next);setArea(next);setMode(platformModes[next]);}
  function selectMode(next:Mode,platform:"admin"|"storefront"|"mobile"){setPlatformModes(p=>({...p,[platform]:next}));setSelectedPlatform(platform);setArea(platform);setMode(next);}
  async function setInheritance(next:boolean){setMobileSyncBusy(true);try{const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({design_mobile_inherit_web:next?"true":"false"})});if(!r.ok)throw Error();setSyncMobile(next);setNotice(next?"Mobile now follows web theme colours.":"Mobile theme colours can now be edited separately.");window.dispatchEvent(new Event("bazunk-settings-updated"));}catch{setNotice("Unable to save mobile synchronization preference.");}finally{setMobileSyncBusy(false)}}
  const checks=useMemo(()=>[
    ["Main text / page",palette.text,palette.background],
    ["Main text / card",palette.text,palette.surface],
    ["Secondary text / card",palette.secondaryText,palette.surface],
    ["Main text / dropdown",palette.text,palette.field],
    ["Button label",palette.actionText,palette.action],
  ].map(([label,fg,bg])=>({label,ratio:contrast(fg,bg),pass:contrast(fg,bg)>=4.5})),[palette]);
  const safe=checks.every(x=>x.pass);
  function change(key:keyof Palette,value:string) {
    setDrafts(p=>({...p,[area]:{...p[area],[mode]:{...p[area][mode],[key]:value}}}));
    setNotice("");setDirty(true);
  }
  async function copy() {
    if(!safe){setNotice("Cannot export: fix all contrast warnings first.");return;}
    try {await navigator.clipboard.writeText(JSON.stringify({area,mode,palette},null,2));setNotice("Validated configuration copied.");}
    catch {setNotice("Clipboard unavailable. No changes were published.");}
  }
  return <AdminLayout>
    <section className="mx-auto max-w-[1600px] space-y-5 rounded-xl bg-[#0b1427] p-5 text-white" data-testid="protected-design-console">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-black tracking-tight text-white">Design Center</h1><p className="mt-1 text-sm font-medium text-slate-300">Control Bazunk appearance across admin, web, and mobile.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setDrafts(p=>({...p,[area]:{...p[area],[mode]:PRESETS[area][mode]}}));setDirty(true)}} className="rounded-xl border border-slate-600 px-5 py-3 font-bold text-white">Reset</button><button type="button" disabled={!safe||saving||syncMobile&&selectedPlatform==="mobile"} onClick={publish} className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-5 py-3 font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>Save changes</button><button type="button" disabled={!safe||saving} onClick={publish} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-extrabold text-white disabled:opacity-50"><Rocket className="h-4 w-4"/>Publish</button></div>
      </div>
      <div className="grid gap-3 xl:grid-cols-4">
       {([{key:"admin",label:"Admin",subtitle:"Customize the admin dashboard.",icon:Monitor},{key:"storefront",label:"Frontend Web",subtitle:"Customize your public website.",icon:Globe},{key:"mobile",label:"Frontend Mobile",subtitle:"Customize the mobile experience.",icon:Smartphone}] as const).map(p=><div key={p.key} className={"rounded-xl border bg-[#17243a] p-4 "+(selectedPlatform===p.key?"border-blue-500":"border-slate-700")}>
        <button type="button" onClick={()=>selectPlatform(p.key)} className="flex items-center gap-3 text-left text-white"><span className="rounded-lg bg-blue-600 p-2"><p.icon className="h-6 w-6"/></span><span><strong className="block text-sm">{p.label}</strong><span className="text-xs text-slate-200">{p.subtitle}</span></span></button>
        <div className="mt-4 flex gap-2">{(["light","dark"] as const).map(m=><button key={m} type="button" onClick={()=>selectMode(m,p.key)} className={"flex flex-1 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold "+(platformModes[p.key]===m?"border-blue-500 bg-blue-900 text-white":"border-slate-600 text-slate-200")}>{m==="light"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}{m==="light"?"Light":"Dark"}</button>)}</div>
       </div>)}
       <label className="flex flex-col justify-between rounded-xl border border-slate-700 bg-[#17243a] p-4 text-white"><span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-bold"><Link2 className="h-5 w-5"/>Apply frontend web changes to mobile too</span><input type="checkbox" aria-label="Apply web changes to mobile" checked={syncMobile} disabled={mobileSyncBusy} onChange={e=>void setInheritance(e.target.checked)} className="h-5 w-5 accent-blue-500"/></span><span className="mt-3 text-xs text-slate-200">When enabled, mobile inherits web colours. Mobile-only layout adjustments remain independent.</span></label>
      </div>
      <div className="grid gap-4 lg:grid-cols-[255px_minmax(0,1fr)]">
       <div className="space-y-3">
        <nav aria-label="Design editing categories" className="overflow-hidden rounded-xl border border-slate-700 bg-[#17243a]">{([{key:"colours",label:"Colors",description:"Brand colors, backgrounds, text",icon:Palette},{key:"assets",label:"Icons & Graphics",description:"Category icons, logos, illustrations",icon:ImageIcon},{key:"branding",label:"Typography & Branding",description:"Fonts, names, SEO",icon:Type},{key:"sections",label:"Layout & Homepage Sections",description:"Hero, categories, deals, banners",icon:LayoutGrid},{key:"homepage",label:"Homepage Content",description:"Headings and announcements",icon:PanelsTopLeft},{key:"footer",label:"Footer",description:"Links and footer copy",icon:Menu},{key:"advertising",label:"Advertising",description:"Ad visibility and locations",icon:Globe}] as const).map(item=><button type="button" key={item.key} onClick={()=>setDesignTab(item.key)} className={"flex w-full items-center gap-3 border-b border-slate-700 p-3 text-left text-sm "+(designTab===item.key?"bg-blue-700 text-white":"text-slate-100 hover:bg-slate-700")}><item.icon className="h-5 w-5 shrink-0"/><span><strong className="block">{item.label}</strong><span className="text-xs opacity-90">{item.description}</span></span><span className="ml-auto">›</span></button>)}</nav>
        <div className="rounded-xl border border-slate-700 bg-[#17243a] p-4 text-sm text-slate-200"><strong className="mb-2 block text-white">Design Sync & Inheritance</strong>Mobile follows web appearance only when sync is enabled. Turn it off for independent mobile colours.</div>
       </div>
       <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900 bg-[#13294b] p-4 text-white"><div><span className="text-xs text-slate-300">You are editing</span><div className="font-extrabold">{selectedPlatform==="storefront"?"Frontend Web":selectedPlatform==="mobile"?"Frontend Mobile":"Admin"} · {mode==="dark"?"Dark":"Light"} Mode · {previewPage==="home"?"Homepage":previewPage==="listing"?"Listings":previewPage==="dealpilot"?"DealPilot":"Admin Dashboard"}</div></div><label className="text-xs font-semibold">Preview page <select aria-label="Preview page" value={previewPage} onChange={e=>setPreviewPage(e.target.value as typeof previewPage)} className="ml-2 rounded-lg border border-slate-500 bg-[#182b49] p-2 text-white"><option value="home">Homepage</option><option value="listing">Listing Page</option><option value="dealpilot">DealPilot</option><option value="dashboard">Admin Dashboard</option></select></label></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm font-bold text-white"><input type="checkbox" checked={inspectMode} onChange={e=>setInspectMode(e.target.checked)} className="h-5 w-5 accent-blue-500"/> Select elements directly in preview</label><span className="text-xs text-slate-200">{picked?"Selected: "+picked:"Changes to shared colours update previews before saving"}</span></div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_225px]">
         <div className="min-w-0 rounded-xl border border-slate-700 bg-[#17243a] p-3"><div className="mb-2 text-xs font-bold text-slate-100">Desktop Preview</div><iframe title="Desktop website preview" ref={desktopRef} onLoad={sendPreview} loading="lazy" src={previewUrl} className="h-[390px] w-full rounded-lg border border-slate-600 bg-white" style={{colorScheme:mode}}/></div>
         <div className="rounded-xl border border-slate-700 bg-[#17243a] p-3"><div className="mb-2 text-xs font-bold text-slate-100">Mobile Preview</div><div className="mx-auto max-w-[205px] rounded-[24px] border-[5px] border-slate-900 bg-slate-900 p-1 shadow-xl"><iframe title="Mobile website preview" ref={mobileRef} onLoad={sendPreview} loading="lazy" src={previewUrl} className="h-[365px] w-full rounded-[18px] bg-white" style={{colorScheme:platformModes.mobile}}/></div></div>
        </div>
        <p className="text-xs font-medium text-slate-300">Live colour drafts are applied only inside these preview frames. Selecting an element identifies it; the matching editor below controls publishing. <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="underline">Open page ↗</a></p>
       </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-[#101c33] p-4"><h2 className="mb-3 text-lg font-extrabold text-white">Edit selected design settings</h2>
      {designTab==="assets" && <><DesignAssetsEditor /><IconAppearanceEditor /></>}
      {designTab==="sections" && <DesignSectionsEditor selectedSection={pickedSection} />}
      {designTab!=="colours"&&designTab!=="assets"&&designTab!=="sections"&&<DesignTargetGuide target={designTab as DesignTarget}/>}
      {designTab!=="colours"&&designTab!=="assets"&&designTab!=="sections"&&<AdminSettingsPage key={designTab} embedded initialTab={designTab}/>}
      {designTab==="colours"&&<><DesignTargetGuide target="colours" override={{title:area==="admin"?"Admin shared colours":area==="dealpilot"?"DealPilot shared colours":"Storefront shared colours",description:"Editing "+area+" / "+mode+". Changes apply to shared colour tokens for that area and selected theme.",url:area==="admin"?"/admin/dashboard":area==="dealpilot"?"/deal-pilot":"/",coverage:"Shared "+area+" components only. Specific homepage section and icon settings may take precedence."}}/>
      <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
        <div className="flex flex-wrap items-center gap-3"><ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400"/><h1 className="text-2xl font-bold">Protected Design System</h1></div>
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-100">Preview changes first, then publish them to the chosen area and theme. Contrast protection cannot be switched off.</p>
        <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">Selected platform: {area==="storefront"?"Frontend Web":area==="mobile"?"Frontend Mobile":area==="admin"?"Admin":"DealPilot"} · {mode==="dark"?"Dark":"Light"} mode. Use the platform cards above to switch.</p>
      </div>
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-orange-500 bg-white p-3 shadow-lg dark:bg-[#17243a]" data-testid="design-save-bar">
        <div className="min-w-0"><p className="font-extrabold text-slate-950 dark:text-white">{dirty?"Unsaved design changes":"Design settings"}</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{safe?"Contrast checks passed — safe to save.":"Contrast check failed — adjust colours before saving."}</p></div>
        <button type="button" onClick={publish} disabled={!safe || saving || area==="mobile"&&syncMobile} aria-label="Save design changes" className="min-h-12 rounded-xl border-2 border-orange-700 bg-orange-400 px-6 py-3 text-base font-extrabold text-slate-950 shadow-sm hover:bg-orange-300 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-300 disabled:text-slate-800">{saving?"Saving…":"Save Changes"}</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
          <h2 className="text-lg font-bold">Colour editor</h2>
          <p className="my-2 text-sm font-medium text-slate-700 dark:text-slate-100">Each colour belongs to this preview only.</p>
          <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(LABELS) as (keyof Palette)[]).map(key=><label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 p-3 text-sm font-semibold dark:border-slate-600"><span>{LABELS[key]}</span><input aria-label={LABELS[key]+" colour"} type="color" value={palette[key]} onChange={e=>change(key,e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-slate-500" /></label>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={()=>{setDrafts(p=>({...p,[area]:{...p[area],[mode]:{...PRESETS[area][mode]}}}));setNotice("Preview reset to protected defaults.");}} className="inline-flex items-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 dark:bg-slate-800 dark:text-white"><RotateCcw className="h-4 w-4"/>Reset preview</button>
            <button type="button" disabled={!safe || saving || area==="mobile"&&syncMobile} onClick={publish} className="rounded-lg bg-orange-300 px-4 py-2 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700">{saving?"Saving…":"Save Changes"}</button>
            <button type="button" disabled={!safe} onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-orange-300 px-4 py-2 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"><Copy className="h-4 w-4"/>Copy validated draft</button>
          </div>
          {notice&&<p role="status" className="mt-3 text-sm font-bold">{notice}</p>}
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-400" style={{background:palette.background,color:palette.text}}>
            <div className="p-5"><h2 className="text-xl font-bold">Live preview: {area} / {mode}</h2><p className="mt-1 text-sm font-medium" style={{color:palette.secondaryText}}>Readable copy, clear controls and strong contrast.</p>
              <div className="mt-4 space-y-3 rounded-xl border border-current p-4" style={{background:palette.surface}}>
                <h3 className="font-bold">Sample card and form</h3>
                <label className="block text-sm font-semibold">Select a category<select defaultValue="electronics" key={area+mode} style={{background:palette.field,color:palette.text}} className="mt-1 block w-full rounded-lg border border-current p-3"><option value="electronics">Electronics</option><option value="fashion">Fashion</option></select></label>
                <label className="block text-sm font-semibold">Listing title<input placeholder="Example listing" style={{background:palette.field,color:palette.text}} className="mt-1 block w-full rounded-lg border border-current p-3 placeholder:opacity-70" /></label>
                <button type="button" style={{background:palette.action,color:palette.actionText}} className="rounded-lg px-5 py-3 font-bold">Preview button</button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
            <h2 className="text-lg font-bold">Protected accessibility checks</h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">Required contrast ratio: 4.5:1 or higher.</p>
            <ul className="mt-3 space-y-2">{checks.map(c=><li key={c.label} className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold"><span>{c.label}</span><span className={c.pass?"text-emerald-700 dark:text-emerald-300":"text-red-700 dark:text-red-300"}>{c.pass?"PASS":"FAIL"} — {c.ratio.toFixed(2)}:1</span></li>)}</ul>
            <p role="status" className="mt-4 font-bold">{safe?"All preview checks pass.":"Unsafe draft: export disabled until contrast is fixed."}</p>
          </div>
        </div>
      </div>
      </>}
      </div>
    </section>
  </AdminLayout>;
}
