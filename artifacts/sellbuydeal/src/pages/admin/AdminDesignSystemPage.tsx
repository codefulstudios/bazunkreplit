import { useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { DESIGN_DEFAULTS, designSettingKey, parseDesignPalette } from "@/design-system/palette";
import { AdminLayout } from "./AdminLayout";
import { AdminComponentEditor } from "./AdminComponentEditor";
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
    light: { background:"#f8fafc",surface:"#ffffff",text:"#111827",secondaryText:"#374151",field:"#f1f5f9",action:"#1769ff",actionText:"#ffffff" },
    dark: { background:"#081220",surface:"#111f35",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827" },
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
   <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-extrabold text-slate-950 disabled:opacity-60">{saving?"Saving…":"Save Icons & Graphics"}</button><p role="status" className="font-semibold">{status}</p></div>
  </>}
 </div>;
}
export function AdminDesignSystemPage() {
  const [workspaceSection,setWorkspaceSection]=useState<"themes"|"preview"|"colours"|"components"|"content"|"history">("themes");
  const [designTab,setDesignTab]=useState<"colours"|"branding"|"homepage"|"footer"|"advertising"|"assets"|"sections">("colours");
  const [selectedPlatform,setSelectedPlatform]=useState<"admin"|"storefront"|"mobile">("admin");
  const [platformModes,setPlatformModes]=useState<Record<"admin"|"storefront"|"mobile",Mode>>({admin:"light",storefront:"light",mobile:"light"});
  const [previewPage,setPreviewPage]=useState<"home"|"listing"|"dealpilot"|"dashboard">("home");
  const desktopRef=useRef<HTMLIFrameElement>(null);
  const mobileRef=useRef<HTMLIFrameElement>(null);
  const [inspectMode,setInspectMode]=useState(false);
  const [picked,setPicked]=useState("");
  const [pickedSection,setPickedSection]=useState<DesignSection|undefined>(undefined);
  const [syncMobile,setSyncMobile]=useState(false);
  const [mobileSyncBusy,setMobileSyncBusy]=useState(false);
  const [area,setArea]=useState<Area>("admin");
  const [mode,setMode]=useState<Mode>("light");
  const [drafts,setDrafts]=useState(PRESETS);
  const [notice,setNotice]=useState("");
  const [activePreset,setActivePreset]=useState("Modern Blue");
  const [previewDevice,setPreviewDevice]=useState<"desktop"|"tablet"|"mobile">("desktop");
  const {authFetch}=useAdmin();
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [history,setHistory]=useState<Array<{at:string;area:Area;mode:Mode;palette:Palette}>>([]);
  const [autoStatus,setAutoStatus]=useState("Drafts save automatically");
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault()};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);
  useEffect(()=>{let live=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Settings unavailable");return r.json()}).then((values:Record<string,string>)=>{if(!live)return;setSyncMobile(values.design_mobile_inherit_web==="true");try{const h=JSON.parse(values.design_palette_history_v1||"[]");setHistory(Array.isArray(h)?h.slice(0,20):[])}catch{setHistory([])}const draftValue=(a:Area,m:Mode)=>values["design_draft_"+designSettingKey(a,m)]||values[designSettingKey(a,m)];setDrafts({mobile:{light:parseDesignPalette(draftValue("mobile","light"),"mobile","light"),dark:parseDesignPalette(draftValue("mobile","dark"),"mobile","dark")},storefront:{light:parseDesignPalette(draftValue("storefront","light"),"storefront","light"),dark:parseDesignPalette(draftValue("storefront","dark"),"storefront","dark")},admin:{light:parseDesignPalette(draftValue("admin","light"),"admin","light"),dark:parseDesignPalette(draftValue("admin","dark"),"admin","dark")},dealpilot:{light:parseDesignPalette(draftValue("dealpilot","light"),"dealpilot","light"),dark:parseDesignPalette(draftValue("dealpilot","dark"),"dealpilot","dark")}});}).catch(()=>{if(live)setNotice("Unable to load saved settings. Showing defaults.");});return()=>{live=false}},[authFetch]);
  useEffect(()=>{if(!dirty||!safe||saving||(area==="mobile"&&syncMobile))return;const timer=window.setTimeout(async()=>{try{const key="design_draft_"+designSettingKey(area,mode);const res=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:JSON.stringify(palette)})});if(!res.ok)throw Error("Draft was not saved");setAutoStatus("Draft saved automatically");setDirty(false)}catch{setAutoStatus("Autosave failed — use Save draft to retry")}},1100);return()=>window.clearTimeout(timer)},[dirty,area,mode,palette,safe,saving,syncMobile,authFetch]);
  async function saveDraft(){if(!safe||saving||(area==="mobile"&&syncMobile))return;setSaving(true);try{const key="design_draft_"+designSettingKey(area,mode);const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:JSON.stringify(palette)})});if(!r.ok){const details=await r.json().catch(()=>({}));throw Error(details.error||`Server rejected draft (HTTP ${r.status})`)}setNotice("Colour draft saved. Publish to apply these colours to the live site.");setDirty(false)}catch(err){setNotice(err instanceof Error?err.message:"Could not save the draft.")}finally{setSaving(false)}}
  async function publish(){if(!safe||saving||(area==="mobile"&&syncMobile)){setNotice("Disable mobile sync to edit mobile independently.");return;}setSaving(true);setNotice("");try{
    const response=await authFetch("/api/admin/settings");if(!response.ok)throw Error("Could not load current published settings");
    const current=await response.json() as Record<string,string>;
    const key=designSettingKey(area,mode);
    const previous=parseDesignPalette(current[key],area,mode);
    const entry={at:new Date().toISOString(),area,mode,palette:previous};
    const nextHistory=[entry,...history].slice(0,20);
    const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:JSON.stringify(palette),["design_draft_"+key]:"",design_palette_history_v1:JSON.stringify(nextHistory)})});
    if(!r.ok){const info=await r.json().catch(()=>({}));throw Error(info.error||"Publish rejected")}
    setHistory(nextHistory);window.dispatchEvent(new Event("bazunk-settings-updated"));setNotice("Published "+area+" / "+mode+". Previous version saved in History.");setDirty(false);
  }catch(e){setNotice(e instanceof Error?e.message:"Unable to publish design.")}finally{setSaving(false)}}
  const palette=drafts[area][mode];
  // Complete palettes, not just a button colour. Text/surface contrast is
  // checked by the existing WCAG guard before saving or publishing.
  const themePresets=[
    {name:"Modern Blue",color:"#1769ff",action:"#1459df",darkAction:"#1459df",tint:"#eaf2ff"},
    {name:"Ocean Teal",color:"#0d9488",action:"#0f766e",darkAction:"#0f766e",tint:"#e7f7f3"},
    {name:"Purple Pro",color:"#7c3aed",action:"#6d28d9",darkAction:"#6d28d9",tint:"#f2ebff"},
    {name:"Emerald Green",color:"#059669",action:"#047857",darkAction:"#047857",tint:"#e9f8f0"},
    {name:"Sunset Orange",color:"#ea580c",action:"#c2410c",darkAction:"#c2410c",tint:"#fff0e7"},
    {name:"Minimal Slate",color:"#475569",action:"#334155",darkAction:"#475569",tint:"#edf2f7"}
  ];
  function applyPreset(item:(typeof themePresets)[number]){
    const base=PRESETS[area][mode];
    const next:Palette=mode==="dark"
      ? {...base,background:"#081220",surface:"#111f35",field:"#21334b",text:"#f8fafc",secondaryText:"#cbd5e1",action:item.darkAction,actionText:"#ffffff"}
      : {...base,background:"#f5f8fd",surface:"#ffffff",field:item.tint,text:"#0f172a",secondaryText:"#475569",action:item.action,actionText:"#ffffff"};
    const nextChecks:Array<[string,string]> = [
      [next.text,next.background],[next.text,next.surface],[next.secondaryText,next.surface],
      [next.text,next.field],[next.actionText,next.action]
    ];
    if(nextChecks.some(([foreground,background])=>contrast(foreground,background)<4.5)){
      setNotice("This preset does not meet minimum text contrast and was not applied.");return;
    }
    setDrafts(p=>({...p,[area]:{...p[area],[mode]:next}}));
    setActivePreset(item.name);setDirty(true);
    setNotice(item.name+" "+mode+" palette applied to your draft. Nothing is published until you save.");
  }
  const sendPreview=()=>{
    for(const [frame,platform] of [[desktopRef.current,"storefront"],[mobileRef.current,"mobile"]] as const){
      if(!frame?.contentWindow)continue;
      const source=selectedPlatform==="admin"?"admin":platform==="mobile"&&syncMobile?"storefront":platform;
      const previewMode=selectedPlatform==="admin"?platformModes.admin:platform==="mobile"?platformModes.mobile:platformModes.storefront;
      const values=drafts[source][previewMode];
      frame.contentWindow.postMessage({type:"bazunk:design-preview",palette:values,mode:previewMode,select:inspectMode},window.location.origin);
    }
  };
  useEffect(()=>{sendPreview()},[drafts,platformModes,inspectMode,syncMobile,previewPage]);
  useEffect(()=>{const handler=(e:MessageEvent)=>{if(e.origin!==window.location.origin)return;if(e.data?.type==="bazunk:design-ready")sendPreview();if(e.data?.type==="bazunk:design-selected"){setPicked(String(e.data.label||"Component"));const match:Record<string,DesignSection>={"Category tiles":"home_categories","Spotlight":"home_spotlight","Promotions":"home_promos","Homepage hero":"home_hero"};setPickedSection(match[String(e.data.label)]);setDesignTab(match[String(e.data.label)]?"sections":"colours")}};window.addEventListener("message",handler);return()=>window.removeEventListener("message",handler)},[drafts,platformModes,inspectMode,syncMobile,previewPage]);
  const pageUrl=previewPage==="home"?"/":previewPage==="listing"?"/browse":previewPage==="dealpilot"?"/deal-pilot":"/admin/dashboard";
  const effectivePageUrl=selectedPlatform==="admin"?"/admin/dashboard":pageUrl;
  const previewUrl=effectivePageUrl+(effectivePageUrl.includes("?")?"&":"?")+"bzDesignPreview=1";
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
    <section className="mx-auto max-w-[1700px] rounded-xl bg-[#f5f8fd] p-3 text-slate-900 dark:bg-[#081220] dark:text-white sm:p-5" data-testid="protected-design-console">
     <div className="grid gap-5 lg:grid-cols-[225px_minmax(0,1fr)]">
      <aside aria-label="Design Center sections" className="min-w-0 self-start rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-[#172541] lg:sticky lg:top-4">
       <div className="border-b border-slate-200 px-3 pb-3 dark:border-slate-600"><strong className="text-base text-slate-950 dark:text-white">Design Center</strong><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Choose a task to edit</p></div>
       <nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {([{id:"themes",label:"Theme gallery",desc:"Choose a ready-made theme",icon:Palette},{id:"preview",label:"Live preview",desc:"View desktop and mobile",icon:Monitor},{id:"colours",label:"Colours",desc:"Adjust text and surfaces",icon:Sun},{id:"components",label:"Admin appearance",desc:"Fonts, cards and sidebar",icon:Type},{id:"content",label:"Pages & branding",desc:"Icons, homepage, footer",icon:LayoutGrid}] as const).map(item=><button key={item.id} type="button" aria-current={workspaceSection===item.id?"page":undefined} onClick={()=>{setWorkspaceSection(item.id);if(item.id==="colours")setDesignTab("colours");if(item.id==="content"&&designTab==="colours")setDesignTab("branding");if(item.id==="components")setSelectedPlatform("admin")}} className={"flex min-h-12 items-center gap-2 rounded-lg p-3 text-left text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 "+(workspaceSection===item.id?"bg-blue-600 text-white":"text-slate-800 hover:bg-blue-50 dark:text-white dark:hover:bg-[#304866]")}><item.icon className="h-4 w-4 shrink-0"/><span><span className="block">{item.label}</span><span className={"hidden text-xs font-medium lg:block "+(workspaceSection===item.id?"text-blue-50":"text-slate-600 dark:text-slate-300")}>{item.desc}</span></span></button>)}
       </nav>
      </aside>
      <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Design Center</h1><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Control Bazunk appearance across admin, web, and mobile.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setDrafts(p=>({...p,[area]:{...p[area],[mode]:PRESETS[area][mode]}}));setDirty(true)}} className="rounded-xl border border-slate-600 px-5 py-3 font-bold text-white">Reset</button><button type="button" disabled={!safe||saving||syncMobile&&selectedPlatform==="mobile"} onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-500 dark:bg-[#213a58] dark:text-white"><Save className="h-4 w-4"/>Save draft</button><span role="status" className="self-center text-xs font-semibold text-slate-700 dark:text-slate-200">{autoStatus}</span><button type="button" disabled={!safe||saving} onClick={publish} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-extrabold text-white disabled:opacity-50"><Rocket className="h-4 w-4"/>Publish</button></div>
      </div>
      {workspaceSection==="history"&&<section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-600 dark:bg-[#172541]"><h2 className="text-xl font-bold">Published palette history</h2><p className="my-2 text-sm text-slate-600 dark:text-slate-200">Restore a previous palette to a draft, review it, then select Publish. Other page settings are unaffected.</p>{history.length?history.map((h,i)=><div key={i} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-3 dark:border-slate-600"><span className="text-sm font-semibold">{h.area} · {h.mode} · {new Date(h.at).toLocaleString("en-GB")}</span><button type="button" onClick={()=>{setArea(h.area);setMode(h.mode);setSelectedPlatform(h.area==="mobile"?"mobile":h.area==="storefront"?"storefront":"admin");setDrafts(d=>({...d,[h.area]:{...d[h.area],[h.mode]:h.palette}}));setDirty(true);setWorkspaceSection("colours");setNotice("Historical palette loaded as a draft. Review it before publishing.")}} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-bold text-blue-700 dark:text-blue-200">Restore as draft</button></div>):<p className="text-sm">No published versions recorded yet. Future publishes will be saved here.</p>}</section>}
      <section aria-label="Theme gallery" className={(workspaceSection==="themes"?"":"hidden ")+"rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-[#111f35] dark:text-white"}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Theme Gallery</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose a coordinated theme for the selected platform and light or dark mode. Your selection remains a draft.</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">6 professionally matched presets</span></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{themePresets.map(item=><button key={item.name} type="button" onClick={()=>applyPreset(item)} aria-pressed={activePreset===item.name} aria-label={`Preview ${item.name} theme`} className={"group overflow-hidden rounded-2xl border-2 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-400 dark:bg-[#14243d] "+(activePreset===item.name?"border-blue-600 shadow-md":"border-slate-200 dark:border-slate-600")}>
          <div className="relative h-36 overflow-hidden bg-[#f4f7fc] p-3 dark:bg-[#0b1729]">
            <div className="flex h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-[#172942]">
              <div className="w-[25%] shrink-0 p-2" style={{background:item.color}}><div className="mb-3 h-2 w-3/4 rounded bg-white/90"/>{[1,2,3,4].map(x=><div key={x} className="mb-2 h-1.5 rounded bg-white/65"/>)}</div>
              <div className="min-w-0 flex-1 p-3"><div className="mb-3 flex justify-between"><div className="h-2 w-1/2 rounded bg-slate-300 dark:bg-slate-500"/><div className="h-4 w-4 rounded-full" style={{background:item.color}}/></div><div className="grid grid-cols-3 gap-2">{[1,2,3].map(x=><div key={x} className="h-8 rounded border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-[#253955]"/>)}</div><div className="mt-3 flex h-10 items-end gap-1">{[35,55,44,78,65,90,72,84].map((height,i)=><div key={i} className="flex-1 rounded-t" style={{height:height+"%",background:item.color,opacity:0.55+i*0.05}}/>)}</div></div>
            </div>
            {activePreset===item.name&&<span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white">Selected</span>}
          </div>
          <div className="flex items-center justify-between gap-2 p-4"><div><strong className="block text-sm text-slate-900 dark:text-white">{item.name}</strong><span className="mt-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Light and dark compatible</span></div><span className="h-7 w-7 rounded-full border-2 border-white shadow" style={{background:item.color}}/></div>
        </button>)}</div>
      </section>
      <div className={(workspaceSection==="themes"||workspaceSection==="preview"?"":"hidden ")+"grid gap-3 xl:grid-cols-4"}>
       {([{key:"admin",label:"Admin",subtitle:"Customize the admin dashboard.",icon:Monitor},{key:"storefront",label:"Frontend Web",subtitle:"Customize your public website.",icon:Globe},{key:"mobile",label:"Frontend Mobile",subtitle:"Customize the mobile experience.",icon:Smartphone}] as const).map(p=><div key={p.key} className={"rounded-xl border bg-[#17243a] p-4 "+(selectedPlatform===p.key?"border-blue-500":"border-slate-700")}>
        <button type="button" onClick={()=>selectPlatform(p.key)} className="flex items-center gap-3 text-left text-white"><span className="rounded-lg bg-blue-600 p-2"><p.icon className="h-6 w-6"/></span><span><strong className="block text-sm">{p.label}</strong><span className="text-xs text-slate-200">{p.subtitle}</span></span></button>
        <div className="mt-4 flex gap-2">{(["light","dark"] as const).map(m=><button key={m} type="button" onClick={()=>selectMode(m,p.key)} className={"flex flex-1 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold "+(platformModes[p.key]===m?"border-blue-500 bg-blue-900 text-white":"border-slate-600 text-slate-200")}>{m==="light"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}{m==="light"?"Light":"Dark"}</button>)}</div>
       </div>)}
       <label className="flex flex-col justify-between rounded-xl border border-slate-700 bg-[#17243a] p-4 text-white"><span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-bold"><Link2 className="h-5 w-5"/>Apply frontend web changes to mobile too</span><input type="checkbox" aria-label="Apply web changes to mobile" checked={syncMobile} disabled={mobileSyncBusy} onChange={e=>void setInheritance(e.target.checked)} className="h-5 w-5 accent-blue-500"/></span><span className="mt-3 text-xs text-slate-200">When enabled, mobile inherits web colours. Mobile-only layout adjustments remain independent.</span></label>
      </div>
      <div className={(workspaceSection==="preview"||workspaceSection==="colours"||workspaceSection==="content"?"":"hidden ")+"grid gap-4 lg:grid-cols-[255px_minmax(0,1fr)]"}>
       <div className="space-y-3">
        <nav aria-label="Design editing categories" className="overflow-hidden rounded-xl border border-slate-700 bg-[#17243a]">{([{key:"colours",label:"Colors",description:"Brand colors, backgrounds, text",icon:Palette},{key:"assets",label:"Icons & Graphics",description:"Category icons, logos, illustrations",icon:ImageIcon},{key:"branding",label:"Typography & Branding",description:"Fonts, names, SEO",icon:Type},{key:"sections",label:"Layout & Homepage Sections",description:"Hero, categories, deals, banners",icon:LayoutGrid},{key:"homepage",label:"Homepage Content",description:"Headings and announcements",icon:PanelsTopLeft},{key:"footer",label:"Footer",description:"Links and footer copy",icon:Menu},{key:"advertising",label:"Advertising",description:"Ad visibility and locations",icon:Globe}] as const).map(item=><button type="button" key={item.key} onClick={()=>setDesignTab(item.key)} className={"flex w-full items-center gap-3 border-b border-slate-700 p-3 text-left text-sm "+(designTab===item.key?"bg-blue-700 text-white":"text-slate-100 hover:bg-slate-700")}><item.icon className="h-5 w-5 shrink-0"/><span><strong className="block">{item.label}</strong><span className="text-xs opacity-90">{item.description}</span></span><span className="ml-auto">›</span></button>)}</nav>
        <div className="rounded-xl border border-slate-700 bg-[#17243a] p-4 text-sm text-slate-200"><strong className="mb-2 block text-white">Design Sync & Inheritance</strong>Mobile follows web appearance only when sync is enabled. Turn it off for independent mobile colours.</div>
       </div>
       <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900 bg-[#13294b] p-4 text-white"><div><span className="text-xs text-slate-300">You are editing</span><div className="font-extrabold">{selectedPlatform==="storefront"?"Frontend Web":selectedPlatform==="mobile"?"Frontend Mobile":"Admin"} · {mode==="dark"?"Dark":"Light"} Mode · {previewPage==="home"?"Homepage":previewPage==="listing"?"Listings":previewPage==="dealpilot"?"DealPilot":"Admin Dashboard"}</div></div><label className="text-xs font-semibold">Preview page <select aria-label="Preview page" value={previewPage} onChange={e=>setPreviewPage(e.target.value as typeof previewPage)} className="ml-2 rounded-lg border border-slate-500 bg-[#182b49] p-2 text-white"><option value="home">Homepage</option><option value="listing">Listing Page</option><option value="dealpilot">DealPilot</option><option value="dashboard">Admin Dashboard</option></select></label></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm font-bold text-white"><input type="checkbox" checked={inspectMode} onChange={e=>setInspectMode(e.target.checked)} className="h-5 w-5 accent-blue-500"/> Select elements directly in preview</label><span className="text-xs text-slate-200">{picked?"Selected: "+picked+" · adjust controls below":"Changes to shared colours update previews before saving"}</span></div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Live device preview</strong><div className="flex gap-1">{(["desktop","tablet","mobile"] as const).map(device=><button type="button" key={device} onClick={()=>setPreviewDevice(device)} aria-pressed={previewDevice===device} className={"rounded-lg px-3 py-2 text-xs font-bold capitalize "+(previewDevice===device?"bg-blue-600 text-white":"border border-slate-500 text-slate-700 dark:text-white")}>{device}</button>)}</div></div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_225px]">
         <div className="min-w-0 rounded-xl border border-slate-700 bg-[#17243a] p-3"><div className="mb-2 text-xs font-bold text-slate-100">Desktop Preview</div><iframe title="Desktop website preview" ref={desktopRef} onLoad={sendPreview} loading="lazy" src={previewUrl} className={"h-[390px] rounded-lg border border-slate-600 bg-white transition-all "+(previewDevice==="mobile"?"mx-auto block w-[375px] max-w-full":previewDevice==="tablet"?"mx-auto block w-[768px] max-w-full":"w-full")} style={{colorScheme:mode}}/></div>
         <div className="rounded-xl border border-slate-700 bg-[#17243a] p-3"><div className="mb-2 text-xs font-bold text-slate-100">Mobile Preview</div><div className="mx-auto max-w-[205px] rounded-[24px] border-[5px] border-slate-900 bg-slate-900 p-1 shadow-xl"><iframe title="Mobile website preview" ref={mobileRef} onLoad={sendPreview} loading="lazy" src={previewUrl} className="h-[365px] w-full rounded-[18px] bg-white" style={{colorScheme:platformModes.mobile}}/></div></div>
        </div>
        <p className="text-xs font-medium text-slate-300">Live colour drafts are applied only inside these preview frames. Selecting an element identifies it; the matching editor below controls publishing. <a href={effectivePageUrl} target="_blank" rel="noopener noreferrer" className="underline">Open page ↗</a></p>
       </div>
      </div>
      {workspaceSection==="components" && <AdminComponentEditor />}
      <div className={(workspaceSection==="colours"||workspaceSection==="content"?"":"hidden ")+"rounded-xl border border-slate-700 bg-[#101c33] p-4"}><h2 className="mb-3 text-lg font-extrabold text-white">Edit selected design settings</h2>
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

        </div>
      </div>
      </>}
      </div>
      </div>
     </div>
    </section>
  </AdminLayout>;
}
