import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useState, useEffect } from "react";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Grid3X3, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ACTIVE_CATEGORIES, resolveCategory, suggestedThirdLevel, thirdLevelSlug, loadThirdLevelTaxonomy } from "@/data/categories";
import * as LucideIcons from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

type LucideIconName = keyof typeof LucideIcons;

interface CategoryCount {
  category: string;
  subcategory: string | null;
  count: number;
}

const CATEGORY_THEMES = [
  "from-blue-600 via-blue-500 to-indigo-500",
  "from-orange-500 via-amber-500 to-orange-400",
  "from-fuchsia-600 via-pink-500 to-purple-500",
  "from-emerald-600 via-green-500 to-teal-400",
  "from-rose-500 via-pink-500 to-rose-400",
  "from-violet-600 via-purple-500 to-fuchsia-500",
  "from-lime-600 via-green-500 to-emerald-500",
  "from-amber-500 via-yellow-500 to-orange-400",
  "from-red-600 via-rose-500 to-orange-500",
  "from-cyan-600 via-sky-500 to-blue-500",
  "from-indigo-600 via-blue-600 to-violet-500",
  "from-purple-600 via-violet-500 to-fuchsia-500",
  "from-sky-600 via-cyan-500 to-teal-500",
  "from-slate-600 via-blue-600 to-indigo-500",
  "from-green-700 via-emerald-600 to-lime-500",
];

const CATEGORY_ART: Record<string, string> = {
  "adult": "/category-art/adult.png",
  "digital": "/category-art/digital.png",
  "musical-instruments": "/category-art/musical-instruments.png",
  "office-products": "/category-art/office-products.png",
  "patio-lawn-garden": "/category-art/patio-lawn-garden.png",
  "pet-supplies": "/category-art/pet-supplies.png",
  "tools-home-improvement": "/category-art/tools-home-improvement.png",
  "video-games": "/category-art/video-games.png",

  electronics: "/category-art/electronics.webp",
  "home-kitchen": "/category-art/home-kitchen.webp",
  "clothing-shoes-jewelry": "/category-art/clothing-shoes-jewelry.webp",
  "health-household": "/category-art/health-household.webp",
  "toys-games": "/category-art/toys-games.webp",
  automotive: "/category-art/automotive.webp",
  "baby-products": "/category-art/baby-products.webp",
  "sports-outdoors": "/category-art/sports-outdoors.webp",
  books: "/category-art/books.webp",
  "cds-vinyl": "/category-art/cds-vinyl.webp",
  "arts-crafts-sewing": "/category-art/arts-crafts-sewing.webp",
  "industrial-scientific": "/category-art/industrial-scientific.webp",
  appliances: "/category-art/home-kitchen.webp",
  "beauty-personal-care": "/category-art/health-household.webp",
  "cell-phones": "/category-art/electronics.webp",
  "eco-friendly": "/category-art/health-household.webp",
  "movies-tv": "/category-art/electronics.webp",
};

// Distinct, lightweight subcategory illustrations. Each card uses its own
// subject and colour palette rather than repeating the parent category photo.
const SUBCATEGORY_SUBJECTS: Array<[RegExp, string]> = [
  [/cookware|bakeware|pots|pans/i,"🍳"],[/bedding|pillows|linen|mattress/i,"🛏️"],
  [/furniture|sofa|seating/i,"🛋️"],[/decor|decoration|ornament/i,"🏺"],
  [/storage|organization|organis/i,"🗃️"],[/lighting|lamps/i,"💡"],
  [/kitchen appliances|microwaves|ovens/i,"🍞"],[/dining|tableware|dinnerware/i,"🍽️"],
  [/cleaning|laundry|detergent/i,"🧽"],[/bathroom|bath/i,"🛁"],
  [/garden|outdoor|plants/i,"🪴"],[/smart home/i,"🏠"],
  [/heating|cooling|air condition|fans/i,"🌡️"],[/curtains|blinds|rugs/i,"🪟"],
  [/tools|improvement|hardware/i,"🛠️"],[/computers|laptops|desktop/i,"💻"],
  [/television|tvs|home theater/i,"📺"],[/audio|headphones|speakers/i,"🎧"],
  [/cameras|photography/i,"📷"],[/phones|mobile/i,"📱"],
  [/gaming|video games|consoles/i,"🎮"],[/wearables|watches/i,"⌚"],
  [/shoes|footwear|sneakers/i,"👟"],[/clothing|apparel|fashion/i,"👗"],
  [/jewelry|jewellery/i,"💎"],[/bags|handbags|luggage/i,"👜"],
  [/makeup|cosmetics|beauty/i,"💄"],[/skincare|skin care/i,"🧴"],
  [/haircare|hair care/i,"💇"],[/fragrance|perfume/i,"🌸"],
  [/books|fiction|reading/i,"📚"],[/music|vinyl|records/i,"🎵"],
  [/painting|drawing|art supplies/i,"🎨"],[/knitting|crochet|sewing/i,"🧶"],
  [/craft|scrapbook/i,"✂️"],[/cars|automotive|vehicle/i,"🚗"],
  [/tires|wheels/i,"🛞"],[/motorcycle|scooter/i,"🏍️"],
  [/baby|nursery|toddler/i,"🧸"],[/stroller/i,"🍼"],
  [/sports|fitness|exercise|gym/i,"🏋️"],[/camping|hiking/i,"⛺"],
  [/football|soccer/i,"⚽"],[/cycling|bicycle|bike/i,"🚲"],
  [/toys|dolls|figures/i,"🧸"],[/puzzles|board games/i,"🧩"],
  [/pets|dogs|cats/i,"🐾"],[/office|stationery/i,"🗂️"],
  [/appliances|refrigerator|freezer/i,"🧊"],[/dishwasher/i,"🍽️"],
  [/collectibles|antiques/i,"🏆"],[/electronics|gadgets/i,"🔌"],
];
const SUBCATEGORY_COLOURS: Array<[string,string]> = [
  ["#ff8617","#fa356b"],["#fa36b3","#8138f5"],["#0ac48a","#007baf"],
  ["#ffbe12","#f4681b"],["#0676f9","#04c3ef"],["#8641ef","#dc35f6"],
  ["#ff596f","#ff9b38"],["#14b8a6","#0c78db"],["#91c91b","#08a46e"],
  ["#d638db","#5635c6"],["#ff6a23","#e92c9c"],["#169cf6","#6045e9"],
];
function subcategoryArtwork(category: string, subcategory: string, index: number) {
  const key = category + "/" + subcategory;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  const colors = SUBCATEGORY_COLOURS[Math.abs(hash) % SUBCATEGORY_COLOURS.length];
  const subject = SUBCATEGORY_SUBJECTS.find(([pattern]) => pattern.test(subcategory))?.[1]
    ?? ["📦","✨","🎁","🛍️","⭐","🎯"][Math.abs(hash) % 6];
  return {colors,subject,angle: (Math.abs(hash) % 17) - 8};
}

const CATEGORY_ORDER = [
  "electronics", "home-kitchen", "clothing-shoes-jewelry",
  "health-household", "toys-games", "automotive",
  "baby-products", "sports-outdoors", "books",
  "cds-vinyl", "arts-crafts-sewing", "industrial-scientific",
];

function CategoryIcon({ name, className = "w-6 h-6 text-white" }: { name: string; className?: string }) {
  const Icon = (LucideIcons[name as LucideIconName] ?? LucideIcons.Tag) as React.ElementType;
  return <Icon className={className} />;
}

export function CategoriesPage() {
  const [, refreshThirdLevels] = useState(0);
  useEffect(() => { let active = true; loadThirdLevelTaxonomy().then(() => { if (active) refreshThirdLevels(n => n + 1); }); return () => { active = false; }; }, []);

  const { formatPrice } = useCurrency();
  const [marketRegion] = useMarketplaceRegion();
  const [featuredListings, setFeaturedListings] = useState<Array<{id:number;public_id?:string|null;publicId?:string|null;title:string;price:string|number;image:string|null;category:string}>>([]);
  const [featuredLoading,setFeaturedLoading]=useState(true);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [countsLoading,setCountsLoading] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const [display, setDisplay] = useState<Record<string,string>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/category-visibility`, {cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(d=>(setHidden(Array.isArray(d.hidden)?d.hidden:[]),setDisplay(d.display||{}))).catch(()=>{});
    fetch(`${API_BASE}/api/listings/category-counts`)
      .then((r) => r.json())
      .then((data: CategoryCount[]) => setCounts(Array.isArray(data) ? data : []))
      .catch(() => {}).finally(()=>setCountsLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setFeaturedLoading(true);
    fetch(`/api/listings?limit=12&region=${marketRegion}`, {signal:controller.signal})
      .then(r=>r.ok?r.json():[])
      .then(data=>setFeaturedListings(Array.isArray(data)?data:[]))
      .catch(()=>{if(!controller.signal.aborted)setFeaturedListings([])})
      .finally(()=>{if(!controller.signal.aborted)setFeaturedLoading(false)});
    return ()=>controller.abort();
  },[marketRegion]);

  const statusFor=(category:string,sub?:string)=>{const key=category+(sub?"__"+sub:"");return display[key]||(hidden.includes(key)?"coming_soon":"active");};
  const labelFor=(state:string)=>state==="maintenance"?"Under Maintenance":"Coming Soon";
  const displayCategories = ACTIVE_CATEGORIES.filter(c=>statusFor(c.slug)!=="hidden").map(c=>({...c,subcategories:c.subcategories.filter(sub=>statusFor(c.slug,sub.slug)!=="hidden")}));
  const ordered = [...displayCategories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.slug);
    const bi = CATEGORY_ORDER.indexOf(b.slug);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const filtered = search.trim()
    ? ordered.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.subcategories.some((sub) => sub.name.toLowerCase().includes(search.toLowerCase()))
      )
    : ordered;

  const selected = displayCategories.find((c) => c.slug === openSlug && statusFor(c.slug)==="active") ?? null;

  function catCount(slug: string) {
    return counts.filter(l => resolveCategory(l.category, l.subcategory).category === slug).reduce((sum, l) => sum + Number(l.count || 0), 0);
  }

  function subCount(catSlug: string, subSlug: string) {
    return counts.filter(l => { const resolved = resolveCategory(l.category, l.subcategory); return resolved.category === catSlug && resolved.subcategory === subSlug; }).reduce((sum, l) => sum + Number(l.count || 0), 0);
  }

  function themeFor(slug: string) {
    const i = ordered.findIndex((c) => c.slug === slug);
    return CATEGORY_THEMES[(i < 0 ? 0 : i) % CATEGORY_THEMES.length];
  }

  const activeCategories = filtered.filter(cat=>statusFor(cat.slug)==="active");
  const featuredCategory = selected ?? activeCategories.find(cat=>cat.slug==="electronics") ?? activeCategories[0];
  const curated = featuredCategory?.subcategories.filter(sub=>statusFor(featuredCategory.slug,sub.slug)==="active").slice(0,5) ?? [];
  const categoryListings = featuredCategory ? featuredListings.filter(item => resolveCategory(item.category).category===featuredCategory.slug).slice(0,4) : [];
  const products = categoryListings.length ? categoryListings : featuredListings.slice(0,4);
  return <div className="min-h-screen flex flex-col bg-[#f5f8fd] text-slate-950 dark:bg-[#071426] dark:text-white">
    <Navbar />
    <main className="bz-category-redesign flex-1 mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Link href="/">Home</Link><span>›</span><span>Categories</span></nav>
      <div className="grid gap-4 lg:grid-cols-[205px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] items-start">
        <aside className="bz-category-sidebar rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#304461] dark:bg-[#10213c] lg:sticky lg:top-24" aria-label="Category navigation">
          <button type="button" onClick={()=>setOpenSlug(null)} className={`mb-2 w-full rounded-xl px-3 py-3 text-left text-sm font-extrabold ${!selected?"bg-gradient-to-r from-pink-500 to-orange-400 text-white":"text-slate-900 dark:text-white"}`}>All Categories</button>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {filtered.map(cat=>{const available=statusFor(cat.slug)==="active",active=selected?.slug===cat.slug;return <button key={cat.slug} type="button" disabled={!available} onClick={()=>setOpenSlug(cat.slug)} aria-current={active?"page":undefined} className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors ${active?"bg-blue-600 text-white":available?"text-slate-900 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-[#1f3b68]":"text-slate-500 dark:text-slate-400 opacity-60 cursor-not-allowed"}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${themeFor(cat.slug)} text-white`}><CategoryIcon name={cat.icon} className="h-4 w-4"/></span><span className="min-w-0 flex-1 leading-tight">{cat.name}</span></button>})}
          </nav>
          {!filtered.length&&<p className="p-3 text-sm text-slate-700 dark:text-slate-200">No matching categories.</p>}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#172945]"><p className="text-xs font-bold text-slate-900 dark:text-white">Shop by marketplace</p><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{marketRegion==="uk"?"🇬🇧 UK marketplace":"🇺🇸 USA marketplace"}</p></div>
        </aside>
        <div className="min-w-0 space-y-6">
          <section className="bz-category-hero relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-[#f52994] via-[#a535d9] to-[#185be7] px-5 py-7 text-white dark:border-purple-600/40 dark:from-[#232ab1] dark:via-[#9234db] dark:to-[#ee368c] sm:px-8 sm:py-9">
            <div className="relative z-10 max-w-[600px]"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{selected ? selected.name : "Shop by Category"}</h1><p className="mt-2 text-sm font-semibold text-white">Discover new and pre-loved finds from Bazunk sellers.</p>
              <div className="relative mt-4"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search categories" placeholder="Search in all categories…" className="h-11 w-full rounded-full border border-white bg-white px-11 text-sm font-medium text-slate-950 placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-orange-500 dark:bg-[#111f36] dark:border-indigo-300 dark:text-white dark:placeholder:text-slate-300"/></div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white"><span>✦ Great deals</span><span>✓ Trusted sellers</span><span>♢ Buyer Protection</span><span>🇬🇧 UK &amp; 🇺🇸 USA</span></div>
            </div><div aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-2 hidden text-[120px] opacity-30 sm:block">🛍️</div>
          </section>
          <section aria-label="Popular categories"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">Popular categories</h2><button onClick={()=>{setSearch("");setOpenSlug(null)}} className="rounded-full border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-800 dark:text-blue-200">View all categories →</button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{filtered.filter(cat=>statusFor(cat.slug)==="active").map((cat,i)=><button key={cat.slug} onClick={()=>setOpenSlug(cat.slug)} type="button" className="bz-category-modern-card group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-colors hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 dark:border-[#304461] dark:bg-[#111f36] dark:hover:border-blue-400">
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-br from-blue-50 to-purple-100 dark:from-[#1a345a] dark:to-[#22244b]">{CATEGORY_ART[cat.slug]?<img src={CATEGORY_ART[cat.slug]} alt="" loading="lazy" className="h-full w-full object-cover" />:<div className={`grid h-full place-items-center bg-gradient-to-br ${CATEGORY_THEMES[i%CATEGORY_THEMES.length]}`}><CategoryIcon name={cat.icon} className="h-12 w-12 text-white"/></div>}</div>
              <div className="flex min-h-[68px] flex-1 flex-col justify-center px-3 py-2"><h3 className="text-sm font-extrabold leading-tight text-slate-950 dark:text-white">{cat.name}</h3><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{catCount(cat.slug)>0?`${catCount(cat.slug)} listings`:`${cat.subcategories.length} subcategories`}</p></div></button>)}</div>
            {!activeCategories.length&&<p className="rounded-xl bg-white p-5 text-slate-700 dark:bg-[#111f36] dark:text-slate-200">No active categories match your search.</p>}
          </section>
          {featuredCategory&&<section aria-label="Featured subcategories"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-extrabold">Featured subcategories {selected ? `in ${selected.name}` : ""}</h2><Link href={`/browse?category=${encodeURIComponent(featuredCategory.slug)}`} className="text-sm font-bold text-blue-700 dark:text-blue-200">Browse all →</Link></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{curated.map((sub,i)=>{const art=subcategoryArtwork(featuredCategory.slug,sub.name,i);return <Link key={sub.slug} href={`/browse?category=${encodeURIComponent(featuredCategory.slug)}&sub=${encodeURIComponent(sub.slug)}`} className="bz-category-modern-card flex min-w-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center transition-colors hover:border-blue-500 dark:border-[#304461] dark:bg-[#111f36]"><div className="mb-2 grid aspect-square w-full max-w-[140px] place-items-center rounded-xl text-5xl" style={{background:`linear-gradient(135deg,${art.colors[0]}22,${art.colors[1]}55)`}} aria-hidden="true">{art.subject}</div><span className="text-sm font-bold text-slate-950 dark:text-white">{sub.name}</span></Link>})}</div>
          </section>}
          <section aria-label="Marketplace listings"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold">{categoryListings.length&&featuredCategory?`Popular items in ${featuredCategory.name}`:"Explore marketplace listings"}</h2><Link href={featuredCategory?`/browse?category=${encodeURIComponent(featuredCategory.slug)}`:"/browse"} className="text-sm font-bold text-blue-700 dark:text-blue-200">View listings →</Link></div>
            {featuredLoading?<p role="status" className="py-8 text-sm text-slate-700 dark:text-slate-200">Loading marketplace listings…</p>:products.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{products.map(item=><Link key={item.id} href={`/listing/${item.public_id??item.publicId??item.id}`} className="bz-category-modern-card overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#304461] dark:bg-[#111f36]"><div className="aspect-[4/3] bg-slate-100 p-3 dark:bg-[#1b3052]">{item.image?<img src={item.image} alt="" loading="lazy" className="h-full w-full object-contain"/>:<div className="grid h-full place-items-center text-slate-500">No photo</div>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-slate-950 dark:text-white">{item.title}</h3><p className="mt-2 text-base font-extrabold text-slate-950 dark:text-white">{formatPrice(Number(item.price))}</p></div></Link>)}</div>:<div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#304461] dark:bg-[#111f36]"><p className="text-sm text-slate-700 dark:text-slate-200">No products are currently available. Explore categories or browse all listings.</p><Link href="/browse" className="mt-2 inline-block font-bold text-blue-700 dark:text-blue-300">Browse marketplace →</Link></div>}
          </section>
        </div>
      </div>
    </main><AdSlot slotKey="categories_top"/><Footer/>
  </div>;
}
