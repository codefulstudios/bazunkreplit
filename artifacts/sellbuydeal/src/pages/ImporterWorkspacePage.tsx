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
 useEffect(()=>{if(!user)return;let cancelled=false;(async()=>{try{
  const token=await getToken();if(!token)return;
  const response=await fetch("https://data.bazunk.com/web/marketplace/importers",{headers:{Authorization:`Bearer ${token}`}});
  if(response.ok&&!cancelled)setPlatform(await response.json());
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
    <a href={dataUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 hover:bg-cyan-300">Open Bazunk Data Platform <ExternalLink className="w-4 h-4"/></a>
    <p className="mt-3 text-xs text-amber-200">Paid importer checkout and cross-site account sync are not yet active. Do not purchase credits until the service is enabled.</p>
   </section> : source==="woocommerce"?<WooCommercePublicImporter/>:source==="offerup"?<OfferUpManualImporter/>:<ShopifyPublicImporter/>}
 </div></div>;
}
