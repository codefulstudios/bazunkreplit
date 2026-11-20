import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Heart } from "lucide-react";
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
  const { isSignedIn, getToken } = useClerkAuth();
  const [wishlist,setWishlist]=useState<Item[]>([]);
  const [wishlistError,setWishlistError]=useState("");
  const [wishlistBusy,setWishlistBusy]=useState<number|null>(null);
  const [personalizationEnabled,setPersonalizationEnabled]=useState(()=>{try{return localStorage.getItem("bazunk_personalization_disabled")!=="1";}catch{return true;}});
  useEffect(()=>{
    if(!isSignedIn){setWishlist([]);return;}
    let active=true;
    void (async()=>{try{const token=await getToken();if(!token)return;const r=await fetch("/api/discovery/wishlist",{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)return;const d=await r.json();if(active)setWishlist(Array.isArray(d.items)?d.items:[]);}catch{}})();
    return()=>{active=false;};
  },[isSignedIn,getToken]);
  async function toggleWishlist(item:Item){
    if(!isSignedIn){setWishlistError("Sign in to save products to your wishlist.");return;}
    setWishlistBusy(item.id);setWishlistError("");
    const saved=wishlist.some(x=>x.id===item.id);
    try{const token=await getToken();if(!token)throw Error("Sign in required");
      const r=await fetch(saved?`/api/discovery/wishlist/${item.id}`:"/api/discovery/wishlist",{method:saved?"DELETE":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(saved?{}:{body:JSON.stringify({listingId:item.id})})});
      if(!r.ok)throw Error("Could not update wishlist");
      setWishlist(previous=>saved?previous.filter(x=>x.id!==item.id):[item,...previous.filter(x=>x.id!==item.id)]);
    }catch(e){setWishlistError(e instanceof Error?e.message:"Wishlist unavailable");}finally{setWishlistBusy(null);}
  }
 const [recent,setRecent]=useState<Item[]>([]);
  const [suggested,setSuggested]=useState<Item[]>([]);
  useEffect(()=>{
    let active=true;
    const ids:number[]=personalizationEnabled?(()=>{try {const a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)?a.filter((v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0).slice(0,20):[];}catch{return [];}})():[];
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
  },[currentId,countryCode,personalizationEnabled]);
  const display=(items:Item[])=> <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{items.map(item=><div key={item.id} className="relative rounded-xl border border-slate-300 bg-white p-3 text-slate-950 shadow-sm hover:border-orange-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><button type="button" disabled={wishlistBusy===item.id} aria-label={wishlist.some(x=>x.id===item.id)?"Remove from wishlist":"Add to wishlist"} aria-pressed={wishlist.some(x=>x.id===item.id)} onClick={()=>void toggleWishlist(item)} className="absolute right-4 top-4 z-10 rounded-full border border-slate-300 bg-white p-2 text-orange-700 shadow-sm focus-visible:outline-2 focus-visible:outline-blue-700"><Heart size={17} fill={wishlist.some(x=>x.id===item.id)?"currentColor":"none"}/></button><Link href={`/listing/${item.public_id||item.id}`}><div className="mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">{item.image&&<img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain"/>}</div><p className="line-clamp-2 text-sm font-bold">{item.title}</p><p className="mt-1 text-sm font-black text-orange-600 dark:text-orange-300">{item.currency||"GBP"} {Number(item.price).toFixed(2)}</p></Link></div>)}</div>;
  if(!recent.length&&!suggested.length&&!wishlist.length)return null;
  return <section aria-label="Product discovery" className="my-8 space-y-7"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-slate-950 dark:text-white">Discover products</h2><label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><input type="checkbox" checked={personalizationEnabled} onChange={e=>{setPersonalizationEnabled(e.target.checked);try{localStorage.setItem("bazunk_personalization_disabled",e.target.checked?"0":"1");if(!e.target.checked)localStorage.removeItem(KEY);}catch{}setRecent([]);}}/>Personalised suggestions</label></div>{wishlistError&&<p role="alert" className="text-sm text-red-700">{wishlistError}</p>}{wishlist.length>0&&<div><h2 className="mb-3 text-xl font-black text-slate-950 dark:text-white">My wishlist</h2>{display(wishlist.filter(item=>item.status===undefined||item.status==="active").slice(0,6))}</div>}{personalizationEnabled&&recent.length>0&&<div><h2 className="mb-3 text-xl font-black text-slate-950 dark:text-white">Recently viewed</h2>{display(recent)}<button type="button" className="mt-3 text-sm font-bold text-orange-700 dark:text-orange-300" onClick={()=>{localStorage.removeItem(KEY);setRecent([]);}}>Clear browsing history</button></div>}{suggested.length>0&&<div><h2 className="mb-3 text-xl font-black text-slate-950 dark:text-white">Recommended for you</h2>{display(suggested.slice(0,6))}</div>}</section>;
}
