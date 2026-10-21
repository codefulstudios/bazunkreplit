import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
type Setting={font:string;heading:number;body:number;sidebar:number;density:"compact"|"comfortable"|"spacious";radius:number;button:"rounded"|"pill"|"square";shadow:"none"|"soft"|"medium";header:"solid"|"transparent";sidebarStyle:"solid"|"bordered";stickyHeader:boolean};
export const DEFAULT_COMPONENT_STYLE:Setting={font:"Inter",heading:30,body:14,sidebar:238,density:"comfortable",radius:12,button:"rounded",shadow:"soft",header:"solid",sidebarStyle:"solid",stickyHeader:true};
const KEY="design_admin_components_v1";
function valid(x:unknown):Setting{const v=(x&&typeof x==="object"?x:{}) as Partial<Setting>;return {
font:["Inter","Arial","system-ui","Georgia"].includes(v.font||"")?v.font!:DEFAULT_COMPONENT_STYLE.font,
heading:Math.max(24,Math.min(40,Number(v.heading)||30)),body:Math.max(13,Math.min(18,Number(v.body)||14)),
sidebar:Math.max(210,Math.min(320,Number(v.sidebar)||238)),
density:["compact","comfortable","spacious"].includes(v.density||"")?v.density!:DEFAULT_COMPONENT_STYLE.density,
radius:Math.max(0,Math.min(24,typeof v.radius==="number"&&Number.isFinite(v.radius)?v.radius:DEFAULT_COMPONENT_STYLE.radius)),
button:["rounded","pill","square"].includes(v.button||"")?v.button!:DEFAULT_COMPONENT_STYLE.button,
shadow:["none","soft","medium"].includes(v.shadow||"")?v.shadow!:DEFAULT_COMPONENT_STYLE.shadow,
header:v.header==="transparent"?"transparent":"solid",
sidebarStyle:v.sidebarStyle==="bordered"?"bordered":"solid",stickyHeader:v.stickyHeader!==false};}
export function AdminComponentEditor(){
const {authFetch}=useAdmin();const [v,setV]=useState<Setting>(DEFAULT_COMPONENT_STYLE),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[advanced,setAdvanced]=useState(false);
useEffect(()=>{let mounted=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Unable to read saved settings");return r.json()}).then(data=>{if(mounted){setV(data[KEY]?valid(JSON.parse(data[KEY])):DEFAULT_COMPONENT_STYLE);setDirty(false)} }).catch(()=>{if(mounted)setNotice("Could not load saved components. Showing defaults.")});return()=>{mounted=false}},[authFetch]);
function change<K extends keyof Setting>(key:K,value:Setting[K]){setV(old=>({...old,[key]:value}));setDirty(true);setNotice("Draft preview only — not yet published.");}
async function save(){setBusy(true);try{const res=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[KEY]:JSON.stringify(v)})});if(!res.ok){const details=await res.json().catch(()=>({}));throw Error(details.error||`Save failed (HTTP ${res.status})`)}const check=await authFetch("/api/admin/settings",{cache:"no-store"});if(!check.ok)throw Error("Saved but could not verify settings");const settings=await check.json();if(settings[KEY]!==JSON.stringify(v))throw Error("The server did not retain these settings");setDirty(false);setNotice("Saved and verified. Design applied across Admin.");window.dispatchEvent(new Event("bazunk-settings-updated"));}catch(e){setNotice(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}}
const selectClass="w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 dark:border-slate-500 dark:bg-[#182b49] dark:text-white";
const labelClass="space-y-1 text-sm font-bold";
return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-700 dark:bg-[#111f35] dark:text-white" data-testid="admin-component-editor">
<div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-extrabold">Admin appearance</h2><p className="text-sm text-slate-600 dark:text-slate-300">Choose a few essentials, preview them and save. Advanced settings are optional.</p></div><button type="button" disabled={busy||!dirty} onClick={save} className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Saving…":dirty?"Save changes":"Saved"}</button></div>
<div className="grid gap-5 sm:grid-cols-2">
<label className={labelClass}>Font family<select value={v.font} onChange={e=>change("font",e.target.value)} className={selectClass}>{["Inter","Arial","system-ui","Georgia"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className={labelClass}>Heading size: {v.heading}px<input type="range" min="24" max="40" value={v.heading} onChange={e=>change("heading",Number(e.target.value))} className="block w-full accent-blue-600"/></label>
<label className={labelClass}>Body size: {v.body}px<input type="range" min="13" max="18" value={v.body} onChange={e=>change("body",Number(e.target.value))} className="block w-full accent-blue-600"/></label>
<label className={labelClass}>Content density<select value={v.density} onChange={e=>change("density",e.target.value as Setting["density"])} className={selectClass}>{["compact","comfortable","spacious"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className={labelClass}>Sidebar width: {v.sidebar}px<input type="range" min="210" max="320" step="2" value={v.sidebar} onChange={e=>change("sidebar",Number(e.target.value))} className="block w-full accent-blue-600"/></label>
<div className="sm:col-span-2"><button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-900 dark:border-slate-600 dark:bg-[#192d47] dark:text-white">{advanced?"Hide advanced settings ▲":"Advanced settings: cards, buttons and header ▼"}</button></div>
{advanced&&<>
<label className={labelClass}>Card radius: {v.radius}px<input type="range" min="0" max="24" value={v.radius} onChange={e=>change("radius",Number(e.target.value))} className="block w-full accent-blue-600"/></label>
<label className={labelClass}>Button shape<select value={v.button} onChange={e=>change("button",e.target.value as Setting["button"])} className={selectClass}>{["rounded","pill","square"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className={labelClass}>Card shadows<select value={v.shadow} onChange={e=>change("shadow",e.target.value as Setting["shadow"])} className={selectClass}>{["none","soft","medium"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className={labelClass}>Sidebar style<select value={v.sidebarStyle} onChange={e=>change("sidebarStyle",e.target.value as Setting["sidebarStyle"])} className={selectClass}><option value="solid">Solid</option><option value="bordered">Bordered</option></select></label>
<label className={labelClass}>Header style<select value={v.header} onChange={e=>change("header",e.target.value as Setting["header"])} className={selectClass}><option value="solid">Solid</option><option value="transparent">Transparent</option></select></label>
<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={v.stickyHeader} onChange={e=>change("stickyHeader",e.target.checked)} className="h-5 w-5 accent-blue-600"/>Sticky header</label>
</>}
</div>
<div className="rounded-xl border border-slate-300 p-5 dark:border-slate-600" style={{fontFamily:v.font,fontSize:v.body}}>
<h3 style={{fontSize:v.heading,fontWeight:800}}>Sample dashboard card</h3><div className="mt-3 border border-slate-200 bg-slate-50 p-4 text-slate-900" style={{borderRadius:v.radius,boxShadow:v.shadow==="none"?"none":v.shadow==="soft"?"0 2px 8px #0001":"0 8px 24px #0002",padding:v.density==="compact"?12:v.density==="spacious"?28:20}}>
<p className="font-semibold">Marketplace activity</p><p className="my-2">Clear readable buttons, labels and cards.</p><button type="button" style={{borderRadius:v.button==="pill"?999:v.button==="square"?0:8}} className="bg-blue-600 px-5 py-2 font-bold text-white">Primary action</button></div></div>
<div className="flex flex-wrap gap-3"><button type="button" onClick={()=>{setV(DEFAULT_COMPONENT_STYLE);setDirty(true);setNotice("Defaults selected — save to publish.")}} className="rounded-lg border border-slate-400 px-4 py-2 font-bold">Reset to defaults</button><span role="status" className="text-sm font-semibold text-slate-700 dark:text-slate-200">{notice}</span></div>
</section>}
export {valid as validateAdminComponentStyle,KEY as ADMIN_COMPONENT_KEY};
