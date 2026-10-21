import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, Coins, TrendingUp, RefreshCw, Package, ShoppingBag, ShieldCheck, BriefcaseBusiness, Radio, AlertTriangle, RotateCcw, ArrowDownToLine, Settings, Activity, Sparkles, ArrowUpRight, CalendarDays, CheckCircle2, BarChart3, Mail } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminLayout } from "./AdminLayout";
import { AdminActionRequired } from "@/components/admin/AdminActionRequired";
import { useAdmin } from "@/context/AdminContext";

type Stats = { userCount:number; newUsersToday:number; newUsersWeek:number; activeListings:number; orderCount:number; salesToday:number; gmv:number; gmvToday:number; buyerProtection:number; businessFees:number; openDisputes:number; totalDisputes:number; openReturns:number; refunds:number; activeLiveStreams:number; liveViewers:number; creditsIssued:number; creditsSpent:number; salesTrend:Array<{label:string;date:string;orders:number;gmv:number}>; userTrend:Array<{label:string;users:number}>; recentPayments:Array<{id:string;email:string;amount:number;currency:string;date:string;status:string}> };
const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n||0);
const num=(n:number)=>new Intl.NumberFormat("en-GB").format(n||0);

export function AdminDashboardPage(){
 const {isAdmin,authFetch}=useAdmin(); const [,go]=useLocation(); const [s,setS]=useState<Stats|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!isAdmin){go("/admin");return;} load();},[isAdmin]);
 async function load(){setLoading(true);try{const r=await authFetch("/api/admin/stats");if(r.ok)setS(await r.json());}finally{setLoading(false)}}
 const cards=s?[
  ["GMV",money(s.gmv),`Today ${money(s.gmvToday)}`,TrendingUp], ["Sales today",num(s.salesToday),`${num(s.orderCount)} orders total`,ShoppingBag],
  ["Active listings",num(s.activeListings),"Currently for sale",Package], ["New users",num(s.newUsersToday),`${num(s.newUsersWeek)} in 7 days`,Users],
  ["Buyer Protection",money(s.buyerProtection),"Collected from buyers",ShieldCheck], ["Business fees",money(s.businessFees),"Seller fees earned",BriefcaseBusiness],
  ["Credits issued",`${num(s.creditsIssued)} cr`,"Ledger-recorded credits",Coins], ["Credits spent",`${num(s.creditsSpent)} cr`,"Ledger-recorded spend",Coins],
  ["Live streams",num(s.activeLiveStreams),`${num(s.liveViewers)} current viewers`,Radio], ["Open disputes",num(s.openDisputes),`${num(s.totalDisputes)} total`,AlertTriangle],
  ["Open returns",num(s.openReturns),"Awaiting completion",RotateCcw], ["Refunds",money(s.refunds),"Recorded dispute/return refunds",RotateCcw],
 ] as const:[];
 return <AdminLayout><div className="admin-dashboard admin-dashboard-proportions space-y-6">{loading&&!s&&<MarketplaceLoader area="admin" label="Loading admin dashboard…" />}
  <header className="admin-dashboard-heading flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-[#34435b] lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[.12em] text-blue-700 dark:text-blue-300">Marketplace administration</p>
      <h1 className="text-[34px] font-extrabold leading-[1.15] tracking-tight text-[#122342] dark:text-white sm:text-[40px]">Dashboard Overview</h1>
      <p className="mt-2 max-w-2xl text-[15px] font-medium leading-6 text-slate-600 dark:text-slate-200">Monitor sales, marketplace performance and the activities that need your attention.</p>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      <div className="flex flex-col items-start gap-1"><span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 dark:border-[#34435b] dark:bg-[#15243b] dark:text-slate-100"><CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300"/>{new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}</span><span className="inline-flex items-center gap-1.5 pl-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Dashboard connected</span></div>
      <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1769ff] px-5 py-3 text-sm font-bold text-white hover:bg-[#1155ca] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Refresh data</button>
    </div>
  </header>
  {loading&&!s?<div className="admin-kpi-grid grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">{Array.from({length:6}).map((_,i)=><div key={i} className="h-[156px] bg-white dark:bg-[#111f35] rounded-xl animate-pulse"/>)}</div>:s&&<>
   <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Marketplace performance</h2><p className="text-sm text-slate-600 dark:text-slate-300">Your most important marketplace metrics at a glance</p></div><span className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200 sm:inline-flex">Live overview</span></div>
   <section aria-label="Marketplace key performance indicators" className="admin-kpi-grid grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
    {cards.slice(0,6).map(([label,value,sub,Icon],i)=><div key={label} className={`admin-kpi admin-kpi-${i} relative flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263854] dark:bg-[#111f35]`}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <span className="admin-kpi-label min-w-0 pt-1 text-sm font-bold leading-5 text-slate-700 dark:text-slate-200">{label}</span>
        <span aria-hidden="true" className="admin-kpi-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"><Icon className="h-6 w-6" strokeWidth={1.85}/></span>
      </div>
      <div className="min-w-0">
        <div className="admin-kpi-value font-black tracking-tight tabular-nums text-slate-950 dark:text-white" title={value}>{value}</div>
        <p className="admin-kpi-sub mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-slate-600 dark:text-slate-300">{sub}</p>
      </div>
    </div>)}
   </section>
   <details className="admin-secondary-metrics rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111f35]"><summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-white">More performance metrics · Credits, streams, disputes, returns and refunds</summary><div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">{cards.slice(6).map(([label,value,sub,Icon])=><div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#192c46]"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span><Icon className="h-4 w-4 text-blue-600 dark:text-blue-300"/></div><strong className="mt-2 block text-2xl font-extrabold text-slate-950 dark:text-white">{value}</strong><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{sub}</p></div>)}</div></details>
   <div className="admin-dashboard-panels grid gap-5 lg:grid-cols-2 2xl:grid-cols-[1.1fr_1fr_.9fr]">
     <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263854] dark:bg-[#111f35]">
       <h2 className="mb-3 font-extrabold text-slate-900 dark:text-white">Marketplace overview</h2>
       <div className="grid grid-cols-2 gap-3 text-sm">
         <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10"><p className="text-slate-600 dark:text-slate-300">Total orders</p><strong className="text-xl">{num(s.orderCount)}</strong></div>
         <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10"><p className="text-slate-600 dark:text-slate-300">Active listings</p><strong className="text-xl">{num(s.activeListings)}</strong></div>
         <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10"><p className="text-slate-600 dark:text-slate-300">Open disputes</p><strong className="text-xl">{num(s.openDisputes)}</strong></div>
         <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10"><p className="text-slate-600 dark:text-slate-300">Open returns</p><strong className="text-xl">{num(s.openReturns)}</strong></div>
       </div>
     </div>
     <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#263854] dark:bg-[#111f35]">
       <h2 className="mb-3 font-extrabold text-slate-900 dark:text-white">Quick actions</h2>
       <div className="grid grid-cols-2 gap-3">{[["Manage orders","/admin/orders",ShoppingBag],["Listings","/admin/listings",Package],["Users","/admin/users",Users],["Feature toggles","/admin/feature-toggles",Settings],["Email templates","/admin/emails",Mail],["System status","/admin/system-status",Activity]].map(([label,href,Icon]:any)=><button key={href} type="button" onClick={()=>go(href)} className="flex min-h-16 flex-col items-start justify-center gap-1 rounded-lg border border-slate-200 p-3 text-left text-xs font-bold text-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:border-[#263854] dark:text-white dark:hover:bg-blue-500/10"><Icon className="h-5 w-5 text-blue-600 dark:text-blue-400"/>{label}</button>)}</div>
     </div>
     <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 dark:border-blue-800 dark:from-[#102b56] dark:to-[#111f35]">
       <div className="mb-3 inline-flex rounded-lg bg-blue-100 p-3 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"><Sparkles className="h-6 w-6"/></div>
       <h2 className="text-xl font-black text-slate-900 dark:text-white">Design Center</h2>
       <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Customize your admin, storefront and mobile experience. Preview light and dark themes before publishing.</p>
       <button type="button" onClick={()=>go("/admin/design-system")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-700">Open Design Center <ArrowUpRight className="h-4 w-4"/></button>
     </div>
   </div>
   <AdminActionRequired />
   <section aria-label="Marketplace trends" className="admin-charts grid min-w-0 gap-5 xl:grid-cols-2">
    <article className="admin-chart-card min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#2e425e] dark:bg-[#111f35]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white"><BarChart3 className="h-5 w-5 text-blue-600"/>Sales overview</h2><p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">Last 7 days · completed marketplace activity</p></div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700 dark:text-slate-200" aria-label="Sales chart legend"><span className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#1769ff]"/>Orders</span><span className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#16a6b6]"/>GMV (£)</span></div>
      </div>
      <div className="admin-chart-plot h-[275px] min-w-0" role="img" aria-label="Seven day orders and gross merchandise value trends">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={s.salesTrend} margin={{top:8,right:12,left:0,bottom:5}}>
            <CartesianGrid vertical={false} stroke="var(--bz-chart-grid, #dce5f1)" strokeDasharray="4 4"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"var(--bz-chart-tick, #52647c)",fontSize:11}} tickMargin={12}/>
            <YAxis yAxisId="orders" allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{fill:"var(--bz-chart-tick, #52647c)",fontSize:11}}/>
            <YAxis yAxisId="gmv" orientation="right" axisLine={false} tickLine={false} width={48} tickFormatter={(v:number)=>"£"+v.toLocaleString("en-GB")} tick={{fill:"var(--bz-chart-tick, #52647c)",fontSize:11}}/>
            <Tooltip contentStyle={{background:"var(--bz-chart-tooltip, #ffffff)",color:"var(--bz-chart-tooltip-text, #0f172a)",border:"1px solid var(--bz-chart-grid, #dce5f1)",borderRadius:12}} formatter={(v:any,name:any)=>name==="GMV"?[money(Number(v)),"GMV"]:[num(Number(v)),"Orders"]}/>
            <Line yAxisId="orders" name="Orders" type="monotone" dataKey="orders" stroke="#1769ff" strokeWidth={3} dot={{r:3,fill:"#1769ff"}} activeDot={{r:6}}/>
            <Line yAxisId="gmv" name="GMV" type="monotone" dataKey="gmv" stroke="#16a6b6" strokeWidth={3} dot={{r:3,fill:"#16a6b6"}} activeDot={{r:6}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
    <article className="admin-chart-card min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-[#2e425e] dark:bg-[#111f35]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white"><Users className="h-5 w-5 text-blue-600"/>User growth</h2><p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">Last 30 days · daily registrations</p></div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#1769ff]"/>New users</span>
      </div>
      <div className="admin-chart-plot h-[275px] min-w-0" role="img" aria-label="Daily user registrations over the last thirty days">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={s.userTrend} margin={{top:8,right:8,left:0,bottom:5}} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--bz-chart-grid, #dce5f1)" strokeDasharray="4 4"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={22} tickMargin={12} tick={{fill:"var(--bz-chart-tick, #52647c)",fontSize:11}}/>
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{fill:"var(--bz-chart-tick, #52647c)",fontSize:11}}/>
            <Tooltip cursor={{fill:"var(--bz-chart-hover, #edf4ff)"}} contentStyle={{background:"var(--bz-chart-tooltip, #ffffff)",color:"var(--bz-chart-tooltip-text, #0f172a)",border:"1px solid var(--bz-chart-grid, #dce5f1)",borderRadius:12}}/>
            <Bar name="New users" dataKey="users" fill="#1769ff" maxBarSize={22} radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
   </section>
   <div><h2 className="text-sm font-black text-slate-500 dark:text-slate-300 uppercase tracking-wide mb-3">Operations</h2><div className="admin-operations grid grid-cols-1 min-[390px]:grid-cols-2 md:grid-cols-4 gap-3">{[["Orders","/admin/orders",ShoppingBag],["Importer Control","/admin/importer-control",Activity],["Credits Economy","/admin/credits-economy",Coins],["Settings","/admin/settings",Settings]].map(([label,href,Icon]:any)=><button key={href} onClick={()=>go(href)} className="bg-white dark:bg-[#172541] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-[#1769ff]"><Icon className="w-5 h-5 text-[#1769ff]"/><span className="font-bold text-sm">{label}</span></button>)}</div></div>
   <div className="admin-payments bg-white dark:bg-[#172541] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b"><h2 className="font-black">Recent Stripe payments</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100 dark:bg-[#233452] text-left text-xs uppercase text-slate-500 dark:text-slate-300"><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody>{s.recentPayments.length?s.recentPayments.map(p=><tr key={p.id} className="border-t border-slate-200 dark:border-white/10"><td className="p-3">{p.email}</td><td className="p-3 font-bold">{p.currency} {p.amount.toFixed(2)}</td><td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${p.status==="paid"?"bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200":"bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"}`}>{p.status}</span></td><td className="p-3">{new Date(p.date).toLocaleString("en-GB")}</td></tr>):<tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-300">No recent Stripe payments</td></tr>}</tbody></table></div></div>
  </>}
 </div></AdminLayout>
}
