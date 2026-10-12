import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { MessageCircle, ExternalLink, Save } from "lucide-react";

const API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\/$/, "");
const defaults: Record<string,string> = {
  chatwoot_position:"right", chatwoot_launcher_title:"Chat with support",
  chatwoot_pages:"home,browse,listing,checkout,dashboard,support,other",
  chatwoot_hide_admin:"true", chatwoot_identify:"false",
  chatwoot_support_hours:"", chatwoot_brand_color:"#F26B21",
  chatwoot_order_context:"true", chatwoot_region_context:"true"
};
const pageOptions = [
  ["home","Homepage"],["browse","Browse & search"],["listing","Listings"],["checkout","Checkout"],
  ["dashboard","Buyer & seller dashboards"],["support","Support centre"],["other","Other public pages"]
];
export function AdminChatwootSettingsPage(){
  const {token} = useAdmin() as {token:string|null};
  const [settings,setSettings]=useState(defaults);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{ if(!token)return; fetch(`${API}/api/admin/settings`,{headers:{Authorization:`Bearer ${token}`}})
    .then(r=>{if(!r.ok)throw Error("Could not load settings");return r.json()})
    .then(d=>setSettings({...defaults,...Object.fromEntries(Object.entries(d).filter(([k])=>k in defaults))}))
    .catch(e=>setMessage(e.message));},[token]);
  const update=(key:string,value:string)=>setSettings(prev=>({...prev,[key]:value}));
  const check=(key:string,label:string)=><label className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 text-sm text-gray-800"><span>{label}</span><input type="checkbox" checked={settings[key]==="true"} onChange={e=>update(key,String(e.target.checked))} className="h-5 w-5 accent-orange-500"/></label>;
  const pages=settings.chatwoot_pages.split(",").filter(Boolean);
  const save=async()=>{setBusy(true);setMessage("");try{
    const r=await fetch(`${API}/api/admin/settings`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(settings)});
    if(!r.ok)throw Error("Could not save Chatwoot settings");
    window.dispatchEvent(new Event("bazunk-settings-updated"));setMessage("Settings saved.");
  }catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
  return <AdminLayout><div className="max-w-3xl mx-auto space-y-5 text-gray-900">
    <div><h1 className="text-2xl font-bold flex gap-2 items-center"><MessageCircle className="text-orange-500"/> Chatwoot Settings</h1>
      <p className="text-sm text-gray-600 mt-1">Marketplace chat behaviour. Use Feature Toggles to turn Chatwoot on or off.</p></div>
    <section className="bg-white border rounded-xl p-5 space-y-4">
      <h2 className="font-bold">Widget appearance</h2>
      <label className="block text-sm">Position<select className="block w-full mt-1 p-2 border rounded-lg bg-white text-gray-900" value={settings.chatwoot_position} onChange={e=>update("chatwoot_position",e.target.value)}><option value="right">Right</option><option value="left">Left</option></select></label>
      <label className="block text-sm">Launcher text<input maxLength={60} className="block w-full mt-1 p-2 border rounded-lg" value={settings.chatwoot_launcher_title} onChange={e=>update("chatwoot_launcher_title",e.target.value)}/></label>
      <label className="block text-sm">Brand colour<input type="color" className="block mt-1 h-10 w-24" value={settings.chatwoot_brand_color} onChange={e=>update("chatwoot_brand_color",e.target.value)}/></label>
      <label className="block text-sm">Support hours message (optional)<input maxLength={200} className="block w-full mt-1 p-2 border rounded-lg" placeholder="e.g. Monday–Friday, 9am–5pm UK time" value={settings.chatwoot_support_hours} onChange={e=>update("chatwoot_support_hours",e.target.value)}/></label>
    </section>
    <section className="bg-white border rounded-xl p-5"><h2 className="font-bold mb-2">Where chat appears</h2>
      {pageOptions.map(([key,label])=><label key={key} className="flex items-center justify-between py-2 text-sm"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={pages.includes(key)} onChange={e=>update("chatwoot_pages",e.target.checked?[...pages,key].join(","):pages.filter(x=>x!==key).join(","))}/></label>)}
      {check("chatwoot_hide_admin","Hide widget on admin pages")}
    </section>
    <section className="bg-white border rounded-xl p-5"><h2 className="font-bold mb-2">Customer context</h2>
      {check("chatwoot_region_context","Share UK/US marketplace region")}
      {check("chatwoot_order_context","Share current order or dispute reference when available")}
      {check("chatwoot_identify","Identify signed-in customers using server-verified HMAC")}
      <p className="text-xs text-amber-700 mt-3">Set CHATWOOT_IDENTITY_VALIDATION_SECRET on the Bazunk API Render service, matching the Chatwoot website inbox identity-validation secret. Until configured, visitors remain anonymous.</p>
    </section>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold">Connection and Chatwoot administration</h2>
      <p className="text-sm">Host: app.chatwoot.com · Widget token configured · Live service status must be verified in Chatwoot.</p>
      <a href="https://app.chatwoot.com/app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-orange-600 font-semibold text-sm">Open Chatwoot inbox, automations, agents and business hours <ExternalLink className="h-4 w-4"/></a>
    </section>
    {message&&<p role="status" className="text-sm font-semibold">{message}</p>}
    <button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#F26B21] text-white font-bold px-5 py-3 disabled:opacity-50"><Save className="h-4 w-4"/>{busy?"Saving…":"Save Chatwoot Settings"}</button>
  </div></AdminLayout>;
}
