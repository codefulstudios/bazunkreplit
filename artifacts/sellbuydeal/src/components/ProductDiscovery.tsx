import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useCurrency } from "@/context/CurrencyContext";
type Item = { id:number;public_id?:string|null;title:string;image?:string|null;price:string|number;currency?:string };
const KEY = "bazunk_recently_viewed_v1";
export function rememberViewedListing(id:number) {
  if (!Number.isSafeInteger(id) || id <= 0) return;
  try {
    const previous = JSON.parse(localStorage.getItem(KEY) || "[]");
    const valid = Array.isArray(previous) ? previous.filter((v:unknown)=>Number.isSafeInteger(v) && Number(v)>0) : [];
    localStorage.setItem(KEY,JSON.stringify([id,...valid.filter((v:number)=>v!==id)].slice(0,20)));
  } catch { /* storage blocked */ }
}
export function ProductDiscovery({ currentId }: {currentId?:number}) {
  const { countryCode } = useCurrency();
 const [recent,setRecent]=useState<Item[]>([]);
  const [suggested,setSuggested]=useState<Item[]>([]);
  useEffect(()=>{
    let active=true;
    const ids:number[]=(()=>{try {const a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)?a.filter((v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0).slice(0,20):[];}catch{return [];}})();
    const params=new URLSearchParams(window.location.search);
    const region=params.get("region")?.toLowerCase() || (countryCode==="GB"?"uk":"us");
    const query=new URLSearchParams({viewed:ids.join(",")});
    if(region==="uk"||region==="us")query.set("region",region);
    fetch("/api/discovery/recommendations?"+query)
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{if(active)setSuggested(Array.isArray(d.items)?d.items:[]);}).catch(()=>{});
    if(ids.length) {
      fetch("/api/listings?ids="+ids.join(",")+(region?"&region="+region:""))
        .then(r=>r.ok?r.json():Promise.reject())
        .then(d=>{
          const rows=Array.isArray(d)?d:Array.isArray(d.listings)?d.listings:[];
          if(active)setRecent(ids.map(id=>rows.find((v:Item)=>Number(v.id)===id)).filter(Boolean).filter((v:Item)=>v.id!==currentId).slice(0,6));
        }).catch(()=>{});
    }
    return ()=>{active=false;};
  },[currentId,countryCode]);
  const display=(items:Item[])=> <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{items.map(item=><Link key={item.id} href={`/listing/${item.public_id||item.id}`} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-950 shadow-sm hover:border-orange-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><div className="mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">{item.image&&<img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain"/>}</div><p className="line-clamp-2 text-sm font-bold">{item.title}</p><p className="mt-1 text-sm font-black text-orange-600 dark:text-orange-300">{item.currency||"GBP"} {Number(item.price).toFixed(2)}</p></Link>)}</div>;
  if(!recent.length&&!suggested.length)return null;
  return <section aria-label="Product discovery" className="my-8 space-y-7">{recent.length>0&&<div><h2 className="mb-3 text-xl font-black text-slate-950 dark:text-white">Recently viewed</h2>{display(recent)}<button type="button" className="mt-3 text-sm font-bold text-orange-700 dark:text-orange-300" onClick={()=>{localStorage.removeItem(KEY);setRecent([]);}}>Clear browsing history</button></div>}{suggested.length>0&&<div><h2 className="mb-3 text-xl font-black text-slate-950 dark:text-white">Recommended for you</h2>{display(suggested.slice(0,6))}</div>}</section>;
}
