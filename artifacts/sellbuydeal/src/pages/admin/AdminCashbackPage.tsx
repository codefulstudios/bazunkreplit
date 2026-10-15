import {useEffect,useState} from "react";
import {useCurrency} from "@/context/CurrencyContext";
import {AdminLayout} from "./AdminLayout";
import {useAdmin} from "@/context/AdminContext";
type Tier={id:string;name:string;rate:number;spendGbp:number;perks:string[]};
type Config={enabled:boolean;payoutPolicy:string;tiers:Tier[]};
const API=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
export function AdminCashbackPage(){
 const {authFetch}=useAdmin();
 const {currency}=useCurrency();
 const [config,setConfig]=useState<Config|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{authFetch(`${API}/api/admin/cashback/settings`).then(r=>r.json()).then(setConfig).catch(()=>setMessage("Unable to load cashback settings"));},[authFetch]);
 const update=(i:number,key:keyof Tier,value:any)=>setConfig(old=>old?{...old,tiers:old.tiers.map((t,j)=>j===i?{...t,[key]:value}:t)}:old);
 const save=async()=>{if(!config)return;setBusy(true);setMessage("");try{const r=await authFetch(`${API}/api/admin/cashback/settings`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});const data=await r.json();if(!r.ok)throw Error(data.error||"Save failed");setConfig(data);setMessage("Cashback settings saved.");}catch(e:any){setMessage(e.message||"Save failed")}finally{setBusy(false)}};
 return <AdminLayout><div className="admin-cashback-page max-w-5xl mx-auto space-y-6 p-4"><h1 className="text-3xl font-bold">Cashback Management</h1><p className="text-sm text-gray-500">Edit the promotional cashback tiers displayed to buyers. This does not activate payments or automatic cashback accounting.</p>
 {message&&<p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
 {config&&<><label className="flex gap-3 items-center bg-white rounded-xl p-4 border"><input type="checkbox" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})}/>Show cashback programme as active</label>
 <div className="bg-white rounded-xl border p-4"><label className="block font-semibold mb-2">Payout policy / customer notice</label><textarea className="w-full rounded border p-3" rows={3} value={config.payoutPolicy} onChange={e=>setConfig({...config,payoutPolicy:e.target.value})}/></div>
 <div className="grid md:grid-cols-2 gap-4">{config.tiers.map((t,i)=><section key={t.id} className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold capitalize">{t.id} tier</h2><label className="block text-sm">Display name<input className="w-full border rounded p-2 mt-1" value={t.name} onChange={e=>update(i,"name",e.target.value)}/></label><label className="block text-sm">Cashback rate (%)<input type="number" min="0" max="20" step=".1" className="w-full border rounded p-2 mt-1" value={t.rate} onChange={e=>update(i,"rate",Number(e.target.value))}/></label><label className="block text-sm">Minimum spend ({currency.code})<input type="number" min="0" step="1" className="w-full border rounded p-2 mt-1" value={Number((t.spendGbp*currency.rate).toFixed(2))} onChange={e=>update(i,"spendGbp",Number((Number(e.target.value)/currency.rate).toFixed(2)))}/></label><label className="block text-sm">Benefits (one per line)<textarea rows={5} className="w-full border rounded p-2 mt-1" value={t.perks.join("\n")} onChange={e=>update(i,"perks",e.target.value.split("\n"))}/></label></section>)}</div>
 <button disabled={busy} onClick={save} className="rounded-xl bg-orange-600 text-white font-bold px-6 py-3 disabled:opacity-50">{busy?"Saving...":"Save cashback settings"}</button></>}</div></AdminLayout>;
}