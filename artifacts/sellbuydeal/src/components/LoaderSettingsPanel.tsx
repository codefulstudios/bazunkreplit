import { useEffect, useState } from "react";
import { MarketplaceLoader, LOADER_VARIANTS, LOADER_AREAS } from "./MarketplaceLoader";
import { useAdmin } from "@/context/AdminContext";

export function LoaderSettingsPanel() {
 const { authFetch } = useAdmin();
 const [variant,setVariant] = useState("logo");
 const [areas,setAreas] = useState<Record<string,boolean>>({});
 const [saving,setSaving] = useState(false);
 const [message,setMessage] = useState("");
 useEffect(()=>{
  let active=true;
  authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Unable to read settings");return r.json()}).then(data=>{
   if(!active)return;
   setVariant(data.marketplace_loader_variant||"logo");
   setAreas(Object.fromEntries(LOADER_AREAS.map(x=>[x.id,data["marketplace_loader_area_"+x.id]!=="false"])));
  }).catch(()=>{if(active)setMessage("Loader settings unavailable.")});
  return ()=>{active=false};
 },[authFetch]);
 async function save(){
  setSaving(true);setMessage("");
  try{
   const payload={marketplace_loader_variant:variant,...Object.fromEntries(LOADER_AREAS.map(x=>["marketplace_loader_area_"+x.id,String(areas[x.id]!==false)]))};
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
    <div className="mt-2 flex justify-center"><LoaderPreview variant={x.id}/></div>
   </label>)}</div>
  <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">Page placement</h3>
  <div className="mt-2 grid gap-2 sm:grid-cols-2">{LOADER_AREAS.map(x=>
   <label key={x.id} className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
    <input type="checkbox" checked={areas[x.id]!==false} onChange={e=>setAreas(v=>({...v,[x.id]:e.target.checked}))}/>{x.label}
   </label>)}</div>
  <button type="button" onClick={save} disabled={saving} className="mt-4 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save loading animation"}</button>
  {message&&<p role="status" className="mt-2 text-sm text-slate-900 dark:text-white">{message}</p>}
 </section>;
}
function LoaderPreview({variant}:{variant:string}){
 return <div className={"bz-loader bz-loader--"+variant} aria-hidden="true"><span className="bz-loader-ring"/><span className="bz-loader-inner">{variant==="logo"?"B":"●"}</span></div>;
}
