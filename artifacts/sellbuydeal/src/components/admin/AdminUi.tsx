import type {ReactNode} from "react";
import type {LucideIcon} from "lucide-react";
import {ArrowUpRight, Inbox} from "lucide-react";
import {useLocation} from "wouter";

// Shared WordPress-inspired management components. No business logic lives here.
export function AdminPageHeading({title,description,actions}:{title:string;description?:string;actions?:ReactNode}) {
 return <header className="wp-page-heading flex flex-wrap items-center justify-between gap-4">
   <div className="min-w-0"><h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>{description&&<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>}</div>
   {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
 </header>;
}
export function AdminPanel({title,description,action,children,className=""}:{title:string;description?:string;action?:ReactNode;children:ReactNode;className?:string}) {
 return <section className={"wp-admin-panel min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#17243a] "+className}>
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700"><div><h2 className="text-base font-bold text-slate-950 dark:text-white">{title}</h2>{description&&<p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>}</div>{action}</div>
   <div className="p-5">{children}</div>
 </section>;
}
export function AdminStatCard({title,value,detail,icon:Icon,tone="blue"}:{title:string;value:string;detail?:string;icon:LucideIcon;tone?:"blue"|"green"|"violet"|"orange"}) {
 const tones={blue:"bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",green:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",violet:"bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",orange:"bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200"};
 return <article className="wp-stat-card flex min-w-0 items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#17243a]">
  <span className={"inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full "+tones[tone]}><Icon className="h-6 w-6"/></span>
  <div className="min-w-0"><h2 className="text-sm font-medium text-slate-600 dark:text-slate-200">{title}</h2><strong className="mt-1 block break-words text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">{value}</strong>{detail&&<p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{detail}</p>}</div>
 </article>;
}
export function AdminQuickLink({title,description,href,icon:Icon}:{title:string;description:string;href:string;icon:LucideIcon}) {
 const [,go]=useLocation();
 return <button type="button" onClick={()=>go(href)} className="wp-quick-link flex min-h-16 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left hover:border-blue-400 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-[#20334e] dark:hover:bg-[#2b486b]">
  <span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-[#304c75] dark:text-blue-200"><Icon className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900 dark:text-white">{title}</strong><small className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">{description}</small></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300"/>
 </button>;
}
export function AdminEmptyState({title,description}:{title:string;description:string}) {
 return <div className="flex min-h-32 flex-col items-center justify-center px-4 py-8 text-center"><Inbox className="mb-2 h-8 w-8 text-slate-400"/><strong className="text-sm text-slate-800 dark:text-white">{title}</strong><p className="mt-1 max-w-sm text-xs text-slate-600 dark:text-slate-300">{description}</p></div>;
}
export function AdminTableWrap({children}:{children:ReactNode}) {
 return <div className="wp-admin-table overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">{children}</div>;
}
