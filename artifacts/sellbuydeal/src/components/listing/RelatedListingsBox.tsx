import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Flame, Package } from "lucide-react";

interface RelatedItem { id: number; public_id: string | null; title: string; price: string; image: string | null; category: string; sponsored?: boolean; currency?: string; price_gbp?: string | number }

export function RelatedListingsBox({ category, excludeId }: { category: string; excludeId: number | string }) {
  const [items,setItems]=useState<RelatedItem[]>([]);
  const [loading,setLoading]=useState(true);
  const scroller=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setItems([]);
    fetch(`/api/promotions/related?category=${encodeURIComponent(category)}&exclude=${encodeURIComponent(String(excludeId))}`,{signal:controller.signal})
      .then(r=>r.ok?r.json():[])
      .then(data=>{if(!controller.signal.aborted)setItems((Array.isArray(data)?data:[]).filter((item:RelatedItem)=>String(item.id)!==String(excludeId)).slice(0,6));})
      .catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[category,excludeId]);
  if(!loading&&!items.length)return null;
  const sponsored=items.some(item=>item.sponsored);
  return <section aria-label="Related listings" className="rounded-2xl border-2 border-orange-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Flame className="h-5 w-5 text-orange-600"/>{sponsored?"Promoted related listings":"Related listings"}</h3>
      <div className="flex gap-2"><button type="button" aria-label="Scroll related listings left" onClick={()=>scroller.current?.scrollBy({left:-420,behavior:"smooth"})} className="rounded-lg border border-slate-300 p-2 text-slate-800"><ChevronLeft size={17}/></button><button type="button" aria-label="Scroll related listings right" onClick={()=>scroller.current?.scrollBy({left:420,behavior:"smooth"})} className="rounded-lg border border-slate-300 p-2 text-slate-800"><ChevronRight size={17}/></button></div>
    </div>
    <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" style={{scrollbarWidth:"thin"}}>
      {loading?<p className="text-sm text-slate-600">Loading related listings…</p>:items.map(item=><Link key={item.id} href={`/listing/${item.public_id||item.id}`} className="group w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-orange-400 sm:w-48">
        <div className="relative flex h-36 items-center justify-center bg-slate-50">{item.image?<img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-contain p-2"/>:<Package className="h-10 w-10 text-slate-300"/>}{item.sponsored&&<span className="absolute left-2 top-2 rounded bg-orange-600 px-2 py-1 text-[10px] font-bold text-white">Sponsored</span>}</div>
        <div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 group-hover:text-blue-700">{item.title}</p><p className="mt-1 text-sm font-extrabold text-slate-900">£{Number(item.price_gbp??item.price).toFixed(2)}</p></div>
      </Link>)}
    </div>
    {sponsored&&<p className="mt-2 text-xs text-slate-600">Sponsored placements · <Link href="/promotions" className="font-bold text-orange-700 underline">Promote your listing</Link></p>}
  </section>;
}
