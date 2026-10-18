import { useEffect, useState } from "react";
import { MarketplaceLoader, LOADER_VARIANTS, LOADER_AREAS } from "./MarketplaceLoader";
import { useAdmin } from "@/context/AdminContext";

export function LoaderSettingsPanel() {
 const { authFetch, token } = useAdmin();
 const [variant,setVariant] = useState("logo");
 const [minimum,setMinimum] = useState("0");
 const [areas,setAreas] = useState<Record<string,boolean>>({});
 const [saving,setSaving] = useState(false);
 const [message,setMessage] = useState("");
 useEffect(()=>{
  let active=true;
  authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Unable to read settings");return r.json()}).then(data=>{
   if(!active)return;
   setVariant(data.marketplace_loader_variant||"logo");
   setMinimum(["0","500","1000","2000"].includes(data.marketplace_loader_min_ms)?data.marketplace_loader_min_ms:"0");
   setAreas(Object.fromEntries(LOADER_AREAS.map(x=>[x.id,data["marketplace_loader_area_"+x.id]==="true"])));
  }).catch(()=>{if(active)setMessage("Loader settings unavailable.")});
  return ()=>{active=false};
 },[token]);
 async function save(){
  setSaving(true);setMessage("");
  try{
   const payload={marketplace_loader_variant:variant,marketplace_loader_min_ms:minimum,...Object.fromEntries(LOADER_AREAS.map(x=>["marketplace_loader_area_"+x.id,String(areas[x.id]===true)]))};
   const response=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify(payload)});
   if(!response.ok)throw Error("Unable to save loader settings");
   window.dispatchEvent(new Event("bazunk-settings-updated"));
   setMessage("Loader settings saved.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to save settings")}finally{setSaving(false)}
 }
 return <section className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-600 dark:bg-slate-900">
  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Marketplace loading animation</h2>
  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Choose a loader and select the pages where it appears.</p>
  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{LOADER_VARIANTS.map(x=>
   <label key={x.id} className="cursor-pointer rounded-xl border border-slate-300 p-3 dark:border-slate-600">
    <input type="radio" name="marketplace-loader" checked={variant===x.id} onChange={()=>setVariant(x.id)} />
    <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-white">{x.label}</span>
    <div className="mt-2 flex justify-center"><MarketplaceLoader variantOverride={x.id} preview label="" /></div>
   </label>)}</div>
  <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-slate-900 dark:text-white">Minimum loader display time
   <select className="max-w-xs rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={minimum} onChange={e=>setMinimum(e.target.value)}>
    <option value="0">No extra delay (default)</option><option value="500">0.5 seconds</option><option value="1000">1 second</option><option value="2000">2 seconds</option>
   </select>
   <span className="font-normal text-slate-700 dark:text-slate-200">Only adds time when enabled for a page. A real request that takes longer is never interrupted.</span>
  </label>
  <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">Page placement</h3>
  <div className="mt-2 grid gap-2 sm:grid-cols-2">{LOADER_AREAS.map(x=>
   <label key={x.id} className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
    <input type="checkbox" checked={areas[x.id]===true} onChange={e=>setAreas(v=>({...v,[x.id]:e.target.checked}))}/>{x.label}
   </label>)}</div>
  <button type="button" onClick={save} disabled={saving} className="mt-4 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save loading animation"}</button>
  {message&&<p role="status" className="mt-2 text-sm text-slate-900 dark:text-white">{message}</p>}
 </section>;
}
