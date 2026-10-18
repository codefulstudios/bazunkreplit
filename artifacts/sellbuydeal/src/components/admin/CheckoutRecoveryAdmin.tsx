import { useEffect,useState } from "react";
import { useAdmin } from "@/context/AdminContext";
type Recovery={id:number;buyer_email:string;cart_items:{id:number;quantity:number}[];created_at:string;reminder_count:number;purchased:boolean};
export function CheckoutRecoveryAdmin(){
 const {authFetch}=useAdmin();
 const [rows,setRows]=useState<Recovery[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState<number|null>(null);
 async function load(){try{const r=await authFetch("/api/admin/checkout-recovery");const d=await r.json();if(!r.ok)throw Error(d.error||"Could not load recovery queue");setRows(d.checkouts||[]);}catch(e){setError(e instanceof Error?e.message:"Recovery queue unavailable");}}
 useEffect(()=>{void load();},[]);
 async function send(id:number){if(!window.confirm("Send one in-app checkout reminder to this buyer?"))return;setBusy(id);setNotice("");setError("");try{const r=await authFetch(`/api/admin/checkout-recovery/${id}/remind`,{method:"POST"});const d=await r.json();if(!r.ok)throw Error(d.error||"Reminder failed");setNotice("One follow-up message sent.");await load();}catch(e){setError(e instanceof Error?e.message:"Reminder failed");}finally{setBusy(null);}}
 return <section className="rounded-2xl border-2 border-orange-300 bg-white p-5 text-slate-950 dark:border-orange-700 dark:bg-[#172541] dark:text-white">
 <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Checkout recovery</h2><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Opted-in incomplete checkouts, at least one hour old. One in-app reminder per checkout; purchases are excluded.</p></div><button className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white" onClick={()=>void load()}>Refresh</button></div>
 {error&&<p role="alert" className="mt-3 font-bold text-red-700 dark:text-red-300">{error}</p>}{notice&&<p role="status" className="mt-3 font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>}
 <div className="mt-4 space-y-2">{rows.length===0?<p className="text-sm font-semibold">No eligible abandoned checkouts.</p>:rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 p-3 dark:border-slate-600"><div><p className="font-bold">{row.buyer_email}</p><p className="text-sm text-slate-700 dark:text-slate-200">{row.cart_items.reduce((n,item)=>n+item.quantity,0)} item(s) · {new Date(row.created_at).toLocaleString()} · Reminders: {row.reminder_count}{row.purchased?" · Purchased":""}</p></div><button disabled={busy===row.id||row.purchased||row.reminder_count>0} onClick={()=>void send(row.id)} className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white disabled:opacity-50">Send follow-up</button></div>)}</div>
 </section>;
}
