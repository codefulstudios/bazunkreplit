import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { AlertTriangle, Banknote, CheckCircle2, Clock, RefreshCw, Save, ShieldCheck, Wallet } from "lucide-react";

type Tier={id:string;name:string;rate:number;spendGbp:number;perks:string[]};
type Config={enabled:boolean;earningEnabled:boolean;payoutRequestsEnabled:boolean;holdDays:number;
 minPayoutGbp:number;accrualStartedAt:string|null;payoutPolicy:string;tiers:Tier[]};
type Payout={id:string;buyer_email:string;amount_minor:number;status:string;requested_at:string;
 reviewed_at:string|null;transfer_reference:string|null;decision_note:string|null};
type Overview={earnings:{orders:number;gross_minor:number;eligible_minor:number};
 payoutSummary:{status:string;count:number;amount_minor:number}[];payouts:Payout[];
 audit:{action:string;actor:string;target_id:string|null;created_at:string}[]};
const section="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#192b49] dark:text-white sm:p-6";
const text="text-sm font-medium text-slate-700 dark:text-slate-200";
const input="mt-1 w-full min-h-11 rounded-xl border border-slate-400 bg-white px-3 py-2 font-semibold text-slate-950 dark:border-slate-500 dark:bg-[#0d1b32] dark:text-white";
const button="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-500 dark:text-white dark:hover:bg-white/10";
const primary="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700 disabled:opacity-60";
const gbp=(v:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v||0)/100);

export function AdminCashbackPage(){
 const {authFetch,isAdmin}=useAdmin();
 const [config,setConfig]=useState<Config|null>(null),[overview,setOverview]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[error,setError]=useState("");
 const [filter,setFilter]=useState("all");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [settingsR,overviewR]=await Promise.all([
    authFetch("/api/admin/cashback/settings",{cache:"no-store"}),
    authFetch("/api/admin/cashback/overview",{cache:"no-store"})
   ]);
   const settings=await settingsR.json().catch(()=>({}));
   const overview=await overviewR.json().catch(()=>({}));
   if(!settingsR.ok||!overviewR.ok)throw Error(settings.error||overview.error||"Could not load cashback controls");
   setConfig(settings);setOverview(overview);
  }catch(e){setError(e instanceof Error?e.message:"Cashback management unavailable");}
  finally{setLoading(false);}
 },[authFetch]);
 useEffect(()=>{if(isAdmin)void load();},[isAdmin,load]);
 const patch=(value:Partial<Config>)=>setConfig(old=>old?{...old,...value}:old);
 const updateTier=(i:number,value:Partial<Tier>)=>setConfig(old=>old?{...old,
   tiers:old.tiers.map((t,j)=>j===i?{...t,...value}:t)}:old);
 async function save(){
  if(!config)return;
  if(config.earningEnabled&&!config.enabled){setError("Turn on programme visibility before activating earning.");return;}
  if(config.payoutRequestsEnabled&&!config.enabled){setError("Enable the programme before accepting payout requests.");return;}
  if(config.earningEnabled&&!config.accrualStartedAt &&
    !window.confirm("Start earning real cashback on NEW paid orders? This creates an actual financial liability; previous orders will not qualify."))return;
  if(config.payoutRequestsEnabled &&
    !window.confirm("Payout requests require a real verified external payment process. No automatic bank transfer is connected. Continue?"))return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await authFetch("/api/admin/cashback/settings",{method:"PUT",
    body:JSON.stringify(config)});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Could not save cashback settings");
   setConfig(data);setMessage("Settings saved. Changes have been recorded in the cashback audit trail.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Save failed");}
  finally{setBusy(false);}
 }
 async function decide(p:Payout,action:"approve"|"reject"|"paid"){
  const note=action==="reject"?window.prompt("Reason for rejecting the payout (at least 10 characters):","")??"":action==="approve"?"Approved for verified external payment":"";
  if(action==="reject"&&note.length<10)return;
  let reference="",externalTransferCompleted=false;
  if(action==="paid"){
   reference=window.prompt("Reference of the COMPLETED external bank/payment transfer (8+ characters):","")?.trim()||"";
   if(reference.length<8)return;
   externalTransferCompleted=window.confirm("Confirm that the real transfer has ALREADY completed outside Bazunk. This button only records payment, and DOES NOT send funds.");
   if(!externalTransferCompleted)return;
  }
  if(action==="approve"&&!window.confirm("Approve this payout for manual settlement? No payment will be sent yet."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await authFetch("/api/admin/cashback/payouts/"+p.id+"/decision",{method:"POST",
    body:JSON.stringify({action,note,reference,externalTransferCompleted})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Payout action failed");
   setMessage("Payout updated to "+data.status+". Audit recorded.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Payout update failed");}
  finally{setBusy(false);}
 }
 async function reconcile(){
  if(!window.confirm("Verify up to 25 newer checkout sessions against Stripe and repair missing cashback accruals?"))return;
  setBusy(true);setError("");
  try{
   const r=await authFetch("/api/admin/cashback/reconcile",{method:"POST"});
   const x=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(x.error||"Reconciliation failed");
   setMessage(`Verified ${x.checked} sessions; created ${x.created} missing earnings; skipped ${x.skipped}.`);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Reconciliation failed");}
  finally{setBusy(false);}
 }
 return <AdminLayout><div className="mx-auto max-w-7xl space-y-5 pb-12" data-testid="admin-cashback">
  <header className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-orange-700 px-6 py-7 text-white">
   <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-white">Orders & rewards · financial controls</p>
   <h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><Wallet className="h-8 w-8"/>Cashback Control Centre</h1>
   <p className="mt-2 max-w-3xl text-sm font-semibold text-white">Real order-backed accruals, pending balances, manual payout reviews, and activity history. No automatic bank transfers.</p></div>
   <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/70 bg-white/10 px-4 py-2 font-bold text-white" disabled={loading} onClick={()=>void load()}><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button></div>
  </header>
  {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</div>}
  {message&&<div role="status" className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100">{message}</div>}
  {loading&&!config&&<p className={text}>Loading cashback system…</p>}
  {overview&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   {[{title:"Recorded orders",value:String(overview.earnings.orders??0),icon:ShieldCheck},
     {title:"Gross cashback accrued",value:gbp(overview.earnings.gross_minor),icon:Wallet},
     {title:"Eligible (before holds)",value:gbp(overview.earnings.eligible_minor),icon:CheckCircle2},
     {title:"Payouts marked paid",value:gbp(overview.payoutSummary.find(x=>x.status==="paid")?.amount_minor??0),icon:Banknote}
    ].map(x=><div className={section} key={x.title}><x.icon className="h-6 w-6 text-orange-600 dark:text-orange-300"/><p className={text+" mt-3"}>{x.title}</p><p className="mt-1 text-2xl font-black">{x.value}</p></div>)}
  </div>}
  {config&&<section className={section+" space-y-5"}>
   <div><h2 className="text-xl font-black">Programme activation and payout controls</h2>
   <p className={text+" mt-1"}>Visibility, actual earning, and customer withdrawals are separate. The historic promotional “enabled” flag does not turn on the financial ledger.</p></div>
   <div className="grid gap-3 md:grid-cols-3">
    {([{key:"enabled",name:"Show programme",desc:"Allow the cashback marketing page to advertise a configured programme."},
      {key:"earningEnabled",name:"Award on new purchases",desc:"Accrue cashback only after Stripe verifies a new paid order."},
      {key:"payoutRequestsEnabled",name:"Accept payout requests",desc:"Users can reserve matured balance for human-reviewed manual payment."}] as const).map(x=>
     <label key={x.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-600 dark:bg-[#10213d]">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-orange-600" checked={config[x.key]} onChange={e=>patch({[x.key]:e.target.checked})}/>
      <span><strong className="block text-base">{x.name}</strong><span className={text}>{x.desc}</span></span>
     </label>)}
   </div>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-black">Holding period (days)<input type="number" min="14" max="90" step="1" className={input} value={config.holdDays} onChange={e=>patch({holdDays:Number(e.target.value)})}/><p className={text+" mt-1"}>Applied to future earnings. Existing hold dates remain unchanged.</p></label>
    <label className="text-sm font-black">Minimum withdrawal (GBP)<input type="number" min="5" max="500" step=".01" className={input} value={config.minPayoutGbp} onChange={e=>patch({minPayoutGbp:Number(e.target.value)})}/></label>
   </div>
   <p className={text}>Current accrual activation date: <strong>{config.accrualStartedAt?new Date(config.accrualStartedAt).toLocaleString():"Not activated"}</strong>. Historic sales do not automatically earn cashback.</p>
   <label className="block text-sm font-black">Customer payout policy<textarea rows={3} maxLength={1000} className={input} value={config.payoutPolicy} onChange={e=>patch({payoutPolicy:e.target.value})}/></label>
   <div className="grid gap-4 md:grid-cols-2">{config.tiers.map((t,i)=><article className="space-y-3 rounded-xl border border-slate-300 p-4 dark:border-slate-600" key={t.id}>
    <h3 className="font-black capitalize">{t.id} tier</h3>
    <label className="block text-sm font-bold">Display name<input className={input} maxLength={40} value={t.name} onChange={e=>updateTier(i,{name:e.target.value})}/></label>
    <div className="grid grid-cols-2 gap-3">
     <label className="block text-sm font-bold">Cashback rate (%)<input className={input} type="number" min="0" max="20" step=".1" value={t.rate} onChange={e=>updateTier(i,{rate:Number(e.target.value)})}/></label>
     <label className="block text-sm font-bold">Lifetime spend from (£)<input className={input} type="number" min="0" step="1" value={t.spendGbp} onChange={e=>updateTier(i,{spendGbp:Number(e.target.value)})}/></label>
    </div>
    <label className="block text-sm font-bold">Tier notes (one per line)<textarea className={input} rows={3} value={t.perks.join("\n")} onChange={e=>updateTier(i,{perks:e.target.value.split("\n")})}/></label>
   </article>)}</div>
   <div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={()=>void save()}><Save className="h-4 w-4"/>{busy?"Working…":"Save changes"}</button>
   <button className={button} disabled={busy} onClick={()=>void reconcile()}><RefreshCw className="h-4 w-4"/>Reconcile Stripe orders (25)</button></div>
  </section>}
  <section className={section+" space-y-4"}>
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Cashback withdrawal queue</h2>
    <p className={text}>Approve, reject, or record a completed EXTERNAL payout. Marking “Paid” does not transfer money.</p></div>
    <select aria-label="Filter payouts" className={input+" w-auto"} value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">All requests</option>{["requested","approved","paid","rejected","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
    </select></div>
   <div className="flex flex-wrap gap-2">{(overview?.payoutSummary||[]).map(s=><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 dark:bg-slate-700 dark:text-white" key={s.status}>{s.status}: {s.count} · {gbp(s.amount_minor)}</span>)}</div>
   <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-300 text-slate-900 dark:border-slate-500 dark:text-white">
    <tr><th className="p-3">Buyer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Requested</th><th className="p-3">Actions</th></tr></thead>
    <tbody>{(overview?.payouts||[]).filter(x=>filter==="all"||x.status===filter).map(p=><tr key={p.id} className="border-b border-slate-200 align-top dark:border-slate-700">
     <td className="max-w-52 break-all p-3 font-bold">{p.buyer_email}<p className={text}>{p.transfer_reference?"Reference: "+p.transfer_reference:""}</p></td>
     <td className="p-3 font-black">{gbp(p.amount_minor)}</td><td className="p-3 capitalize font-bold">{p.status}</td>
     <td className="p-3 font-medium">{new Date(p.requested_at).toLocaleDateString()}</td>
     <td className="p-3"><div className="flex flex-wrap gap-2">
      {p.status==="requested"&&<><button disabled={busy} className={button} onClick={()=>void decide(p,"approve")}>Approve</button><button disabled={busy} className={button} onClick={()=>void decide(p,"reject")}>Reject</button></>}
      {p.status==="approved"&&<button disabled={busy} className={primary} onClick={()=>void decide(p,"paid")}>Record external payment</button>}
     </div></td>
    </tr>)}</tbody></table></div>
   {!overview?.payouts.length&&<p className={text}>No payout requests have been submitted.</p>}
  </section>
  <section className={section}><h2 className="text-xl font-black">Financial activity history</h2>
   <div className="mt-3 space-y-2">{(overview?.audit||[]).map((a,i)=><p key={i} className={text+" border-b border-slate-200 py-2 dark:border-slate-700"}>
    <strong className="text-slate-900 dark:text-white">{a.action.replaceAll("_"," ")}</strong> · {a.actor} · {new Date(a.created_at).toLocaleString()}
   </p>)}</div>
   {!overview?.audit.length&&<p className={text+" mt-2"}>No configuration changes or payout actions recorded yet.</p>}
  </section>
  <div className="flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"><AlertTriangle className="h-5 w-5 shrink-0"/>Bank disbursements are manual and must be verified outside Bazunk before recording a payout as paid. Never enter or store customer bank credentials in the payout notes.</div>
 </div></AdminLayout>;
}
