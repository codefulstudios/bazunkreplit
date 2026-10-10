import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ExternalLink, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { OfferUpManualImporter } from "@/components/OfferUpManualImporter";
import { ShopifyPublicImporter } from "@/components/ShopifyPublicImporter";
import { WooCommercePublicImporter } from "@/components/WooCommercePublicImporter";

type Source="ebay"|"amazon"|"aliexpress"|"shopify"|"offerup"|"woocommerce";
const info:any={
 ebay:{name:"eBay",subtitle:"UK & USA",method:"RapidAPI marketplace search",gradient:"from-blue-600 to-cyan-400",api:"https://rapidapi.com/mahmudulhasandev/api/real-time-ebay-data"},
 amazon:{name:"Amazon",subtitle:"Product importer",method:"Third-party API (RapidAPI)",gradient:"from-orange-500 to-yellow-400",api:"https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data"},
 aliexpress:{name:"AliExpress",subtitle:"Global products",method:"Third-party API (RapidAPI)",gradient:"from-rose-600 to-orange-400",api:"https://rapidapi.com/ecommdatahub/api/aliexpress-datahub"},
 woocommerce:{name:"WooCommerce",subtitle:"Store API",method:"Official WooCommerce public Store API",gradient:"from-purple-600 to-indigo-500",api:""},
 offerup:{name:"OfferUp",subtitle:"USA classifieds",method:"Seller-assisted (no scraper or API)",gradient:"from-sky-600 to-indigo-500",api:""},
 shopify:{name:"Shopify",subtitle:"Store, collection & product URLs",method:"Official Shopify Storefront API (tokenless)",gradient:"from-green-600 to-emerald-400",api:""}
};
export function ImporterWorkspacePage(){
 const [,params]=useRoute("/importers/:source"); const source=(params?.source||"ebay") as Source; const cfg=info[source];
 // Retain Data Platform selection while the marketplace user signs in.
 useEffect(() => {
  const handoff = new URLSearchParams(window.location.search).get("handoff");
  if (source === "shopify" && handoff && handoff.length <= 18000) {
   sessionStorage.setItem("bazunk_shopify_handoff", handoff);
  }
 }, [source]);
 const {user}=useAuth();
 const {getToken}=useClerkAuth();
 const [platform,setPlatform]=useState<{authenticated:boolean;billingEnabled:boolean}|null>(null);
 const [preview,setPreview]=useState<any[]>([]);
 const [billing,setBilling]=useState<{currency:string;packagesUsdCents:number[];defaultMarkupBps:number;checkoutEnabled:boolean}|null>(null);
 useEffect(()=>{if(!user)return;let cancelled=false;(async()=>{try{
  const token=await getToken();if(!token)return;
  const response=await fetch("https://data.bazunk.com/web/marketplace/importers",{headers:{Authorization:`Bearer ${token}`}});
  if(response.ok&&!cancelled)setPlatform(await response.json());
  if(["ebay","amazon","aliexpress"].includes(source)){
   const quote=await fetch("https://data.bazunk.com/web/marketplace/billing-status",{headers:{Authorization:"Bearer "+token}});
   if(quote.ok&&!cancelled)setBilling(await quote.json());
   const products=await fetch("https://data.bazunk.com/web/marketplace/catalogue-preview?provider="+encodeURIComponent(source)+"&limit=6",{headers:{Authorization:"Bearer "+token}});
   if(products.ok&&!cancelled){const body=await products.json();setPreview(Array.isArray(body.items)?body.items:[])}
  }
 }catch{}})();return()=>{cancelled=true}},[user?.email,getToken]);
 const paid=source==="ebay"||source==="amazon"||source==="aliexpress";
 const dataUrl="https://data.bazunk.com";
 if(!cfg)return <div className="max-w-4xl mx-auto px-4 py-16"><Link href="/importers">← Importer Hub</Link><h1>Importer not found</h1></div>;
 if(!user)return <div className="max-w-4xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-black">Sign in to use {cfg.name}</h1></div>;
 return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><div className="max-w-7xl mx-auto px-4 py-10">
  <Link href="/importers" className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-xl border border-white/20 bg-[#171a2b] !text-white shadow-md font-bold text-sm hover:bg-[#303653] hover:border-orange-400 transition-colors"><ArrowLeft className="w-4 h-4"/>Importer Hub</Link>
  <div className={`rounded-[2rem] bg-gradient-to-r ${cfg.gradient} text-white p-7 md:p-9 mb-7 shadow-lg`}><p className="uppercase text-xs font-black tracking-widest text-white/75">{cfg.subtitle}</p><h1 className="text-4xl font-black mt-1">{cfg.name} Importer</h1><p className="mt-2 text-sm font-bold text-white">Connection type: {cfg.method}</p><p className="mt-3 text-white/80 max-w-2xl">A dedicated workspace for previewing, pricing and importing {cfg.name} inventory into Bazunk.</p></div>
  {paid ? <section className="rounded-3xl border border-indigo-500/30 bg-slate-900 p-7 text-white shadow-lg">
    <div className="flex items-center gap-3"><Wallet className="h-7 w-7 text-cyan-300"/><h2 className="text-2xl font-black">Bazunk-managed importer credits</h2></div>
    <p className="mt-2 text-xs font-semibold text-cyan-200">{platform?.authenticated?"Data Platform account verified":"Data Platform connection not yet verified"} · {platform?.billingEnabled?"Billing enabled":"Prepaid billing pending"}</p>
    <p className="mt-3 text-slate-300 max-w-3xl">You won't need your own RapidAPI key. The Bazunk Data Platform will manage paid requests, usage records and prepaid balances. Seller billing is being connected and is not available yet.</p>
    <div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm"><div className="rounded-xl bg-white/10 p-4"><b>1. Preview</b><p className="text-slate-300 mt-1">Search and inspect source products before selecting them.</p></div><div className="rounded-xl bg-white/10 p-4"><b>2. Select & price</b><p className="text-slate-300 mt-1">Choose listings, set markup and destination categories.</p></div><div className="rounded-xl bg-white/10 p-4"><b>3. Import & sync</b><p className="text-slate-300 mt-1">Import products and review usage charges in your account.</p></div></div>
    {preview.length>0&&<div className="mt-6"><h3 className="font-black text-lg mb-3">Cached product previews</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{preview.map((product:any,index:number)=><div key={String(product.externalId||index)} className="rounded-xl bg-white text-slate-900 p-3">{product.images?.[0]?.url&&<img src={product.images[0].url} alt={String(product.title||"Product")} loading="lazy" className="w-full h-32 object-contain rounded-lg"/>}<p className="text-sm font-bold mt-2 line-clamp-2">{product.title||"Product"}</p><p className="text-xs mt-1">{product.price?.currency||"USD"} {product.price?.amount??"—"}</p></div>)}</div><p className="text-xs text-slate-400 mt-2">Cached products are illustrative; stock and prices may have changed.</p></div>}
    {billing&&<div className="mt-6 rounded-xl border border-white/20 p-4"><h3 className="font-black">Prepaid importer pricing</h3><p className="text-sm text-slate-300 mt-1">Default API markup: {((billing.defaultMarkupBps/10000-1)*100).toFixed(0)}%. Prices are shown in USD; payment in other currencies will be calculated at checkout when enabled.</p><div className="flex flex-wrap gap-2 mt-3">{billing.packagesUsdCents.map(cents=><span key={cents} className="rounded-lg bg-white/10 px-4 py-2 font-bold">${(cents/100).toFixed(0)}</span>)}</div><p className="mt-2 text-xs text-amber-200">{billing.checkoutEnabled?"Checkout available":"Checkout is not yet available"}</p></div>}
    <a href={dataUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300">Open Bazunk Data Platform <ExternalLink className="w-4 h-4"/></a>
    <p className="mt-3 text-xs text-amber-200">Paid importer checkout and cross-site account sync are not yet active. Do not purchase credits until the service is enabled.</p>
   </section> : source==="woocommerce"?<WooCommercePublicImporter/>:source==="offerup"?<OfferUpManualImporter/>:<ShopifyPublicImporter/>}
 </div></div>;
}
