import {useEffect,useState} from "react";
import {useLocation} from "wouter";
import {Activity,ArrowRight,BarChart3,CalendarDays,Coins,CreditCard,FileText,Mail,Megaphone,Package,RefreshCw,Settings,ShoppingCart,Store,Users} from "lucide-react";
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import {useAdmin} from "@/context/AdminContext";
import {AdminActionRequired} from "@/components/admin/AdminActionRequired";
import {AdminEmptyState,AdminPageHeading,AdminPanel,AdminQuickLink,AdminStatCard,AdminTableWrap} from "@/components/admin/AdminUi";
import {AdminLayout} from "./AdminLayout";

type Stats={
 userCount:number;activeListings:number;orderCount:number;gmv:number;gmvToday:number;
 openDisputes:number;openReturns:number;buyerProtection:number;businessFees:number;
 salesTrend:Array<{label:string;date:string;orders:number;gmv:number}>;
 userTrend:Array<{label:string;users:number}>;
 recentPayments:Array<{id:string;email:string;amount:number;currency:string;date:string;status:string}>;
};
type Order={id:string;item_title?:string;buyer_email?:string;buyer_total?:string|number;price?:number;currency?:string;payment_status?:string;status?:string;created_at?:string};
const num=(v:number)=>new Intl.NumberFormat("en-GB").format(v||0);
const gbp=(v:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(v||0);
const orderMoney=(o:Order)=>{const value=Number(o.buyer_total??o.price??0);const code=/^[A-Z]{3}$/.test(o.currency||"")?o.currency!:"GBP";try{return new Intl.NumberFormat("en-GB",{style:"currency",currency:code}).format(value)}catch{return num(value)}};
const readable=(value?:string)=>value?value.replaceAll("_"," "):"Unknown";

export function AdminDashboardWordpressPage(){
 const {isAdmin,authFetch}=useAdmin();
 const [,go]=useLocation();
 const [stats,setStats]=useState<Stats|null>(null);
 const [orders,setOrders]=useState<Order[]>([]);
 const [error,setError]=useState("");
 const [ordersWarning,setOrdersWarning]=useState("");
 const [loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);setError("");setOrdersWarning("");
  try{
   const r=await authFetch("/api/admin/stats",{cache:"no-store"});
   if(!r.ok)throw Error("Marketplace statistics are unavailable. Please retry.");
   const data=await r.json() as Stats;
   if(typeof data.orderCount!=="number"||!Array.isArray(data.salesTrend))throw Error("Dashboard statistics returned an unexpected response.");
   setStats(data);
   try{
    const or=await authFetch("/api/admin/orders?q=&status=",{cache:"no-store"});
    if(!or.ok)throw Error("Recent orders could not be loaded.");
    const body=await or.json();
    const rows=Array.isArray(body)?body:body?.orders;
    if(!Array.isArray(rows))throw Error("Orders response was not valid.");
    setOrders(rows.filter((o:Order)=>typeof o.id==="string").sort((a:Order,b:Order)=>Date.parse(b.created_at||"")-Date.parse(a.created_at||"")).slice(0,5));
   }catch(e){setOrders([]);setOrdersWarning(e instanceof Error?e.message:"Recent orders unavailable")}
  }catch(e){setStats(null);setError(e instanceof Error?e.message:"Unable to load marketplace data")}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(!isAdmin){go("/admin");return}void load()},[isAdmin]);
 return <AdminLayout><div className="wp-dashboard space-y-5">
  <AdminPageHeading title="Dashboard" description="Overview of marketplace performance, recent activity and system management."
   actions={<><span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-[#17243a] dark:text-slate-200"><CalendarDays className="h-4 w-4"/>{new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date())}</span><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-600 dark:bg-[#17243a] dark:text-blue-200"><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh</button></>}/>
  {error&&<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</div>}
  {!stats&&loading?<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4},(_,i)=><div key={i} className="h-36 animate-pulse rounded-xl bg-white dark:bg-[#17243a]"/>)}</div>:stats&&<>
   <section aria-label="Marketplace KPI cards" className="wp-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <AdminStatCard title="Total orders" value={num(stats.orderCount)} detail="Orders recorded" icon={ShoppingCart} tone="blue"/>
    <AdminStatCard title="Gross sales" value={gbp(stats.gmv)} detail={"Today "+gbp(stats.gmvToday)} icon={Coins} tone="green"/>
    <AdminStatCard title="Registered users" value={num(stats.userCount)} detail="Marketplace accounts" icon={Users} tone="violet"/>
    <AdminStatCard title="Active listings" value={num(stats.activeListings)} detail="Currently for sale" icon={Store} tone="orange"/>
   </section>
   <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
    <AdminPanel title="Marketplace performance" description="Seven-day trend from marketplace records" action={<button type="button" onClick={()=>go("/admin/analytics")} className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-200">More analytics <ArrowRight className="inline h-3 w-3"/></button>}>
     <div className="wp-chart-plot h-[285px] min-w-0" role="img" aria-label="Seven-day sales volume and gross merchandise value">
      <ResponsiveContainer width="100%" height="100%">
       <LineChart data={stats.salesTrend||[]} margin={{top:8,right:10,left:0,bottom:6}}>
        <CartesianGrid vertical={false} stroke="var(--bz-chart-grid,#dbe5f1)" strokeDasharray="3 4"/>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{fill:"var(--bz-chart-tick,#52647c)",fontSize:11}}/>
        <YAxis yAxisId="orders" allowDecimals={false} axisLine={false} tickLine={false} width={33} tick={{fill:"var(--bz-chart-tick,#52647c)",fontSize:11}}/>
        <YAxis yAxisId="gmv" orientation="right" axisLine={false} tickLine={false} width={50} tickFormatter={(v:number)=>"£"+num(v)} tick={{fill:"var(--bz-chart-tick,#52647c)",fontSize:11}}/>
        <Tooltip contentStyle={{background:"var(--bz-chart-tooltip,#fff)",color:"var(--bz-chart-tooltip-text,#0f172a)",border:"1px solid var(--bz-chart-grid,#dbe5f1)",borderRadius:10}}/>
        <Line name="Orders" yAxisId="orders" dataKey="orders" stroke="#1769ff" strokeWidth={2.5} activeDot={{r:5}} dot={{r:2}} type="monotone"/>
        <Line name="GMV (£)" yAxisId="gmv" dataKey="gmv" stroke="#0e9f79" strokeWidth={2.5} activeDot={{r:5}} dot={{r:2}} type="monotone"/>
       </LineChart>
      </ResponsiveContainer>
     </div>
     <div className="mt-2 flex gap-4 text-xs font-semibold text-slate-600 dark:text-slate-200"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#1769ff]"/>Orders</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0e9f79]"/>GMV</span></div>
    </AdminPanel>
    <AdminPanel title="Quick links" description="Common administration tasks">
     <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      <AdminQuickLink title="Manage listings" description="Review marketplace products" href="/admin/listings" icon={Package}/>
      <AdminQuickLink title="View orders" description="Manage fulfilment" href="/admin/orders" icon={ShoppingCart}/>
      <AdminQuickLink title="Manage sellers" description="Compliance and verification" href="/admin/seller-compliance" icon={Users}/>
      <AdminQuickLink title="Marketing tools" description="Promotions and rewards" href="/admin/promotions" icon={Megaphone}/>
      <AdminQuickLink title="Design Center" description="Customise your marketplace" href="/admin/design-system" icon={Settings}/>
      <AdminQuickLink title="Import products" description="Manage import sources" href="/admin/imports" icon={Package}/>
     </div>
    </AdminPanel>
   </div>
   <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
    <AdminPanel title="Recent orders" description="Latest recorded marketplace orders" action={<button type="button" onClick={()=>go("/admin/orders")} className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-200">View all orders <ArrowRight className="inline h-3 w-3"/></button>}>
     {ordersWarning&&<p role="status" className="mb-3 text-xs font-semibold text-amber-700 dark:text-amber-200">{ordersWarning}</p>}
     {orders.length?<AdminTableWrap><table className="w-full min-w-[620px] text-left text-sm">
      <thead><tr className="bg-slate-50 text-xs font-semibold text-slate-700 dark:bg-[#223551] dark:text-slate-200"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
      <tbody>{orders.map(o=><tr key={o.id} className="border-t border-slate-100 text-slate-800 dark:border-slate-700 dark:text-slate-100">
       <td className="max-w-36 truncate p-3"><button type="button" onClick={()=>go("/admin/orders")} className="font-semibold text-blue-700 hover:underline dark:text-blue-200" title={o.item_title||o.id}>{o.id.length>12?o.id.slice(0,10)+"…":o.id}</button></td>
       <td className="max-w-44 truncate p-3" title={o.buyer_email}>{o.buyer_email||"—"}</td>
       <td className="whitespace-nowrap p-3 font-semibold">{orderMoney(o)}</td>
       <td className="p-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-800 dark:bg-[#2b4664] dark:text-white">{readable(o.payment_status)}</span></td>
       <td className="p-3 text-xs capitalize">{readable(o.status)}</td>
       <td className="whitespace-nowrap p-3 text-xs">{o.created_at?new Date(o.created_at).toLocaleDateString("en-GB"):"—"}</td>
      </tr>)}</tbody>
     </table></AdminTableWrap>:<AdminEmptyState title="No recent orders to display" description="Orders will appear here once available; manage all orders from the Orders page."/>}
    </AdminPanel>
    <div className="space-y-4"><AdminActionRequired/>
     <AdminPanel title="System status" description="Service checks and administrative tools">
      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
       <p className="flex justify-between"><span>Open disputes</span><strong className="tabular-nums text-slate-950 dark:text-white">{num(stats.openDisputes)}</strong></p>
       <p className="flex justify-between"><span>Open returns</span><strong className="tabular-nums text-slate-950 dark:text-white">{num(stats.openReturns)}</strong></p>
       <button type="button" onClick={()=>go("/admin/system-status")} className="mt-2 flex w-full items-center justify-between rounded-lg border border-blue-200 p-3 font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-200">Run system checks <Activity className="h-4 w-4"/></button>
      </div>
     </AdminPanel>
    </div>
   </div>
   <details className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#17243a]">
    <summary className="cursor-pointer text-sm font-bold text-slate-900 dark:text-white">More performance details and tools</summary>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
     <AdminStatCard title="Buyer protection" value={gbp(stats.buyerProtection)} icon={CreditCard}/>
     <AdminStatCard title="Business fees" value={gbp(stats.businessFees)} icon={Coins}/>
     <AdminStatCard title="Open disputes" value={num(stats.openDisputes)} icon={FileText}/>
     <AdminStatCard title="Open returns" value={num(stats.openReturns)} icon={Package}/>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
     <AdminQuickLink title="Email templates" description="Manage transactional email" href="/admin/emails" icon={Mail}/>
     <AdminQuickLink title="Credits economy" description="Manage reward credits" href="/admin/credits-economy" icon={Coins}/>
     <AdminQuickLink title="Importer control" description="Review source health" href="/admin/importer-control" icon={Activity}/>
     <AdminQuickLink title="Feature toggles" description="Configure marketplace modules" href="/admin/feature-toggles" icon={Settings}/>
    </div>
   </details>
  </>}
 </div></AdminLayout>;
}
