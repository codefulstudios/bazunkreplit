import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./AdminLayout";
import { RapidApiPanel } from "./RapidApiPanel";
import { CraigslistAdminImporter } from "./CraigslistAdminImporter";
import { OLXAdminImporter } from "./OlxAdminImporter";
import { useAdmin } from "@/context/AdminContext";

const sources = [
 {name:"Amazon",href:"/admin/importers/amazon",detail:"UK and USA product searches, imports and markup"},
 {name:"eBay",href:"/admin/importers/ebay",detail:"eBay searches, source-specific listing management and sync"},
 {name:"AliExpress",href:"/admin/importers/aliexpress",detail:"AliExpress search and import using the configured integration"},
 {name:"Gumtree",href:"/admin/importers/gumtree",detail:"Classified adverts and expiry controls"},
 {name:"Craigslist",href:"/admin/importers/craigslist",detail:"RapidAPI search · separate 100 monthly request hard cap"},
 {name:"OLX",href:"/admin/importers/olx",detail:"RapidAPI search · separate 100 monthly request hard cap"},
];
export function AdminImporterOverviewPage(){
 return <AdminLayout><div className="space-y-5 text-slate-900 dark:text-white">
  <div><h1 className="text-2xl font-black">Importers</h1><p className="text-slate-700 dark:text-slate-200">Each provider now has its own workspace. Choose a source to manage its searches and listings.</p></div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{sources.map(s=><Link key={s.href} href={s.href} className="block rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-5 hover:border-orange-500"><h2 className="font-bold text-lg">{s.name}</h2><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{s.detail}</p><span className="block text-orange-700 dark:text-orange-300 font-bold mt-4">Open importer →</span></Link>)}</div>
  <div className="flex flex-wrap gap-3"><Link href="/admin/importers/settings" className="rounded-lg bg-blue-700 text-white font-bold px-4 py-3">General settings</Link><Link href="/admin/importers/bulk-update" className="rounded-lg bg-orange-600 text-white font-bold px-4 py-3">Apply update to all</Link><Link href="/admin/importer-control" className="rounded-lg border border-slate-400 px-4 py-3 font-bold">Importer monitoring</Link></div>
 </div></AdminLayout>;
}
export function AdminImporterSettingsPage(){
 return <AdminLayout><div className="space-y-5"><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Importer general settings</h1><p className="text-slate-700 dark:text-slate-200">Manage shared API credentials here, rather than on every importer page.</p></div>
 <RapidApiPanel/>
 <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 p-5 text-slate-900 dark:text-white"><h2 className="font-bold">Provider configuration</h2><p className="text-sm mt-2">Craigslist: CRAIGSLIST_RAPIDAPI_HOST and CRAIGSLIST_RAPIDAPI_SEARCH_URL. OLX: OLX_RAPIDAPI_HOST and OLX_RAPIDAPI_SEARCH_URL. Configure these on the Render API service; keys remain on the server. Both have independent, non-resettable 100-request monthly application caps.</p><p className="text-sm mt-2">Provider search and preview are not the same as publishing listings. Check source permissions and availability before advertising items.</p></div></div></AdminLayout>;
}
export function AdminImporterBulkUpdatePage(){
 const {authFetch}=useAdmin();
 const [markup,setMarkup]=useState("35");
 const [shipping,setShipping]=useState("3.99");
 const [amazon,setAmazon]=useState(true),[ebay,setEbay]=useState(true);
 const [busy,setBusy]=useState(false),[results,setResults]=useState<string[]>([]);
 async function apply(){
  const m=Number(markup),s=Number(shipping);
  if(!Number.isFinite(m)||m<0||m>500||!Number.isFinite(s)||s<0||s>10000){setResults(["Enter a markup between 0 and 500% and shipping between 0 and 10000."]);return;}
  if(!amazon&&!ebay){setResults(["Choose at least one supported provider."]);return;}
  if(!window.confirm("Apply this markup and shipping to ALL existing imports for selected sources? This updates live listing prices and cannot be automatically undone."))return;
  setBusy(true);setResults([]);
  const next:string[]=[];
  for(const [enabled,label,url] of [[amazon,"Amazon","/api/admin/bulk-markup"],[ebay,"eBay","/api/admin/bulk-markup-ebay"]] as const){
   if(!enabled)continue;
   try{const r=await authFetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markup:m,shipping:s})});const d=await r.json();next.push(label+": "+(r.ok?String(d.message||("Updated "+(d.updated??0)+" listings")):String(d.error||"Update failed")))}catch{next.push(label+": network error")}
   setResults([...next]);
  }
  setBusy(false);
 }
 return <AdminLayout><div className="max-w-3xl space-y-5 text-slate-900 dark:text-white">
  <h1 className="text-2xl font-black">Apply update to all</h1><p className="text-slate-700 dark:text-slate-200">Bulk-update markup and shipping on existing imported listings. This calls each existing provider's bulk-update endpoint; it does not trigger API searches or consume the Craigslist/OLX quotas.</p>
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 p-5 space-y-4">
   <h2 className="font-bold">Select importer sources</h2>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={amazon} onChange={e=>setAmazon(e.target.checked)}/> Amazon imports</label>
   <label className="flex gap-2 items-center"><input type="checkbox" checked={ebay} onChange={e=>setEbay(e.target.checked)}/> eBay imports</label>
   <p className="text-sm text-slate-700 dark:text-slate-200">AliExpress, Gumtree, Craigslist and OLX are excluded until compatible, tested bulk-update endpoints exist. No unsupported provider will be silently modified.</p>
   <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm font-bold">Markup (%)<input type="number" min="0" max="500" step="0.01" value={markup} onChange={e=>setMarkup(e.target.value)} className="block w-full mt-1 rounded-lg border border-slate-400 bg-white text-slate-950 p-3"/></label><label className="text-sm font-bold">Shipping (£)<input type="number" min="0" max="10000" step="0.01" value={shipping} onChange={e=>setShipping(e.target.value)} className="block w-full mt-1 rounded-lg border border-slate-400 bg-white text-slate-950 p-3"/></label></div>
   <button disabled={busy||(!amazon&&!ebay)} onClick={apply} className="bg-orange-600 text-white font-bold rounded-lg px-5 py-3 disabled:opacity-50">{busy?"Applying updates…":"Review and apply to selected sources"}</button>
   {results.length>0&&<div role="status" className="text-sm space-y-1">{results.map((r,i)=><p key={i}>{r}</p>)}</div>}
  </div></div></AdminLayout>;
}
export function AdminCraigslistPage(){return <AdminLayout><div className="text-slate-900 dark:text-white"><h1 className="text-2xl font-black mb-4">Craigslist importer</h1><CraigslistAdminImporter/></div></AdminLayout>}
export function AdminOlxPage(){return <AdminLayout><div className="text-slate-900 dark:text-white"><h1 className="text-2xl font-black mb-4">OLX importer</h1><OLXAdminImporter/></div></AdminLayout>}
