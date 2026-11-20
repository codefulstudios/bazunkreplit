import {useMemo,useState} from "react";
import {useLocation} from "wouter";
import {ArrowRight,BarChart3,Gift,LifeBuoy,Mail,Package,RefreshCcw,Search,ServerCog,Settings,ShieldCheck,ShoppingBag,Users,WandSparkles,Zap,ScrollText,Flag,CircleDollarSign,ArrowDownToLine,MessageSquare} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {AdminLayout} from "./AdminLayout";
import {AdminPageHeader,AdminPanel,AdminEmptyState} from "@/components/admin/AdminUi";

type Tool={title:string;description:string;href:string;icon:LucideIcon};
type Group={title:string;description:string;tools:Tool[]};
const MARKETING:Group[]=[
 {title:"Campaigns & growth",description:"Run promotions and bring shoppers back",tools:[
  {title:"Promotions",description:"Create and manage active promotions",href:"/admin/promotions",icon:Zap},
  {title:"Cashback",description:"Manage buyer cashback rules and activity",href:"/admin/cashback",icon:Gift},
  {title:"Referral rewards",description:"Review referral activity and rewards",href:"/admin/referrals",icon:Users},
  {title:"Rewards Arcade",description:"Manage the shopper rewards programme",href:"/admin/rewards",icon:ShoppingBag}
 ]},
 {title:"Messages & incentives",description:"Control communication and reward economics",tools:[
  {title:"Email templates",description:"Edit buyer and seller notification content",href:"/admin/emails",icon:Mail},
  {title:"Credits Economy",description:"Review credits and reward controls",href:"/admin/credits-economy",icon:CircleDollarSign},
  {title:"Marketing analytics",description:"Review marketplace sales and growth",href:"/admin/analytics",icon:BarChart3}
 ]}
];
const IMPORTERS:Group[]=[
 {title:"Import & monitor",description:"Bring products into Bazunk and inspect source health",tools:[
  {title:"Importers",description:"Configure connected importer sources and import listings",href:"/admin/imports",icon:ArrowDownToLine},
  {title:"Importer Control",description:"Monitor source sync, failures and usage",href:"/admin/importer-control",icon:RefreshCcw},
  {title:"System Status",description:"Check provider connections and reported errors",href:"/admin/system-status",icon:ServerCog}
 ]},
 {title:"Listing automation",description:"Other tools for creating and managing catalogue entries",tools:[
  {title:"Snap & Sell AI",description:"Photo-assisted listing creation settings",href:"/admin/snap-sell",icon:WandSparkles},
  {title:"Demo Creator",description:"Manage demonstration listings",href:"/admin/demo-creator",icon:Package},
  {title:"Listings",description:"Review and edit imported products",href:"/admin/listings",icon:ShoppingBag}
 ]}
];
const SETTINGS:Group[]=[
 {title:"Marketplace configuration",description:"Change settings using Bazunk's existing validated controls",tools:[
  {title:"Marketplace Settings",description:"Website operations, seller policies and platform options",href:"/admin/settings",icon:Settings},
  {title:"Feature Toggles",description:"Enable or disable supported site features",href:"/admin/feature-toggles",icon:Flag},
  {title:"System Status",description:"Test integrations and inspect service health",href:"/admin/system-status",icon:ServerCog},
  {title:"Audit Log",description:"Review recorded administrative changes",href:"/admin/audit-log",icon:ScrollText}
 ]},
 {title:"Trust & support",description:"Manage seller verification and customer support systems",tools:[
  {title:"Seller Compliance",description:"Review seller verification and appeals",href:"/admin/seller-compliance",icon:ShieldCheck},
  {title:"Support",description:"Review support cases and customer requests",href:"/admin/support",icon:LifeBuoy},
  {title:"Chatwoot Settings",description:"Configure support chat integration",href:"/admin/chatwoot",icon:MessageSquare},
  {title:"Email Templates",description:"Manage transactional email messages",href:"/admin/emails",icon:Mail}
 ]}
];
function Workspace({title,description,groups,helper}:{title:string;description:string;groups:Group[];helper:string}){
 const [,navigate]=useLocation();
 const [query,setQuery]=useState("");
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const normalized=query.toLocaleLowerCase().trim();
 const visible=useMemo(()=>groups.map(group=>({
  ...group,tools:group.tools.filter(tool=>!normalized||[group.title,group.description,tool.title,tool.description].some(text=>text.toLocaleLowerCase().includes(normalized)))
 })).filter(group=>group.tools.length),[groups,normalized]);
 const total=groups.reduce((count,group)=>count+group.tools.length,0);
 const matchCount=visible.reduce((count,group)=>count+group.tools.length,0);
 return <AdminLayout><div className="wp-operations-home space-y-5">
  <AdminPageHeader title={title} description={description} eyebrow="Bazunk administration"/>
  <div className="wp-operations-intro">
   <div><strong className="text-sm">Find what you need</strong><p className="mt-1 text-sm">{helper}</p></div>
   <label className="wp-operations-search"><Search aria-hidden="true" size={17}/><span className="sr-only">Search {title} tools</span>
    <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={"Search "+title.toLowerCase()+" tools"} aria-label={"Search "+title+" tools"}/>
   </label>
  </div>
  <p className="wp-operations-count" role="status">{normalized?matchCount+" matching tools":total+" tools available"} · Changes are made in the existing management pages</p>
  {!visible.length?<AdminPanel><AdminEmptyState title="No matching tools" description="Try another term or clear the search.">
   <button className="wp-action wp-action-secondary mt-3" onClick={()=>setQuery("")} type="button">Clear search</button>
  </AdminEmptyState></AdminPanel>:visible.map(group=><AdminPanel key={group.title} title={group.title} subtitle={group.description}
    action={<button type="button" aria-expanded={expanded[group.title]!==false} onClick={()=>setExpanded(previous=>({...previous,[group.title]:previous[group.title]===false}))} className="wp-action wp-action-secondary wp-operations-collapse">{expanded[group.title]===false?"Show tools":"Hide tools"}</button>}>
    {expanded[group.title]!==false&&<div className="wp-operations-tools">{group.tools.map(tool=><button key={tool.href} type="button" className="wp-operations-tool" onClick={()=>navigate(tool.href)} aria-label={"Open "+tool.title}>
     <span className="wp-operations-icon"><tool.icon size={21} aria-hidden="true"/></span>
     <span className="min-w-0 flex-1"><strong>{tool.title}</strong><small>{tool.description}</small></span>
     <ArrowRight size={17} aria-hidden="true" className="wp-operations-arrow"/>
    </button>)}</div>}
   </AdminPanel>)}
 </div></AdminLayout>;
}
export function AdminMarketingOverviewPage(){
 return <Workspace title="Marketing" description="Promotions, rewards and messaging in one straightforward workspace." helper="Select a marketing task below. Your existing promotions and rewards remain unchanged." groups={MARKETING}/>;
}
export function AdminImporterOverviewPage(){
 return <Workspace title="Importers" description="Import product listings and monitor connected sources." helper="Start in Importers to import listings, or use Importer Control to investigate failures." groups={IMPORTERS}/>;
}
export function AdminSettingsOverviewPage(){
 return <Workspace title="Settings & Tools" description="Platform configuration, operations, trust and support." helper="Choose a specific settings page. Nothing changes until you use its existing save or action controls." groups={SETTINGS}/>;
}
