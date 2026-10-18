import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
type Policy={enabled:boolean;combined_shipping_minor:number;multi_item_discount_percent:number;min_items:number};
const DEFAULT:Policy={enabled:false,combined_shipping_minor:0,multi_item_discount_percent:0,min_items:2};
export function SellerBundleSettings(){
 const { getToken }=useAuth();
 const [policy,setPolicy]=useState<Policy>(DEFAULT),[error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;(async()=>{try{const token=await getToken();const r=await fetch("/api/seller/bundle-policy",{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw Error("Could not load seller shipping options");const d=await r.json();if(active)setPolicy({...DEFAULT,...d});}catch(e){if(active)setError(String(e));}})();return()=>{active=false;};},[getToken]);
 async function save(){
  setSaving(true);setError("");setNotice("");
  try{
   const token=await getToken();
   const r=await fetch("/api/seller/bundle-policy",{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({enabled:policy.enabled,combinedShippingMinor:policy.combined_shipping_minor,multiItemDiscountPercent:policy.multi_item_discount_percent,minItems:policy.min_items})});
   if(!r.ok)throw Error((await r.json()).error||"Could not save");
   setNotice("Bundle preferences saved. Discounts and delivery changes require checkout activation before buyers can use them.");
  }catch(e){setError(e instanceof Error?e.message:"Save failed");}finally{setSaving(false);}
 }
 return <section className="rounded-2xl border-2 border-orange-300 bg-white p-5 text-slate-950 dark:border-orange-700 dark:bg-[#172541] dark:text-white">
  <h2 className="text-xl font-black">Combined shipping & multi-item discounts</h2>
  <p className="mt-1 text-sm font-medium">Create one shipping price per seller and a discount when buyers order multiple items from your shop.</p>
  <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={policy.enabled} onChange={e=>setPolicy(p=>({...p,enabled:e.target.checked}))}/>Enable bundle offer</label>
  <div className="mt-4 grid gap-4 sm:grid-cols-3">
  <label className="text-sm font-bold">Combined shipping (£)<input type="number" min="0" max="1000" step=".01" value={(policy.combined_shipping_minor/100).toFixed(2)} onChange={e=>setPolicy(p=>({...p,combined_shipping_minor:Math.round(Math.max(0,Number(e.target.value))*100)}))} className="mt-1 w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950"/></label>
  <label className="text-sm font-bold">Multi-item discount (%)<input type="number" min="0" max="50" step="1" value={policy.multi_item_discount_percent} onChange={e=>setPolicy(p=>({...p,multi_item_discount_percent:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950"/></label>
  <label className="text-sm font-bold">Minimum items<input type="number" min="2" max="20" step="1" value={policy.min_items} onChange={e=>setPolicy(p=>({...p,min_items:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-950"/></label>
  </div>
  <button onClick={save} disabled={saving} className="mt-4 rounded-lg bg-orange-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving?"Saving…":"Save bundle settings"}</button>
  {error&&<p role="alert" className="mt-3 font-bold text-red-700 dark:text-red-300">{error}</p>}{notice&&<p role="status" className="mt-3 font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>}
 </section>;
}
