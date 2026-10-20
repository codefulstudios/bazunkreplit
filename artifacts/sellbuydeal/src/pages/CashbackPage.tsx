import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Coins, Gift, LockKeyhole, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Tier={id:string;name:string;rate:number;spendGbp:number;perks:string[]};
type Settings={enabled:boolean;earningEnabled:boolean;payoutRequestsEnabled:boolean;featureEnabled:boolean;
 holdDays:number;minPayoutGbp:number;payoutPolicy:string;tiers:Tier[]};
type Balance={earnedMinor:number;maturedMinor:number;pendingMinor:number;
 paidMinor:number;reservedMinor:number;availableMinor:number;adjustmentMinor:number};
type Earning={order_id:string;item_title:string;spend_minor:number;rate_bps:number;amount_minor:number;
 tier_id:string;earned_at:string;available_at:string;order_status:string;refunded_total:number};
type Payout={id:string;amount_minor:number;status:string;requested_at:string;
 reviewed_at:string|null;transfer_reference:string|null;decision_note:string|null};
type Account={balance:Balance;earnings:Earning[];payouts:Payout[];settings:Settings};
const panel="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#192b49] dark:text-white sm:p-6";
const sub="text-sm font-medium text-slate-700 dark:text-slate-200";
const btn="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2.5 font-bold text-slate-950 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-500 dark:bg-[#273951] dark:text-white dark:hover:bg-[#344969]";
const primary="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 font-black text-white hover:bg-orange-700 disabled:opacity-60";
const input="min-h-11 w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-lg font-black text-slate-950 dark:border-slate-500 dark:bg-[#0e203e] dark:text-white";
const gbp=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0)/100);
export default function CashbackPage(){
 const {isLoaded,isSignedIn,getToken}=useAuth();
 // Clerk can supply a new getToken callback across renders. Do not make data loading
 // depend on its identity: otherwise a setState -> effect -> fetch cycle can lock the page.
 const tokenRef=useRef(getToken);
 tokenRef.current=getToken;
 const [settings,setSettings]=useState<Settings|null>(null);
 const [account,setAccount]=useState<Account|null>(null);
 const [spend,setSpend]=useState(100),[amount,setAmount]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");
 const get=useCallback(async(path:string,init:RequestInit={},authenticated=false)=>{
   const token=authenticated?await tokenRef.current():null;
   if(authenticated&&!token)throw Error("Please sign in to view your cashback.");
   const r=await fetch("/api"+path,{...init,cache:"no-store",signal:AbortSignal.timeout(20000),headers:{
    ...(init.body?{"Content-Type":"application/json"}:{}),
    ...(token?{Authorization:`Bearer ${token}`}:{}),...init.headers
   }});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Cashback request failed");
   return data;
 },[]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [config,details]=await Promise.all([get("/cashback/settings"),
    isSignedIn?get("/cashback/account",{},true):Promise.resolve(null)]);
   if(!config || typeof config!=="object" || !Array.isArray(config.tiers))throw Error("Invalid cashback programme settings. Please retry.");
   if(details && (!details.balance || !Array.isArray(details.earnings) || !Array.isArray(details.payouts)))throw Error("Incomplete cashback wallet response. Your balance has not been changed.");
   setSettings(config);setAccount(details);
  }catch(e){setError(e instanceof Error?e.message:"Cashback information unavailable");setAccount(null);}
  finally{setLoading(false);}
 },[get,isSignedIn]);
 useEffect(()=>{if(isLoaded)void load();},[load,isLoaded]);
 const submit=async()=>{
  if(!account||!settings||!settings.payoutRequestsEnabled)return;
  const n=Number(amount);
  if(!Number.isFinite(n)||n<settings.minPayoutGbp||Math.round(n*100)>account.balance.availableMinor){
   setError("Choose an amount within your available cashback balance and the minimum withdrawal.");return;
  }
  if(!window.confirm("Submit a manual payout request of "+gbp(Math.round(n*100))+"? This does not transfer money automatically."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const result=await get("/cashback/payouts",{method:"POST",body:JSON.stringify({amount:n})},true);
   setMessage("Request "+result.id.slice(0,8)+" received for manual verification. Funds have been reserved, not sent.");
   setAmount("");await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not request payout");}
  finally{setBusy(false);}
 };
 const cancel=async(p:Payout)=>{
  if(!window.confirm("Cancel this pending payout and release its reserved cashback?"))return;
  setBusy(true);setError("");setMessage("");
  try{
   await get("/cashback/payouts/"+p.id+"/cancel",{method:"POST"},true);
   setMessage("Payout request cancelled and reserved amount released.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Cancellation failed");}
  finally{setBusy(false);}
 };
 const active=!!settings?.enabled&&!!settings?.earningEnabled&&!!settings?.featureEnabled;
 const tier=[...(settings?.tiers||[])].reverse().find(t=>spend>=t.spendGbp)||settings?.tiers?.[0];
 const estimated=tier?Math.round(spend*100*tier.rate/100):0;
 return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0c1529] dark:text-white">
  <Navbar/>
  <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 pb-20 sm:px-6 sm:py-8" data-testid="cashback-page">
   <header className="rounded-3xl bg-gradient-to-br from-[#172445] via-[#29366e] to-[#a95a11] p-6 text-white sm:p-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-black text-white"><Coins className="h-4 w-4"/>Bazunk Cashback</span>
     <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/70 px-4 py-2 font-bold text-white"><ArrowLeft className="h-4 w-4"/>Dashboard</Link>
    </div>
    <h1 className="mt-5 text-3xl font-black sm:text-5xl">Your cashback, clearly tracked.</h1>
    <p className="mt-3 max-w-2xl text-base font-semibold text-white">See cashback earned on qualifying Bazunk purchases, when it becomes available and the status of withdrawal requests.</p>
    <p className="mt-4 rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-sm font-bold text-white">
     {loading?"Checking programme status…":active?"Cashback earning is active for new eligible purchases.":"Cashback earning is currently paused. No new cashback is being awarded."}
    </p>
   </header>
   {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-100"><p>{error}</p><button type="button" className={btn+" mt-3"} onClick={()=>void load()}>Retry cashback</button></div>}
   {message&&<div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">{message}</div>}
   {!isSignedIn&&isLoaded&&<div className={panel+" flex flex-wrap items-center justify-between gap-3"}>
    <div><h2 className="text-lg font-black">Sign in to see your actual cashback</h2><p className={sub}>The calculator below is an estimate, not a wallet balance.</p></div>
    <Link href="/sign-in" className={primary}>Sign in <ArrowRight className="h-4 w-4"/></Link>
   </div>}
   {account&&<section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">My cashback wallet</h2><button className={btn} disabled={loading} onClick={()=>void load()}><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     {[{title:"Available to request",value:account.balance.availableMinor,icon:Wallet},
       {title:"Pending holding period",value:account.balance.pendingMinor,icon:Clock},
       {title:"Reserved for payouts",value:account.balance.reservedMinor,icon:LockKeyhole},
       {title:"Payouts recorded paid",value:account.balance.paidMinor,icon:CheckCircle2}
      ].map(x=><div key={x.title} className={panel}><x.icon className="h-6 w-6 text-orange-600 dark:text-orange-300"/><p className={sub+" mt-3"}>{x.title}</p><p className="mt-1 text-3xl font-black">{gbp(x.value)}</p></div>)}
    </div>
    {account.balance.adjustmentMinor<0&&<p className="rounded-xl bg-amber-50 p-4 font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-100">Your eligible balance has been reduced by order adjustments. Future cashback may offset previous withdrawals. Contact support for a breakdown.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
     <article className={panel+" space-y-3"}><h3 className="text-xl font-black">Request a payout</h3>
      <p className={sub}>Withdrawals are reviewed and settled manually. No automatic Stripe or bank transfer is connected. Do not enter bank information on this page.</p>
      {settings?.payoutRequestsEnabled&&settings.enabled?
       <><p className="text-sm font-bold">Minimum request: {gbp(Math.round(settings.minPayoutGbp*100))}</p>
       <label className="block text-sm font-black">Amount to request (GBP)<input className={input+" mt-1"} type="number" min={settings.minPayoutGbp} max={account.balance.availableMinor/100} step=".01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
       <button className={primary+" w-full"} disabled={busy||account.balance.availableMinor<Math.round(settings.minPayoutGbp*100)} onClick={()=>void submit()}>{busy?"Submitting…":"Request payout"}</button></>:
       <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">Payout requests are not enabled yet. Any earned balance remains recorded; no bank payout is promised.</div>}
      {settings?.payoutPolicy&&<p className={sub+" border-t border-slate-200 pt-3 dark:border-slate-600"}>{settings.payoutPolicy}</p>}
     </article>
     <article className={panel+" space-y-3"}><h3 className="text-xl font-black">Withdrawal history</h3>
      {!account.payouts.length&&<p className={sub}>No payout requests yet.</p>}
      <div className="max-h-72 space-y-3 overflow-y-auto">{account.payouts.map(p=><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 p-3 dark:border-slate-600" key={p.id}>
       <div><p className="font-black">{gbp(p.amount_minor)} <span className="ml-1 text-sm font-semibold capitalize">· {p.status}</span></p>
       <p className={sub}>{new Date(p.requested_at).toLocaleDateString("en-GB")}{p.decision_note?" · "+p.decision_note:""}</p></div>
       {p.status==="requested"&&<button type="button" className={btn} disabled={busy} onClick={()=>void cancel(p)}>Cancel</button>}
      </div>)}</div>
     </article>
    </div>
    <article className={panel}><h3 className="text-xl font-black">Purchase cashback activity</h3>
     <p className={sub+" mt-1"}>Cashback is based on eligible item prices in GBP, not delivery or buyer protection. Refunds and disputes can remove eligibility.</p>
     {!account.earnings.length&&<div className="mt-4 rounded-xl border border-slate-300 p-4 font-semibold dark:border-slate-600">No eligible cashback earnings have been recorded yet. Existing historic orders are not automatically backdated.</div>}
     <div className="mt-3 space-y-2">{account.earnings.map(e=>{
      const blocked=e.order_status==="refunded"||e.order_status==="cancelled"||Number(e.refunded_total)>0;
      const pending=new Date(e.available_at).getTime()>Date.now();
      return <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-600" key={e.order_id}>
       <div className="min-w-0"><strong className="block break-words">{e.item_title}</strong>
        <p className={sub}>{e.tier_id} · {(e.rate_bps/100).toFixed(2)}% of {gbp(e.spend_minor)} · {new Date(e.earned_at).toLocaleDateString("en-GB")}</p>
        <p className={sub}>{blocked?"Ineligible: order adjusted":pending?"Available from "+new Date(e.available_at).toLocaleDateString("en-GB"):"Holding period complete (subject to order checks)"}</p>
       </div><strong className={"text-lg "+(blocked?"line-through text-slate-500 dark:text-slate-300":"text-emerald-700 dark:text-emerald-300")}>{gbp(e.amount_minor)}</strong>
      </div>;
     })}</div>
    </article>
   </section>}
   <section className={panel+" space-y-4"}>
    <div><h2 className="text-2xl font-black">Cashback calculator</h2><p className={sub}>Illustration only. The actual tier for each order is based on your qualifying prior lifetime purchases.</p></div>
    <label className="block text-sm font-black" htmlFor="cashback-price">Example item price (GBP)<input id="cashback-price" type="range" min={10} max={3000} step={10} className="mt-3 w-full accent-orange-600" value={spend} onChange={e=>setSpend(Number(e.target.value))}/></label>
    <div className="grid gap-3 sm:grid-cols-3">{[
     {label:"Example item price",value:gbp(spend*100)},
     {label:"Illustrative rate",value:tier?tier.rate+"% · "+tier.name:"—"},
     {label:"Example cashback",value:gbp(estimated)}
    ].map(x=><div key={x.label} className="rounded-xl bg-slate-100 p-4 dark:bg-[#0f1d36]"><p className={sub}>{x.label}</p><p className="mt-1 text-xl font-black">{x.value}</p></div>)}</div>
   </section>
   <section><h2 className="mb-4 text-2xl font-black">Cashback tiers</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(settings?.tiers||[]).map((t,i)=><article key={t.id} className={panel}>
     <p className="text-xs font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">{["🏅","🥈","🥇","💎"][i]} {t.name}</p>
     <p className="mt-2 text-3xl font-black">{t.rate}%</p><p className={sub}>Tier threshold: {gbp(t.spendGbp*100)} qualifying lifetime spend</p>
     <p className={sub+" mt-3"}>Earn this rate on eligible items when cashback earning is active. Other promotional benefits are not included unless separately enabled.</p>
    </article>)}</div>
   </section>
   <p className={sub+" rounded-xl border border-slate-300 p-4 text-center dark:border-slate-600"}><ShieldCheck className="mr-1 inline h-4 w-4 text-orange-600"/>Cashback is subject to eligibility checks, refunds, disputes, the holding period and the programme settings. Requesting a payout does not send funds automatically.</p>
  </main><Footer/>
 </div>;
}
