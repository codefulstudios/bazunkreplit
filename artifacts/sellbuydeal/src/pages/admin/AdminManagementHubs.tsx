import {useCallback,useEffect,useState} from "react";
import {useLocation} from "wouter";
import {LineChart,Line,CartesianGrid,XAxis,YAxis,ResponsiveContainer,Tooltip,BarChart,Bar} from "recharts";
import {FileText,Mail,Palette,Settings,BarChart3,TrendingUp,Users,ShoppingBag,Package,RefreshCw,ArrowUpRight,Download} from "lucide-react";
import {AdminLayout} from "./AdminLayout";
import {AdminPageHeader,AdminPanel,AdminMetric,AdminAction,AdminEmptyState} from "@/components/admin/AdminUi";
import {useAdmin} from "@/context/AdminContext";
type Summary={orderCount:number;gmv:number;userCount:number;activeListings:number;userTrend:Array<{label:string;users:number}>;salesTrend:Array<{label:string;gmv:number;orders:number}>};
const num=(n:number)=>new Intl.NumberFormat("en-GB").format(n||0);
const gbp=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n||0);
export function AdminContentPage(){
 const [,go]=useLocation();
 const links=[
  {title:"Email templates",desc:"Edit buyer and seller notifications",href:"/admin/emails",icon:Mail},
  {title:"Theme Studio",desc:"Edit logo, homepage copy and footer with live preview",href:"/admin/theme-studio",icon:Palette},
  {title:"Homepage and section appearance",desc:"Open Design Center to edit visual sections",href:"/admin/design-system",icon:FileText},
  {title:"Marketplace settings",desc:"Manage site policies and configuration",href:"/admin/settings",icon:Settings}
 ];
 return <AdminLayout><AdminPageHeader title="Content" description="A simpler starting point for the website content tools already available in Bazunk."/>
  <AdminPanel title="Content management" subtitle="Select the editor you need. Existing settings and saved content remain unchanged.">
   <div className="grid gap-3 sm:grid-cols-2">{links.map(link=><button key={link.title} type="button" onClick={()=>go(link.href)} className="wp-shortcut min-h-[85px]"><link.icon size={22}/><span><strong>{link.title}</strong><small>{link.desc}</small></span><ArrowUpRight size={17} className="ml-auto"/></button>)}</div>
   <p className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Content editors use their existing permissions and save controls. Theme Studio also supports editable homepage section ordering; review its layout separately.</p>
  </AdminPanel></AdminLayout>;
}
export function AdminAnalyticsPage(){
 const {authFetch}=useAdmin();const [data,setData]=useState<Summary|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [lastUpdated,setLastUpdated]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await authFetch("/api/admin/stats");if(!r.ok)throw Error("Cannot load analytics");const j=await r.json();if(!Array.isArray(j.salesTrend)||!Array.isArray(j.userTrend))throw Error("Invalid analytics response");setData(j);setLastUpdated(new Date().toISOString())}catch(e){setError(e instanceof Error?e.message:"Analytics unavailable")}finally{setLoading(false)}},[authFetch]);
 useEffect(()=>{void load()},[load]);
 function exportAnalytics(){
  if(!data)return;
  const safe=(value:unknown)=>{
   const string=String(value??"");
   const normalized=/^[=+@\\-\\t\\r]/.test(string)?"'"+string:string;
   return '"'+normalized.replaceAll('"','""')+'"';
  };
  const rows:Array<Array<string|number>>=[
   ["Metric","Value"],["Gross merchandise value",data.gmv],["Total orders",data.orderCount],
   ["Customers",data.userCount],["Active listings",data.activeListings],[],
   ["Sales period","GMV","Orders"],
   ...data.salesTrend.map(item=>[item.label,item.gmv,item.orders]),[],
   ["Registration period","New users"],...data.userTrend.map(item=>[item.label,item.users])
  ];
  const csv=rows.map(row=>row.map(safe).join(",")).join("\\r\\n");
  const blob=new Blob(["\\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const href=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=href;a.download="bazunk-admin-analytics-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 return <AdminLayout><div className="space-y-5">
   <AdminPageHeader title="Analytics" description="Real marketplace activity and trends from Bazunk's administration API." actions={<><AdminAction icon={Download} onClick={exportAnalytics} disabled={!data||loading}>Export CSV</AdminAction><AdminAction icon={RefreshCw} onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"Refresh"}</AdminAction></>}/>
   <p className="wp-report-meta">{lastUpdated?"Last refreshed "+new Date(lastUpdated).toLocaleString("en-GB"):"Loading the latest available reporting data"} · No simulated sales or users</p>
   {error&&<p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">{error}</p>}
   <div className="wp-dashboard-kpis">
    <AdminMetric label="Gross merchandise value" value={data?gbp(data.gmv):"—"} icon={TrendingUp} tone="green"/>
    <AdminMetric label="Total orders" value={data?num(data.orderCount):"—"} icon={ShoppingBag}/>
    <AdminMetric label="Customers" value={data?num(data.userCount):"—"} icon={Users} tone="violet"/>
    <AdminMetric label="Active listings" value={data?num(data.activeListings):"—"} icon={Package} tone="orange"/>
   </div>
   <div className="wp-dashboard-layout">
    <AdminPanel title="Sales & GMV" subtitle="Recent recorded sales trend">
     {data?.salesTrend?.length?<div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.salesTrend}><CartesianGrid vertical={false} stroke="var(--wp-border)"/><XAxis dataKey="label" tick={{fill:"var(--wp-muted)"}}/><YAxis tick={{fill:"var(--wp-muted)"}}/><Tooltip contentStyle={{background:"var(--wp-surface)",color:"var(--wp-ink)"}}/><Line dataKey="gmv" name="GMV" stroke="#1769ff" strokeWidth={3}/></LineChart></ResponsiveContainer></div>:<AdminEmptyState title="No sales trend available"/>}
    </AdminPanel>
    <AdminPanel title="Registration trends" subtitle="New user registrations">
     {data?.userTrend?.length?<div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.userTrend}><CartesianGrid vertical={false} stroke="var(--wp-border)"/><XAxis dataKey="label" tick={{fill:"var(--wp-muted)",fontSize:11}}/><YAxis tick={{fill:"var(--wp-muted)"}}/><Tooltip contentStyle={{background:"var(--wp-surface)",color:"var(--wp-ink)"}}/><Bar dataKey="users" fill="#1769ff" name="New users" maxBarSize={25}/></BarChart></ResponsiveContainer></div>:<AdminEmptyState title="No registration trend available"/>}
    </AdminPanel>
   </div>
  </div></AdminLayout>;
}
