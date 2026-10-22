import {useCallback,useEffect,useState} from "react";
import {useLocation} from "wouter";
import {LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from "recharts";
import {ShoppingCart,Users,Package,TrendingUp,RefreshCw,Plus,Store,ShieldCheck,Activity,Palette,ArrowUpRight,AlertCircle,ArrowDownToLine,Coins,CalendarDays,BarChart3} from "lucide-react";
import {AdminLayout} from "./AdminLayout";
import {AdminActionRequired} from "@/components/admin/AdminActionRequired";
import {AdminPageHeader,AdminPanel,AdminMetric,AdminAction,AdminTableFrame,AdminEmptyState} from "@/components/admin/AdminUi";
import {useAdmin} from "@/context/AdminContext";

type Stats={orderCount:number;gmv:number;gmvToday:number;userCount:number;activeListings:number;openDisputes:number;openReturns:number;businessFees:number;buyerProtection:number;newUsersWeek:number;salesTrend:Array<{label:string;gmv:number;orders:number}>;userTrend:Array<{label:string;users:number}>};
type Order={id:string;item_title?:string;buyer_email?:string;buyer_total?:number|string;price?:number|string;currency?:string;payment_status?:string;status?:string;created_at?:string};
const money=(n:number,currency="GBP")=>new Intl.NumberFormat("en-GB",{style:"currency",currency:["GBP","USD","EUR"].includes(currency)?currency:"GBP",maximumFractionDigits:2}).format(Number(n)||0);
const num=(n:number)=>new Intl.NumberFormat("en-GB").format(Number(n)||0);
const shortDate=(s?:string)=>{const d=new Date(s||"");return Number.isFinite(d.getTime())?d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"};
const shortcuts=[
 {label:"Manage listings",description:"Review your catalogue",href:"/admin/listings",icon:Package},
 {label:"View orders",description:"Manage purchases",href:"/admin/orders",icon:ShoppingCart},
 {label:"Manage sellers",description:"Verification and compliance",href:"/admin/seller-compliance",icon:Store},
 {label:"Marketing tools",description:"Offers and campaigns",href:"/admin/promotions",icon:TrendingUp},
 {label:"Design Center",description:"Customise your website",href:"/admin/design-system",icon:Palette},
 {label:"Import products",description:"Manage product sources",href:"/admin/imports",icon:ArrowDownToLine}
];
export function AdminWordPressDashboard(){
 const {isAdmin,authFetch}=useAdmin();const [,go]=useLocation();
 const [stats,setStats]=useState<Stats|null>(null);
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [statsError,setStatsError]=useState("");
 const [ordersError,setOrdersError]=useState("");
 const load=useCallback(async()=>{
   setLoading(true);setStatsError("");setOrdersError("");
   try {
     const [sr,or]=await Promise.allSettled([authFetch("/api/admin/stats"),authFetch("/api/admin/orders?q=&status=")]);
     if(sr.status==="fulfilled"&&sr.value.ok) {
       const data=await sr.value.json();
       if(!data||typeof data.orderCount!=="number"||!Array.isArray(data.salesTrend))throw Error("Unexpected dashboard data");
       setStats(data);
     } else {setStatsError("Dashboard metrics could not be loaded.");}
     if(or.status==="fulfilled"&&or.value.ok){
       const response=await or.value.json();
       const rows=Array.isArray(response)?response:response?.orders;
       if(Array.isArray(rows))setOrders(rows.filter(o=>o&&typeof o.id==="string").slice(0,6));
       else setOrdersError("Recent orders are temporarily unavailable.");
     } else {setOrdersError("Recent orders are temporarily unavailable.");}
   }catch{setStatsError("Unable to load the marketplace summary.");}
   finally{setLoading(false)}
 },[authFetch]);
 useEffect(()=>{if(isAdmin)void load();else go("/admin")},[isAdmin,load,go]);
 return <AdminLayout><div className="wp-dashboard space-y-4 sm:space-y-5">
  <AdminPageHeader title="Dashboard" description="Overview of your marketplace performance, recent activity and important tasks."
    actions={<><span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-[#172541] dark:text-slate-200"><CalendarDays className="h-4 w-4"/>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span><AdminAction icon={RefreshCw} onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"Refresh data"}</AdminAction></>}/>
  {statsError&&<div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">{statsError}</div>}
  <div className="wp-dashboard-kpis">
   <AdminMetric label="Total orders" value={stats?num(stats.orderCount):"—"} detail="Marketplace orders" icon={ShoppingCart} onClick={()=>go("/admin/orders")}/>
   <AdminMetric label="Gross merchandise value" value={stats?money(stats.gmv):"—"} detail={stats?"Today: "+money(stats.gmvToday):"Live marketplace totals"} icon={TrendingUp} tone="green"/>
   <AdminMetric label="Customers" value={stats?num(stats.userCount):"—"} detail={stats?num(stats.newUsersWeek)+" new in 7 days":"Registered accounts"} icon={Users} tone="violet" onClick={()=>go("/admin/users")}/>
   <AdminMetric label="Active listings" value={stats?num(stats.activeListings):"—"} detail="Currently available" icon={Store} tone="orange" onClick={()=>go("/admin/listings")}/>
  </div>
  <div className="wp-dashboard-layout">
   <AdminPanel title="Marketplace Performance" subtitle="Sales value during the last seven reported days" action={<button type="button" onClick={()=>go("/admin/analytics")} className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300">More analytics →</button>}>
    {stats?.salesTrend?.length?<div className="h-[265px] w-full" role="img" aria-label="Seven-day marketplace sales chart"><ResponsiveContainer width="100%" height="100%">
     <LineChart data={stats.salesTrend} margin={{top:10,right:14,left:0,bottom:0}}>
      <CartesianGrid vertical={false} stroke="var(--wp-border)" strokeDasharray="3 3"/>
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"var(--wp-muted)",fontSize:11}}/>
      <YAxis tickFormatter={(n:number)=>"£"+num(n)} axisLine={false} tickLine={false} width={63} tick={{fill:"var(--wp-muted)",fontSize:11}}/>
      <Tooltip contentStyle={{background:"var(--wp-surface)",color:"var(--wp-ink)",border:"1px solid var(--wp-border)",borderRadius:9}} formatter={(value:any)=>money(Number(value))}/>
      <Line type="monotone" dataKey="gmv" name="Gross merchandise value" stroke="#1769ff" strokeWidth={3} dot={{r:3}} activeDot={{r:6}}/>
     </LineChart>
    </ResponsiveContainer></div>:<AdminEmptyState title={loading?"Loading chart…":"No sales trend available"} description="The graph appears when sales data is returned by the marketplace API."/>}
   </AdminPanel>
   <AdminPanel title="Quick Links" subtitle="Go straight to frequent tasks">
    <div className="wp-shortcut-grid">{shortcuts.map(({label,description,href,icon:Icon})=><button key={href} type="button" onClick={()=>go(href)} className="wp-shortcut">
     <Icon size={22} aria-hidden="true"/><span className="min-w-0"><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={15} aria-hidden="true" className="ml-auto"/>
    </button>)}</div>
   </AdminPanel>
  </div>
  <div className="wp-dashboard-layout">
   <AdminPanel title="Recent Orders" subtitle="Latest marketplace purchases" action={<button type="button" onClick={()=>go("/admin/orders")} className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300">View all orders →</button>}>
    {ordersError&&<p role="alert" className="mb-3 text-xs font-bold text-red-700 dark:text-red-300">{ordersError}</p>}
    {orders.length?<AdminTableFrame className="!border-0 !shadow-none"><table><thead><tr><th>Order</th><th>Item</th><th>Buyer</th><th>Value</th><th>Fulfilment</th><th>Date</th></tr></thead>
     <tbody>{orders.map(order=><tr key={order.id}>
       <td><button type="button" className="font-bold text-blue-700 hover:underline dark:text-blue-300" onClick={()=>go("/admin/orders")}>{order.id.slice(0,12)}</button></td>
       <td className="max-w-[190px] truncate" title={order.item_title||""}>{order.item_title||"—"}</td>
       <td className="max-w-[150px] truncate" title={order.buyer_email||""}>{order.buyer_email||"—"}</td>
       <td className="whitespace-nowrap">{money(Number(order.buyer_total??order.price??0),order.currency)}</td>
       <td><span className="font-semibold capitalize">{String(order.status||"unknown").replaceAll("_"," ")}</span></td>
       <td className="whitespace-nowrap">{shortDate(order.created_at)}</td>
     </tr>)}</tbody></table></AdminTableFrame>:<AdminEmptyState title={loading?"Loading orders…":"No recent orders to show"} description="New customer orders will appear here once available."/>}
   </AdminPanel>
   <AdminActionRequired/>
  </div>
  <div className="wp-dashboard-layout">
   <AdminPanel title="Marketplace Snapshot" subtitle="Financial and operational totals">
    <dl className="grid grid-cols-2 gap-4">{[
      ["Buyer Protection",stats?money(stats.buyerProtection):"—"],
      ["Business seller fees",stats?money(stats.businessFees):"—"],
      ["Open disputes",stats?num(stats.openDisputes):"—"],
      ["Open returns",stats?num(stats.openReturns):"—"]
    ].map(([label,value])=><div key={label} className="border-b border-slate-200 pb-3 dark:border-slate-600"><dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">{value}</dd></div>)}</dl>
   </AdminPanel>
   <AdminPanel title="System & Operations" subtitle="Inspect integration health and remaining work">
    <div className="grid gap-2">{[
      ["System status","/admin/system-status",Activity],
      ["Importer control","/admin/importer-control",ArrowDownToLine],
      ["Credits economy","/admin/credits-economy",Coins],
      ["Dispute resolution","/admin/disputes",ShieldCheck]
    ].map(([label,href,Icon]:any)=><button key={href} type="button" onClick={()=>go(href)} className="flex min-h-11 items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-sm font-semibold hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-[#273b57]"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue-600 dark:text-blue-300"/>{label}</span><ArrowUpRight className="h-4 w-4"/></button>)}</div>
   </AdminPanel>
  </div>
 </div></AdminLayout>;
}
