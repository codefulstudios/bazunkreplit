import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, ShoppingBag, PackageSearch, Globe2, Boxes, Wallet, BookOpen, Search, X, CheckCircle2, ExternalLink, ShieldCheck, RefreshCw, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const sources = [
 {id:"ebay",name:"eBay",icon:ShoppingBag,gradient:"from-blue-600 to-cyan-500",paid:true,example:"wireless headphones",hint:"Search by product name, brand, model or item number"},
 {id:"amazon",name:"Amazon",icon:PackageSearch,gradient:"from-orange-500 to-yellow-400",paid:true,example:"stainless steel water bottle",hint:"Search by keyword, brand or ASIN"},
 {id:"aliexpress",name:"AliExpress",icon:Globe2,gradient:"from-rose-600 to-pink-500",paid:true,example:"LED desk lamp",hint:"Search by product keywords or paste a supported product URL"},
 {id:"shopify",name:"Shopify",icon:ShoppingBag,gradient:"from-emerald-600 to-teal-400",paid:false,href:"/importers/shopify",example:"https://example-shop.com/collections/accessories",hint:"Paste a public store, collection or product URL"},
 {id:"woocommerce",name:"WooCommerce",icon:Boxes,gradient:"from-violet-600 to-indigo-500",paid:false,href:"/importers/woocommerce",example:"https://example-shop.com/product/sample",hint:"Paste a public WooCommerce store or product URL"},
 {id:"offerup",name:"OfferUp",icon:Boxes,gradient:"from-sky-600 to-blue-500",paid:false,href:"/importers/offerup",example:"Your own classified advert",hint:"Transfer the details of your own advert manually"}
] as const;
type Dialog = "pricing" | "examples" | "docs" | null;
export function ImportersPage(){
 const {user}=useAuth();
 const [dialog,setDialog]=useState<Dialog>(null);
 const [selected,setSelected]=useState("ebay");
 useEffect(()=>{if(!dialog)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setDialog(null)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[dialog]);
 const open=(kind:Dialog,id?:string)=>{if(id)setSelected(id);setDialog(kind)};
 const current=sources.find(s=>s.id===selected)||sources[0];
 return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080d20] dark:text-white">
 <div className="max-w-6xl mx-auto px-4 py-10">
  <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold mb-6"><ArrowLeft className="w-4 h-4"/> Back to Home</Link>
  <section className="rounded-3xl bg-gradient-to-r from-[#171a32] to-[#262b62] text-white p-7 md:p-10">
   <span className="text-xs font-black uppercase tracking-widest text-cyan-300">Bazunk Importer Hub</span>
   <h1 className="text-3xl md:text-5xl font-black mt-3">Bring your products to Bazunk.</h1>
   <p className="text-slate-200 mt-4 max-w-2xl">Explore supported marketplaces, see how importing works and understand the costs before getting started. Paid importers run through the Bazunk Data Platform.</p>
   <div className="flex flex-wrap gap-3 mt-6">
    <button onClick={()=>open("docs")} className="rounded-xl bg-cyan-400 text-slate-950 px-5 py-3 font-black inline-flex gap-2 items-center"><BookOpen className="w-4 h-4"/> How it works</button>
    <button onClick={()=>open("pricing")} className="rounded-xl border border-white/40 bg-white/10 text-white px-5 py-3 font-bold inline-flex gap-2 items-center"><Wallet className="w-4 h-4"/> Pricing & credits</button>
    <button onClick={()=>open("examples")} className="rounded-xl border border-white/40 bg-white/10 text-white px-5 py-3 font-bold inline-flex gap-2 items-center"><Search className="w-4 h-4"/> Search examples</button>
   </div>
  </section>
  <div className="mt-9 flex flex-wrap items-end justify-between gap-3"><div><p className="uppercase text-xs tracking-widest font-black text-orange-600 dark:text-orange-400">Supported sources</p><h2 className="text-2xl font-black mt-1 text-slate-950 dark:text-orange-400">Choose a marketplace</h2></div><span className="text-sm text-slate-700 dark:text-orange-200">Select an icon to learn more</span></div>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">{sources.map(s=>{const Icon=s.icon;return <button key={s.id} onClick={()=>open(s.paid?"examples":"docs",s.id)} className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101010] p-3 text-left shadow-sm hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 transition-shadow">
   <div className={`rounded-xl bg-gradient-to-br ${s.gradient} h-20 flex items-center justify-center text-white`}><Icon className="w-10 h-10"/></div>
   <p className="font-black mt-3 text-slate-950 dark:text-orange-300">{s.name}</p><p className="text-xs mt-1 text-slate-700 dark:text-orange-200">{s.paid?"Prepaid · preparing launch":"Free tool available"}</p>
  </button>})}</div>
  <section className="mt-9 grid md:grid-cols-3 gap-4">{[
   {title:"1. Find products",description:"Search a supported marketplace or provide a source URL. Preview product images and details before choosing.",icon:Search},
   {title:"2. Review costs",description:"Paid searches and product lookups will show their charge before execution. Choose your listings and selling markup.",icon:Wallet},
   {title:"3. Import and manage",description:"Create listings on Bazunk, retain the original source and review available stock-sync options.",icon:RefreshCw}
  ].map(step=>{const Icon=step.icon;return <div key={step.title} className="rounded-2xl bg-white dark:bg-[#101010] border border-slate-200 dark:border-orange-500/30 p-5"><Icon className="w-6 h-6 text-indigo-500"/><h3 className="font-black text-lg mt-3 text-slate-950 dark:text-orange-400">{step.title}</h3><p className="text-sm text-slate-800 dark:text-orange-100 mt-2">{step.description}</p></div>})}</section>
  <div className="mt-7 rounded-2xl border border-amber-300/50 bg-orange-50 text-slate-950 dark:bg-[#15100b] dark:text-orange-200 p-5 flex gap-3"><Info className="w-5 h-5 shrink-0 mt-0.5"/><p className="text-sm"><b>Paid importer launch in progress.</b> eBay, Amazon and AliExpress searches are not open for prepaid use yet. You do not need to enter your own RapidAPI key. Shopify, WooCommerce and manual OfferUp tools can be opened from their guides.</p></div>
  <div className="mt-6 flex flex-wrap gap-4 text-sm"><button className="font-bold text-orange-700 dark:text-orange-300 underline" onClick={()=>open("docs")}>Read importer documentation</button><a href="https://data.bazunk.com" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-cyan-300 underline inline-flex items-center gap-1">Bazunk Data Platform <ExternalLink className="w-3 h-3"/></a></div>
 </div>
 {dialog&&<div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}>
 <div role="dialog" aria-modal="true" aria-label={dialog==="pricing"?"Importer pricing":dialog==="examples"?"Importer examples":"Importer documentation"} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-orange-50 text-slate-950 dark:bg-[#0d0d0d] dark:text-orange-100 border border-orange-400/40 shadow-2xl p-6 md:p-8">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase font-black tracking-widest text-indigo-500">Bazunk importer hub</p><h2 className="text-2xl font-black mt-1">{dialog==="pricing"?"Prepaid pricing":dialog==="examples"?"Search & preview examples":"How importing works"}</h2></div><button aria-label="Close" onClick={()=>setDialog(null)} className="p-2 rounded-lg bg-orange-100 dark:bg-[#22201d]"><X className="w-5 h-5"/></button></div>
  {dialog==="pricing"&&<div className="mt-5">
    <p className="text-sm text-slate-800 dark:text-orange-100">Choose a one-time prepaid importer package. No subscription or free tier. Every package has the same additional-request rate of 15 cents per request.</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">{[
      {name:"Mini",usd:3.99,requests:1000},
      {name:"Starter",usd:7.99,requests:2000},
      {name:"Plus",usd:14.99,requests:4000},
      {name:"Pro",usd:24.99,requests:7000},
      {name:"Business",usd:34.99,requests:10000}
    ].map(pkg=><div key={pkg.name} className="rounded-xl border border-orange-300 dark:border-orange-500/50 p-4 text-center bg-white dark:bg-[#17120c]">
      <p className="text-xs font-bold text-orange-700 dark:text-orange-300">{pkg.name}</p>
      <p className="font-black text-2xl text-slate-950 dark:text-orange-400 mt-2">${pkg.usd.toFixed(2)}</p>
      <p className="text-xs text-slate-700 dark:text-orange-100">one-time</p>
      <div className="border-t border-orange-200 dark:border-orange-500/30 my-3"/>
      <p className="text-lg font-black text-slate-950 dark:text-orange-300">{pkg.requests.toLocaleString("en-US")} requests</p>
      <p className="text-xs text-slate-700 dark:text-orange-100 mt-1">then $0.15 / request</p>
    </div>)}</div>
    <p className="mt-4 text-sm text-slate-800 dark:text-orange-100">Extra requests are charged only with your approval and available prepaid balance. Supplier availability and fair-use safeguards apply.</p>
    <p className="mt-3 text-sm font-semibold text-orange-800 dark:text-orange-300">Packages are displayed for information only. Checkout and paid API calls are not enabled yet.</p>
   </div>}
  {dialog==="examples"&&<div className="mt-5"><div className="flex flex-wrap gap-2">{sources.map(s=><button key={s.id} onClick={()=>setSelected(s.id)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${selected===s.id?"bg-orange-500 text-black":"bg-slate-100 dark:bg-slate-800"}`}>{s.name}</button>)}</div><h3 className="font-black text-lg mt-6 text-slate-950 dark:text-orange-400">{current.name} example</h3><p className="text-sm text-slate-800 dark:text-orange-100 mt-2">{current.hint}</p><div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-800 p-4 font-mono text-sm break-all">{current.example}</div><div className="mt-4 rounded-xl border border-dashed border-orange-300 dark:border-orange-500/40 p-4"><div className="flex items-center gap-3"><PackageSearch className="w-12 h-12 text-orange-500"/><div><p className="font-bold">Example result layout</p><p className="text-xs text-slate-500 dark:text-slate-300">Product image · title · source price · availability · select to import</p></div></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Illustration only — no live search is performed here.</p></div>{!current.paid&&<Link href={current.href!} onClick={()=>setDialog(null)} className="inline-flex items-center gap-2 mt-5 bg-indigo-600 text-white rounded-xl px-5 py-3 font-bold">Open {current.name} importer <ArrowRight className="w-4 h-4"/></Link>}</div>}
  {dialog==="docs"&&<div className="mt-5 space-y-4 text-sm"><p>Importing lets you prepare listings using product information from another supported source. You remain responsible for ensuring you have permission to use product descriptions and images, and for accurate pricing, fulfilment and stock information.</p><div className="space-y-3">{["Choose a source and review its supported search or URL format.","Preview the source product and check its images, condition, price and availability.","Select the items to import and set your Bazunk selling price, category and shipping details.","Review charges before any paid API request. Promotional game credits cannot pay for API calls.","Publish and monitor your listings. Sync availability varies by source."].map(x=><p key={x} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-orange-500"/>{x}</p>)}</div><p className="font-semibold">Free tools currently available</p><div className="flex flex-wrap gap-2">{sources.filter(s=>!s.paid).map(s=><Link key={s.id} href={s.href!} onClick={()=>setDialog(null)} className="rounded-lg bg-indigo-600 text-white px-3 py-2 font-bold">{s.name}</Link>)}</div><p className="text-xs text-slate-500 dark:text-slate-400">Paid eBay, Amazon and AliExpress importer execution remains disabled until billing is verified.</p></div>}
 </div></div>}
 </div>;
}
