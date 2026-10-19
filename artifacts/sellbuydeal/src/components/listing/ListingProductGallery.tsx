import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Expand, Heart, X } from "lucide-react";
type Props={images:string[];title:string;active:number;onSelect:(i:number)=>void;badges?:ReactNode;watched:boolean;onWatch:()=>void};
export function ListingProductGallery({images,title,active,onSelect,badges,watched,onWatch}:Props){
 const [expanded,setExpanded]=useState(false);
 const index=Math.min(active,Math.max(0,images.length-1));
 const navigate=(delta:number)=>images.length&&onSelect((index+delta+images.length)%images.length);
 return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#304461] dark:bg-[#111f36]" aria-label="Product photographs">
  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-100 to-orange-50 dark:from-[#14294e] dark:via-[#141d38] dark:to-[#34204c] sm:aspect-[5/4]">
   {images.length?<img src={images[index]} alt={title+" - photograph "+(index+1)} className="h-full w-full object-contain p-4 sm:p-6" data-testid="listing-main-image"/>:<p className="font-semibold text-slate-600 dark:text-slate-200">No photograph available</p>}
   <div className="absolute left-3 top-3 flex max-w-[72%] flex-wrap gap-2">{badges}</div>
   <div className="absolute right-3 top-3 flex gap-2">
    {images.length>0&&<button type="button" onClick={()=>setExpanded(true)} aria-label="Expand product photograph" className="grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-900 shadow-md hover:bg-slate-100"><Expand size={19}/></button>}
    <button type="button" onClick={onWatch} aria-label={watched?"Remove from watchlist":"Add to watchlist"} className="grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-900 shadow-md hover:bg-slate-100" data-testid="button-wishlist"><Heart size={19} className={watched?"fill-red-500 text-red-500":""}/></button>
   </div>
   {images.length>1&&<>
    <button type="button" onClick={()=>navigate(-1)} aria-label="Previous product photo" data-testid="button-prev-image" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl bg-white text-slate-900 shadow-lg"><ChevronLeft/></button>
    <button type="button" onClick={()=>navigate(1)} aria-label="Next product photo" data-testid="button-next-image" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl bg-white text-slate-900 shadow-lg"><ChevronRight/></button>
   </>}
   {images.length>1&&<span className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-sm font-semibold text-white">{index+1} / {images.length}</span>}
  </div>
  {images.length>1&&<div className="flex gap-2 overflow-x-auto border-t border-slate-200 p-3 dark:border-[#304461]">{images.map((src,i)=><button type="button" key={i} onClick={()=>onSelect(i)} aria-label={`View product photo ${i+1} of ${images.length}`} aria-pressed={index===i} data-testid={`button-thumbnail-${i}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 dark:bg-slate-800 ${index===i?"border-orange-500":"border-slate-300 dark:border-slate-600"}`}><img src={src} alt="" className="h-full w-full object-contain p-1"/></button>)}</div>}
  {expanded&&<div role="dialog" aria-modal="true" aria-label="Full size product photograph" className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/95 p-5" onKeyDown={e=>{if(e.key==="Escape")setExpanded(false);if(e.key==="ArrowLeft")navigate(-1);if(e.key==="ArrowRight")navigate(1)}}>
   <button type="button" autoFocus onClick={()=>setExpanded(false)} aria-label="Close enlarged photograph" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-slate-900"><X/></button>
   <img src={images[index]} alt={title} className="max-h-[84vh] max-w-full object-contain"/>
   {images.length>1&&<div className="absolute bottom-5 flex items-center gap-4"><button onClick={()=>navigate(-1)} className="rounded-xl bg-white p-3 text-slate-900" aria-label="Previous photograph"><ChevronLeft/></button><span className="text-sm font-semibold text-white">{index+1} / {images.length}</span><button onClick={()=>navigate(1)} className="rounded-xl bg-white p-3 text-slate-900" aria-label="Next photograph"><ChevronRight/></button></div>}
  </div>}
 </section>
}