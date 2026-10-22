import {useEffect,useState} from "react";
import {BarChart3,CloudDownload,FileText,Mail,Palette,Activity,Users,Package,Megaphone,ShieldCheck,Settings} from "lucide-react";
import {useAdmin} from "@/context/AdminContext";
import {AdminLayout} from "./AdminLayout";
import {AdminPageHeading,AdminPanel,AdminQuickLink,AdminStatCard} from "@/components/admin/AdminUi";

export function AdminContentPage(){
 return <AdminLayout><div className="wp-admin-workspace space-y-5">
  <AdminPageHeading title="Content" description="Find the existing tools for website content, branding and communication."/>
  <AdminPanel title="Content management" description="All links open real Bazunk admin editors; a visual page builder is planned for a later stage.">
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <AdminQuickLink title="Design Center" description="Edit branding, themes and page appearance" href="/admin/design-system" icon={Palette}/>
    <AdminQuickLink title="Email templates" description="Edit marketplace email messages" href="/admin/emails" icon={Mail}/>
    <AdminQuickLink title="Demo Creator" description="Manage demonstration listings" href="/admin/demo-creator" icon={FileText}/>
    <AdminQuickLink title="Promotions" description="Manage marketing and homepage offers" href="/admin/promotions" icon={Megaphone}/>
    <AdminQuickLink title="Marketplace settings" description="Manage content and configuration" href="/admin/settings" icon={Settings}/>
   </div>
  </AdminPanel>
 </div></AdminLayout>;
}
type Snapshot={userCount:number;activeListings:number;orderCount:number;gmv:number;openDisputes:number;openReturns:number;};
const number=(value:number)=>new Intl.NumberFormat("en-GB").format(value||0);
const currency=(value:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value||0);
export function AdminAnalyticsPage(){
 const {authFetch}=useAdmin();const [stats,setStats]=useState<Snapshot|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;authFetch("/api/admin/stats",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Statistics are not available.");return r.json()}).then(data=>{if(active)setStats(data)}).catch(e=>{if(active)setError(e.message||"Analytics could not be loaded")});return()=>{active=false}},[authFetch]);
 return <AdminLayout><div className="wp-admin-workspace space-y-5">
  <AdminPageHeading title="Analytics" description="Current marketplace totals and links to operational reports."/>
  {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
  {stats?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <AdminStatCard title="Gross sales" value={currency(stats.gmv)} icon={BarChart3} tone="green"/>
    <AdminStatCard title="Total orders" value={number(stats.orderCount)} icon={Package}/>
    <AdminStatCard title="Registered users" value={number(stats.userCount)} icon={Users} tone="violet"/>
    <AdminStatCard title="Active listings" value={number(stats.activeListings)} icon={Package} tone="orange"/>
   </div>:!error&&<p className="text-sm text-slate-600 dark:text-slate-200">Loading marketplace analytics…</p>}
  <AdminPanel title="Detailed operational reports" description="Open the relevant existing administrative tools.">
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <AdminQuickLink title="System Status" description="API and integration health checks" href="/admin/system-status" icon={Activity}/>
    <AdminQuickLink title="Importer Control" description="Import performance and errors" href="/admin/importer-control" icon={CloudDownload}/>
    <AdminQuickLink title="Audit Log" description="Recorded administration changes" href="/admin/audit-log" icon={FileText}/>
    <AdminQuickLink title="Seller Compliance" description="Verification and seller reviews" href="/admin/seller-compliance" icon={ShieldCheck}/>
    <AdminQuickLink title="Payment reports" description="Transactions and payouts" href="/admin/payments" icon={BarChart3}/>
   </div>
  </AdminPanel>
 </div></AdminLayout>;
}
