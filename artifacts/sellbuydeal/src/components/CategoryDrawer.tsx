import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Grid3X3, Search, X } from "lucide-react";
import { ACTIVE_CATEGORIES } from "@/data/categories";
import { usePublicCategoryVisibility } from "@/hooks/usePublicCategoryVisibility";

type Category = (typeof ACTIVE_CATEGORIES)[number];

export function CategoryDrawer({open,onClose}:{open:boolean;onClose:()=>void}) {
  const [location] = useLocation();
  const {categoryIsActive} = usePublicCategoryVisibility();
  const [selected,setSelected] = useState<Category|null>(null);
  const [search,setSearch] = useState("");
  useEffect(()=>{onClose();setSelected(null);},[location]);
  useEffect(()=>{
    if(!open)return;
    const handleKey=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
    document.addEventListener("keydown",handleKey);
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.removeEventListener("keydown",handleKey);document.body.style.overflow=previous;};
  },[open,onClose]);
  const categories=ACTIVE_CATEGORIES.filter(cat=>categoryIsActive(cat.slug)&&cat.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={`bz-category-drawer-root ${open?"is-open":""}`} aria-hidden={!open}>
      <button type="button" className="bz-category-drawer-backdrop" aria-label="Close category menu" tabIndex={open?0:-1} onClick={onClose}/>
      <aside className="bz-category-drawer" role="dialog" aria-modal={open} aria-label="Shop by category" inert={!open}>
        <header className="bz-category-drawer-header">
          <Link href="/" onClick={onClose} className="text-2xl font-black tracking-tight text-white"><span className="text-orange-400">B</span>azunk</Link>
          <button type="button" aria-label="Close menu" onClick={onClose}><X size={24}/></button>
        </header>
        <div className="bz-category-drawer-breadcrumb">
          {selected ? <button type="button" onClick={()=>setSelected(null)}><ArrowLeft size={17}/> Shop by category</button> : <span><Grid3X3 size={17}/> Shop by category</span>}
        </div>
        <div className="bz-category-drawer-scroll" key={selected?.slug||"root"}>
          {!selected ? <>
            <div className="bz-category-drawer-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a category" aria-label="Find a category"/></div>
            <Link className="bz-category-drawer-view-all" href="/categories" onClick={onClose}>Shop all categories <ChevronRight size={18}/></Link>
            {categories.map(cat=><button key={cat.slug} type="button" className="bz-category-drawer-row" onClick={()=>setSelected(cat)}><span>{cat.name}</span><ChevronRight size={19}/></button>)}
            {!categories.length&&<p className="p-5 text-sm">No matching categories</p>}
          </> : <>
            <h2 className="bz-category-drawer-title">{selected.name}</h2>
            <Link className="bz-category-drawer-view-all" href={`/browse?category=${encodeURIComponent(selected.slug)}`} onClick={onClose}>View all {selected.name}<ChevronRight size={18}/></Link>
            {selected.subcategories.filter(sub=>categoryIsActive(selected.slug,sub.slug)).map(sub=><Link key={sub.slug} className="bz-category-drawer-row" href={`/browse?category=${encodeURIComponent(selected.slug)}&sub=${encodeURIComponent(sub.slug)}`} onClick={onClose}><span>{sub.name}</span><ChevronRight size={18}/></Link>)}
          </>}
        </div>
        <div className="bz-category-drawer-bottom"><Link href="/support" onClick={onClose}>Help & support</Link><Link href="/sell" onClick={onClose}>Sell on Bazunk</Link></div>
      </aside>
    </div>
  );
}
