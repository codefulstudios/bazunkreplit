import { useEffect,useRef,useState } from "react";
import { Link } from "wouter";
import { ChevronLeft,ChevronRight,Megaphone,Package } from "lucide-react";
type Item={id:number;public_id:string|null;title:string;price:string;price_gbp:string|null;image:string|null};
export function BrowseSponsoredListings({category}:{category?:string}){
 const [items,setItems]=useState<Item[]>([]);
 const scroller=useRef<HTMLDivElement>(null);
 useEffect(()=>{
   const controller=new AbortController();
   setItems([]);
   fetch(`/api/promotions/browse-sponsored?category=${encodeURIComponent(category||"")}`,{signal:controller.signal})
    .then(r=>r.ok?r.json():[]).then(data=>{if(!controller.signal.aborted)setItems(Array.isArray(data)?data:[]);}).catch(()=>{});
   return ()=>controller.abort();
 },[category]);
 if(!items.length)return null;
 return <section className="mt-6 rounded-2xl border-2 border-orange-300 bg-white p-4 text-slate-900 shadow-sm" aria-label="Sponsored listings">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Megaphone className="h-5 w-5 text-orange-600"/>Sponsored Listings</h2><p className="text-xs text-slate-600">Paid promotional placements · <Link href="/promotions" className="font-bold text-orange-700 underline">Sponsor your listing</Link></p></div><div className="flex gap-2"><button type="button" aria-label="Scroll sponsored listings left" onClick={()=>scroller.current?.scrollBy({left:-420,behavior:"smooth"})} className="rounded-lg border border-slate-300 p-2"><ChevronLeft size={18}/></button><button type="button" aria-label="Scroll sponsored listings right" onClick={()=>scroller.current?.scrollBy({left:420,behavior:"smooth"})} className="rounded-lg border border-slate-300 p-2"><ChevronRight size={18}/></button></div></div>
   <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" style={{scrollbarWidth:"thin"}}>
    {items.map(item=><Link key={item.id} href={`/listing/${item.public_id||item.id}`} className="group w-[calc((100%-5*12px)/6)] min-w-36 shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-orange-500"><div className="relative flex aspect-square items-center justify-center bg-slate-50">{item.image?<img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-contain p-2"/>:<Package className="h-10 w-10 text-slate-300"/>}<span className="absolute left-1 top-1 rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Sponsored</span></div><div className="p-2"><p className="line-clamp-2 min-h-9 text-xs font-bold text-slate-900 group-hover:text-blue-700">{item.title}</p><p className="mt-1 text-sm font-extrabold">£{Number(item.price_gbp??item.price).toFixed(2)}</p></div></Link>)}
   </div>
 </section>;
}
