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
 return <div className="bazunk-importers-page min-h-screen bg-white text-slate-950 dark:bg-[#070e20] dark:text-white transition-colors duration-300">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
  <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-slate-950 px-5 py-3 text-sm font-black mb-4 shadow-sm"><ArrowLeft className="w-4 h-4"/> Back to Home</Link>
  <section className="relative isolate overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-400/30 bg-gradient-to-br from-indigo-100 via-sky-50 to-fuchsia-100 dark:from-[#0b1b3e] dark:via-[#10143d] dark:to-[#201050] p-6 sm:p-9 lg:p-12 shadow-sm">
   <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-50" style={{background:"radial-gradient(circle at 78% 30%,#bba4ff88,transparent 34%),radial-gradient(circle at 95% 85%,#3bdcf766,transparent 35%)"}}/>
   <div className="relative z-10 max-w-[650px]">
    <p className="text-xs uppercase font-black tracking-widest text-violet-700 dark:text-cyan-300">Bazunk Importer Hub</p>
    <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight">Bring your products<br/><span className="bg-gradient-to-r from-violet-700 via-blue-600 to-orange-500 bg-clip-text text-transparent">to Bazunk.</span></h1>
    <p className="mt-5 text-base font-medium leading-relaxed text-slate-800 dark:!text-white">Import products from top marketplaces, compare costs, add your markup and publish on Bazunk. Paid importers run through the Bazunk Data Platform.</p>
    <div className="flex flex-wrap gap-3 mt-6">
     <button onClick={()=>open("docs")} className="rounded-xl bg-blue-600 dark:bg-cyan-400 text-white dark:text-slate-950 px-5 py-3 font-black inline-flex gap-2 items-center shadow-lg"><BookOpen className="w-4 h-4"/> How it works</button>
     <button onClick={()=>open("pricing")} className="rounded-xl bg-white/90 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-400/40 text-slate-900 dark:text-white px-5 py-3 font-bold inline-flex gap-2 items-center"><Wallet className="w-4 h-4"/> Pricing & credits</button>
     <button onClick={()=>open("examples")} className="rounded-xl bg-white/90 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-400/40 text-slate-900 dark:text-white px-5 py-3 font-bold inline-flex gap-2 items-center"><Search className="w-4 h-4"/> Examples</button>
    </div>
   </div>
   <div aria-hidden="true" className="hidden lg:flex absolute right-4 top-4 bottom-4 w-[36%] flex-col justify-center items-center">
    <div className="grid grid-cols-3 gap-3 rotate-[-7deg]">{sources.map((s,i)=><div key={s.id} className={`flex h-20 w-24 items-center justify-center rounded-2xl shadow-xl border-2 border-white/80 bg-gradient-to-br ${s.gradient} text-white font-black text-sm`} style={{transform:`translateY(${i%3===1?-12:10}px)`}}>{s.name}</div>)}</div>
    <div className="mt-6 rounded-2xl bg-[#111b48] px-12 py-5 text-3xl font-black italic text-white shadow-2xl border-4 border-slate-400">Bazun<span className="text-orange-400">k</span></div>
    <p className="mt-3 !text-indigo-900 dark:!text-cyan-100 font-black tracking-wide">Import · List · Sell · Grow! 🚀</p>
   </div>
  </section>
  <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><p className="uppercase text-xs tracking-widest font-black text-blue-600 dark:text-amber-400">Supported sources</p><h2 className="text-2xl sm:text-3xl font-black mt-1">Supported marketplaces</h2></div><span className="rounded-full bg-green-50 dark:bg-emerald-950 border border-green-100 dark:border-emerald-700/40 px-4 py-2 text-xs sm:text-sm font-bold text-green-700 dark:text-green-300">✓ More marketplaces coming soon!</span></div>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">{sources.map(s=><div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600/70 bg-white dark:bg-[#101e37] shadow-md hover:-translate-y-1 hover:shadow-xl transition-all">
   <div className={`bg-gradient-to-br ${s.gradient} h-24 flex items-center justify-center p-4`}>
    <img src={`https://cdn.simpleicons.org/${({ebay:"ebay",amazon:"amazon",aliexpress:"aliexpress",shopify:"shopify",woocommerce:"woocommerce",offerup:"offerup"} as Record<string,string>)[s.id]}/ffffff`} alt={`${s.name} logo`} loading="lazy" className="max-w-full max-h-12 object-contain" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.nextElementSibling?.classList.remove("hidden")}}/>
    <span className="hidden text-white text-xl font-black">{s.name}</span>
   </div>
   <div className="p-3">
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-black ${s.paid?"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100":"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"}`}>{s.paid?"Paid importer":"Free tool"}</span>
    <p className="font-black mt-2 text-base">{s.name}</p>
    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-100 min-h-[46px]">{s.id==="ebay"?"Search and import millions of products.":s.id==="amazon"?"Browse and import product catalogues.":s.id==="aliexpress"?"Find products from AliExpress.":s.id==="shopify"?"Import from a public Shopify store.":s.id==="woocommerce"?"Import from WooCommerce stores.":"Transfer your own OfferUp adverts."}</p>
    <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">{s.paid?"Preparing launch":"Available tool"}</span>{s.paid?<button onClick={()=>open("pricing",s.id)} aria-label={`Learn about ${s.name} importer`} className="rounded-full bg-blue-600 text-white p-2"><ArrowRight className="w-4 h-4"/></button>:<Link href={s.href!} aria-label={`Open ${s.name} importer`} className="rounded-full bg-emerald-500 text-white p-2"><ArrowRight className="w-4 h-4"/></Link>}</div>
   </div>
  </div>)}</div>
  <section className="mt-8 rounded-3xl bg-slate-50 dark:bg-[#0e1b32] border border-slate-100 dark:border-slate-700/70 p-5 sm:p-7">
   <div className="flex flex-wrap justify-between gap-3 items-center"><div><h2 className="text-2xl font-black">How it works</h2><p className="text-sm text-slate-700 dark:text-slate-100">Get from product to sale in three simple steps.</p></div><button onClick={()=>open("docs")} className="rounded-xl border border-blue-300 dark:border-cyan-500 px-4 py-2 text-blue-700 dark:text-cyan-300 font-bold text-sm">Read the full documentation →</button></div>
   <div className="grid md:grid-cols-3 gap-4 mt-5">{[
    {title:"Find products",description:"Search a supported marketplace or enter a product URL. Preview images, details and pricing.",icon:Search,color:"text-blue-600 bg-blue-100 dark:bg-blue-950"},
    {title:"Review costs",description:"See importer costs before importing. Add your markup and choose listing settings.",icon:Wallet,color:"text-violet-600 bg-violet-100 dark:bg-violet-950"},
    {title:"Import and manage",description:"Create Bazunk listings, keep the original source and use available stock-sync options.",icon:RefreshCw,color:"text-pink-600 bg-pink-100 dark:bg-pink-950"}
   ].map((step,i)=>{const Icon=step.icon;return <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#14243d] p-5 shadow-sm"><div className={`shrink-0 rounded-full h-14 w-14 flex items-center justify-center ${step.color}`}><Icon className="w-7 h-7"/></div><div><p className="text-base font-black">{i+1}. {step.title}</p><p className="text-sm mt-2 !text-slate-700 dark:!text-slate-100 leading-relaxed">{step.description}</p></div></div>})}</div>
  </section>
  <div className="mt-5 rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-[#281c12] p-5 flex gap-3 text-slate-800 dark:text-amber-100"><Info className="w-6 h-6 shrink-0 text-amber-600 dark:text-amber-400"/><p className="text-sm leading-relaxed !text-slate-800 dark:!text-amber-100"><b>Paid importer launch in progress.</b> eBay, Amazon and AliExpress searches are not open for prepaid use yet. You do not need to enter your own RapidAPI key. Shopify, WooCommerce and manual OfferUp tools can be opened from their guides.</p></div>
  <div className="mt-5 flex flex-wrap gap-4 text-sm"><button className="font-bold text-blue-700 dark:text-cyan-300 underline" onClick={()=>open("docs")}>Read importer documentation</button><a href="https://data.bazunk.com" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 dark:text-cyan-300 underline inline-flex items-center gap-1">Bazunk Data Platform <ExternalLink className="w-3 h-3"/></a></div>
 </div>
 {dialog&&<div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}>
 <div role="dialog" aria-modal="true" aria-label={dialog==="pricing"?"Importer pricing":dialog==="examples"?"Importer examples":"Importer documentation"} className={`w-full ${dialog==="examples"?"max-w-[1500px]":"max-w-2xl"} max-h-[90vh] overflow-y-auto rounded-3xl bg-orange-50 text-slate-950 dark:bg-[#0d0d0d] dark:text-orange-100 border border-orange-400/40 shadow-2xl p-6 md:p-8`}>
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase font-black tracking-widest text-orange-700 dark:text-orange-300">Bazunk importer hub</p><h2 className="text-2xl font-black mt-1">{dialog==="pricing"?"Prepaid pricing":dialog==="examples"?"Importer examples":"How importing works"}</h2></div><button aria-label="Close" onClick={()=>setDialog(null)} className="p-2 rounded-lg bg-orange-100 dark:bg-[#22201d]"><X className="w-5 h-5"/></button></div>
  {dialog==="pricing"&&<div className="mt-5">
    <p className="text-sm text-slate-800 dark:text-orange-100">Get started with the package that suits your store. Explore products on eBay, Amazon and AliExpress, then choose what to bring to Bazunk. Pay once for your included requests, with the flexibility to add more whenever you need them.</p>
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
      <p className="text-xs text-slate-700 dark:text-orange-100 mt-1">Additional requests: $0.15 each</p>
    </div>)}</div>
    <p className="mt-4 text-sm text-slate-800 dark:text-orange-100">Need more searches? Additional requests are $0.15 each, charged only when you choose to use them and have sufficient prepaid balance.</p>
    <p className="mt-3 text-sm font-semibold text-orange-800 dark:text-orange-300">Coming soon: Package purchases will open once secure checkout is ready.</p>
   </div>}
  {dialog==="examples"&&<div className="mt-4">
    <p className="text-sm !text-slate-800 dark:!text-orange-100">See how products move from a source marketplace into your Bazunk store. These are realistic, illustrative examples — not live searches.</p>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-5">{sources.map(s=><button key={s.id} onClick={()=>setSelected(s.id)} className={`rounded-xl border px-3 py-3 text-sm font-black ${selected===s.id ? "!bg-orange-500 !text-black border-orange-500" : "!bg-white !text-slate-950 dark:!bg-[#222] dark:!text-orange-100 border-orange-500/40"}`}>{s.name}</button>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
      <div className="rounded-2xl border border-orange-500/70 bg-white dark:bg-[#141414] p-3 sm:p-4">
        <h3 className="text-lg font-black !text-orange-600 dark:!text-orange-400">1. Find a product</h3><p className="text-xs mt-1 !text-slate-700 dark:!text-orange-100">Search {current.name} and browse product results.</p>
        <div className="rounded-xl overflow-hidden border border-slate-300 mt-4 bg-white !text-slate-950">
          <div className="p-3 border-b border-slate-200"><p className="font-black text-xl text-blue-600">{current.name}</p><div className="flex rounded-lg border border-slate-300 mt-2 overflow-hidden"><span className="flex-1 p-2 text-xs">{current.example}</span><span className="bg-blue-600 text-white p-2"><Search className="w-4 h-4"/></span></div></div>
          <div className="flex gap-2 p-2 text-[10px] border-b border-slate-200"><span className="rounded-full bg-blue-600 text-white px-2 py-1">All</span><span className="rounded-full border px-2 py-1">Buy now</span><span className="rounded-full border px-2 py-1">Condition</span></div>
          <p className="p-3 text-xs font-semibold">Sample search results</p>
          {[{name:"Wireless Bluetooth Over-Ear Headphones – Black",price:"£129.99"},{name:"Wireless Noise Cancelling Headphones – Silver",price:"£179.00"}].map((item,n)=><div key={n} className="flex gap-3 p-3 border-t border-slate-200"><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop" alt="Illustrative headphones product" className="w-24 h-28 rounded-lg object-cover bg-slate-100"/><div className="min-w-0"><p className="text-xs font-semibold">{item.name}</p><p className="text-[11px] mt-1 text-slate-600">Pre-owned · ★★★★★</p><p className="text-lg font-black mt-2">{item.price}</p><p className="text-[11px] text-slate-600">Buy it now · Delivery available</p></div></div>)}
        </div>
      </div>
      <div className="rounded-2xl border border-orange-500/70 bg-white dark:bg-[#141414] p-3 sm:p-4">
        <h3 className="text-lg font-black !text-orange-600 dark:!text-orange-400">2. Review the preview</h3><p className="text-xs mt-1 !text-slate-700 dark:!text-orange-100">Check the details and set up your Bazunk listing.</p>
        <div className="rounded-xl bg-[#202020] !text-white p-3 mt-4">
          <p className="font-bold text-sm">Import from {current.name}</p><div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 mt-3"><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop" alt="Illustrative selected headphones" className="w-full sm:w-1/2 lg:w-full xl:w-1/2 aspect-square rounded-lg object-cover"/><div className="text-xs"><p className="font-bold text-sm">Wireless Bluetooth Over-Ear Headphones</p><p className="text-orange-400 mt-2">★★★★★</p><p className="text-xl font-black mt-2">£129.99</p><p className="text-slate-300 mt-2">Condition: Pre-owned</p><p className="text-slate-300">Colour: Black</p><p className="text-slate-300">Available to import</p></div></div>
          <div className="border-t border-white/20 mt-4 pt-3"><p className="font-bold text-sm">Your Bazunk listing details</p>{[["Title","Wireless Bluetooth Over-Ear Headphones"],["Category","Electronics › Audio › Headphones"],["Source price","£129.99"],["Your selling price","£142.99"],["Condition","Used – Very Good"]].map(([k,v])=><div key={k} className="mt-2"><p className="text-[11px] text-slate-300">{k}</p><div className="rounded border border-slate-600 px-3 py-2 text-xs mt-1">{v}</div></div>)}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-orange-500/70 bg-white dark:bg-[#141414] p-3 sm:p-4">
        <h3 className="text-lg font-black !text-orange-600 dark:!text-orange-400">3. Import to your store</h3><p className="text-xs mt-1 !text-slate-700 dark:!text-orange-100">Confirm the import and preview your Bazunk listing.</p>
        <div className="rounded-xl bg-[#202020] p-4 mt-4 text-center !text-white"><CheckCircle2 className="w-11 h-11 mx-auto text-green-400"/><p className="font-black mt-2">Product imported!</p><p className="text-xs text-slate-300 mt-1">Your listing has been created on Bazunk.</p><div className="inline-block bg-orange-500 text-black font-bold rounded-lg px-4 py-2 text-xs mt-3">View listing</div></div>
        <div className="rounded-xl overflow-hidden border border-slate-300 bg-white !text-slate-950 mt-3"><div className="bg-[#171717] p-3 flex items-center justify-between"><span className="text-orange-500 font-black text-xl">Bazunk</span><span className="text-xs text-white">Search for anything…</span></div><p className="p-3 text-[11px] text-slate-600">Home › Electronics › Audio › Headphones</p><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop" alt="Illustrative Bazunk product listing" className="w-full aspect-[4/3] object-cover"/><div className="p-4"><p className="font-bold text-sm">Wireless Bluetooth Over-Ear Headphones – Black</p><p className="text-orange-600 font-black text-2xl mt-2">£142.99</p><p className="text-xs mt-2">Delivery available · Buyer Protection</p><div className="bg-orange-500 rounded-lg text-center text-black font-black p-3 mt-4">Add to basket</div><div className="border rounded-lg text-center font-bold p-3 mt-2">Make an offer</div></div></div>
      </div>
    </div>
    <p className="text-xs mt-4 !text-slate-700 dark:!text-orange-200">Illustrative mockup only. Product details and prices are examples; no real search, import or listing creation takes place here.</p>
  </div>}
  {dialog==="docs"&&<div className="mt-5 space-y-4 text-sm"><p>Importing lets you prepare listings using product information from another supported source. You remain responsible for ensuring you have permission to use product descriptions and images, and for accurate pricing, fulfilment and stock information.</p><div className="space-y-3">{["Choose a source and review its supported search or URL format.","Preview the source product and check its images, condition, price and availability.","Select the items to import and set your Bazunk selling price, category and shipping details.","Review charges before any paid API request. Promotional game credits cannot pay for API calls.","Publish and monitor your listings. Sync availability varies by source."].map(x=><p key={x} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-orange-500"/>{x}</p>)}</div><p className="font-semibold">Free tools currently available</p><div className="flex flex-wrap gap-2">{sources.filter(s=>!s.paid).map(s=><Link key={s.id} href={s.href!} onClick={()=>setDialog(null)} className="rounded-lg bg-indigo-600 text-white px-3 py-2 font-bold">{s.name}</Link>)}</div><p className="text-xs text-slate-500 dark:text-slate-400">Paid eBay, Amazon and AliExpress importer execution remains disabled until billing is verified.</p></div>}
 </div></div>}
 </div>;
}
