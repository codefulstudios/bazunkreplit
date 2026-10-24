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
  "electronics": "/category-art/modern-electronics.svg",
  "home-kitchen": "/category-art/modern-home-kitchen.svg",
  "clothing-shoes-jewelry": "/category-art/modern-clothing-shoes-jewelry.svg",
  "health-household": "/category-art/modern-health-household.svg",
  "sports-outdoors": "/category-art/modern-sports-outdoors.svg",
  "toys-games": "/category-art/modern-toys-games.svg",
  "automotive": "/category-art/modern-automotive.svg",
  "books": "/category-art/modern-books.svg",
  "pet-supplies": "/category-art/modern-pet-supplies.svg",
  "cell-phones": "/category-art/modern-cell-phones.svg",
  "adult": "/category-art/modern-adult.svg",
  "digital": "/category-art/modern-digital.svg",
  "musical-instruments": "/category-art/modern-musical-instruments.svg",
  "office-products": "/category-art/modern-office-products.svg",
  "patio-lawn-garden": "/category-art/modern-patio-lawn-garden.svg",
  "tools-home-improvement": "/category-art/modern-tools-home-improvement.svg",
  "video-games": "/category-art/modern-video-games.svg",
  "baby-products": "/category-art/modern-baby-products.svg",
  "cds-vinyl": "/category-art/modern-cds-vinyl.svg",
  "arts-crafts-sewing": "/category-art/modern-arts-crafts-sewing.svg",
  "industrial-scientific": "/category-art/modern-industrial-scientific.svg",
  "appliances": "/category-art/modern-appliances.svg",
  "beauty-personal-care": "/category-art/modern-beauty-personal-care.svg",
  "eco-friendly": "/category-art/modern-eco-friendly.svg",
  "movies-tv": "/category-art/modern-movies-tv.svg",
  "jewellery-watches": "/category-art/modern-jewellery-watches.svg",
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
  "electronics", "computing", "home-kitchen", "clothing-shoes-jewelry",
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
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [countsLoading,setCountsLoading] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const [display, setDisplay] = useState<Record<string,string>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/category-visibility`, {cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(d=>(setHidden(Array.isArray(d.hidden)?d.hidden:[]),setDisplay(d.display||{}))).catch(()=>{});
    fetch(`${API_BASE}/api/listings/category-counts?region=${encodeURIComponent(marketRegion)}`)
      .then((r) => r.json())
      .then((data: CategoryCount[]) => setCounts(Array.isArray(data) ? data : []))
      .catch(() => {}).finally(()=>setCountsLoading(false));
  }, [marketRegion]);

  useEffect(() => {
    const controller = new AbortController();
    setFeaturedLoading(true);
    fetch(`${API_BASE}/api/listings?limit=24&region=${encodeURIComponent(marketRegion)}&category=${encodeURIComponent(openSlug || "electronics")}`, {signal:controller.signal})
      .then(r=>r.ok?r.json():[])
      .then(data=>setFeaturedListings(Array.isArray(data)?data:[]))
      .catch(()=>{if(!controller.signal.aborted)setFeaturedListings([])})
      .finally(()=>{if(!controller.signal.aborted)setFeaturedLoading(false)});
    return ()=>controller.abort();
  },[marketRegion,openSlug]);

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
  const curated = featuredCategory?.subcategories.filter(sub=>statusFor(featuredCategory.slug,sub.slug)==="active") ?? [];
  const categoryListings = featuredCategory ? featuredListings.filter(item => resolveCategory(item.category).category===featuredCategory.slug).slice(0,4) : [];
  const visibleSubs = curated.filter(sub => !search.trim() || sub.name.toLowerCase().includes(search.toLowerCase()) || suggestedThirdLevel(featuredCategory!.slug,sub.slug).some(name=>name.toLowerCase().includes(search.toLowerCase())));
  const selectedSub = visibleSubs.find(sub=>sub.slug===activeSub) ?? visibleSubs[0];
  const selectedThird = selectedSub && featuredCategory ? suggestedThirdLevel(featuredCategory.slug,selectedSub.slug) : [];
  const products = categoryListings;
  return <div className="min-h-screen flex flex-col bg-[#f5f8fd] text-slate-950 dark:bg-[#071426] dark:text-white">
    <Navbar />
    <main className="bz-category-redesign flex-1 mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Link href="/">Home</Link><span>›</span><span>Categories</span></nav>
      <div className="grid gap-4 lg:grid-cols-[205px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] items-start">
        <aside className="bz-category-sidebar rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#304461] dark:bg-[#10213c] lg:sticky lg:top-24" aria-label="Category navigation">
          <button type="button" onClick={()=>setOpenSlug(null)} className={`mb-2 w-full rounded-xl px-3 py-3 text-left text-sm font-extrabold ${!selected?"bg-gradient-to-r from-pink-500 to-orange-400 text-white":"text-slate-900 dark:text-white"}`}>All Categories</button>
          <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Browse category departments">
            {filtered.map(cat=>{
              const available=statusFor(cat.slug)==="active";
              const active=selected?.slug===cat.slug;
              const subcategories=cat.subcategories.filter(sub=>statusFor(cat.slug,sub.slug)==="active");
              return <div key={cat.slug} className="min-w-0">
                <button type="button" disabled={!available} onClick={()=>setOpenSlug(active?null:cat.slug)}
                  aria-expanded={active} aria-controls={"category-subs-"+cat.slug}
                  className={`flex w-full min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors ${active?"bg-blue-600 text-white":available?"text-slate-900 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-[#1f3b68]":"text-slate-700 dark:text-slate-200 cursor-not-allowed"}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${themeFor(cat.slug)} text-white`}><CategoryIcon name={cat.icon} className="h-4 w-4"/></span>
                  <span className="min-w-0 flex-1 leading-snug font-bold">{cat.name}</span>
                  {active?<ChevronDown className="h-4 w-4 shrink-0"/>:<ChevronRight className="h-4 w-4 shrink-0"/>}
                </button>
                {active&&<div id={"category-subs-"+cat.slug} className="my-1 ml-3 max-h-80 space-y-0.5 overflow-y-auto rounded-lg border-l-2 border-blue-400 bg-[#172c4b] pl-2 pr-1 py-1" aria-label={cat.name+" subcategories"}>
                  {subcategories.length?subcategories.map(sub=><Link key={sub.slug} href={"/browse?category="+encodeURIComponent(cat.slug)+"&sub="+encodeURIComponent(sub.slug)} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold !text-white hover:!text-white hover:bg-[#294b79] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"><span>{sub.name}</span><ChevronRight className="h-4 w-4 shrink-0"/></Link>):<p className="px-2 py-3 text-xs text-slate-700 dark:text-slate-200">No subcategories available.</p>}
                  <Link href={"/browse?category="+encodeURIComponent(cat.slug)} className="block px-2.5 py-2 text-sm font-bold !text-sky-200 hover:!text-white hover:underline">View all {cat.name} listings →</Link>
                </div>}
              </div>;
            })}
          </nav>
          {!filtered.length&&<p className="p-3 text-sm text-slate-700 dark:text-slate-200">No matching categories.</p>}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#172945]"><p className="text-xs font-bold text-slate-900 dark:text-white">Shop by marketplace</p><p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{marketRegion==="uk"?"🇬🇧 UK marketplace":"🇺🇸 USA marketplace"}</p></div>
        </aside>
        <div className="min-w-0 space-y-6">

          <header className="flex flex-wrap items-center justify-between gap-4 py-2">
            <div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Categories / {featuredCategory?.name || "All categories"}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{featuredCategory?.name || "Discover the marketplace"}</h1>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Browse subcategories and find exactly what you need.</p>
            </div>
            {featuredCategory && <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-[#304461] dark:bg-[#10213c] dark:text-slate-100">
              {curated.length} subcategories <span className="mx-2 text-slate-400">·</span> {countsLoading?"Loading listings…":catCount(featuredCategory.slug)+" listings"}
            </div>}
          </header>
          <section aria-label="Search categories" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#304461] dark:bg-[#111f36] sm:p-4">
            <label htmlFor="category-search" className="sr-only">Search categories and third-level categories</label>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-300"/>
              <input id="category-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories, laptops, monitors, headphones…" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-950 placeholder:text-slate-600 focus:outline focus:outline-2 focus:outline-orange-500 dark:border-[#425676] dark:bg-[#162842] dark:text-white dark:placeholder:text-slate-300"/>
            </div>
          </section>
          {featuredCategory && <section aria-label="Browse category hierarchy" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#304461] dark:bg-[#111f36] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Browse {featuredCategory.name} categories</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Choose a subcategory to see its available third-level categories.</p></div>
              <Link href={"/browse?category="+encodeURIComponent(featuredCategory.slug)} className="text-sm font-bold text-orange-700 hover:underline dark:text-orange-300">View all listings →</Link>
            </div>
            {visibleSubs.length ? <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div role="group" aria-label="Subcategories" className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-[#304461] dark:bg-[#10213c]">
                {visibleSubs.map(sub=><button key={sub.slug} type="button" aria-pressed={selectedSub?.slug===sub.slug} onClick={()=>setActiveSub(sub.slug)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm font-bold transition-colors ${selectedSub?.slug===sub.slug?"bg-blue-700 text-white":"text-slate-900 hover:bg-blue-100 dark:text-slate-100 dark:hover:bg-[#254368]"}`}>
                  <span>{sub.name}</span><ChevronRight className="h-4 w-4 shrink-0"/>
                </button>)}
              </div>
              {selectedSub && <div className="rounded-xl border border-slate-200 p-3 dark:border-[#304461] dark:bg-[#142844]">
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-[#304461]">
                  <div><h3 className="font-extrabold text-slate-950 dark:text-white">{selectedSub.name}</h3>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{subCount(featuredCategory.slug,selectedSub.slug)} listings</p></div>
                  <Link href={"/browse?category="+encodeURIComponent(featuredCategory.slug)+"&sub="+encodeURIComponent(selectedSub.slug)} className="text-xs font-bold text-blue-700 dark:text-sky-300">View all →</Link>
                </div>
                {selectedThird.length ? <div className="divide-y divide-slate-200 dark:divide-[#304461]">
                  {selectedThird.map(name=><Link key={name} href={"/browse?category="+encodeURIComponent(featuredCategory.slug)+"&sub="+encodeURIComponent(selectedSub.slug)+"&subsubcategory="+encodeURIComponent(thirdLevelSlug(name))}
                    className="flex min-h-12 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-50 dark:text-white dark:hover:bg-[#254368]"><span>{name}</span><ChevronRight className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300"/></Link>)}
                </div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-[#10213c] dark:text-slate-200">No third-level categories are currently enabled. You can still browse all {selectedSub.name} listings.</p>}
              </div>}
            </div> : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-700 dark:bg-[#10213c] dark:text-slate-200">No matching enabled subcategories.</p>}
          </section>}
          {featuredCategory && <section aria-label="Shop subcategories">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Shop subcategories</h2><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{curated.length} available</span></div>
            {visibleSubs.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleSubs.map((sub,i)=>{
              const art=subcategoryArtwork(featuredCategory.slug,sub.name,i);
              const count=subCount(featuredCategory.slug,sub.slug);
              return <Link key={sub.slug} href={"/browse?category="+encodeURIComponent(featuredCategory.slug)+"&sub="+encodeURIComponent(sub.slug)} className="group flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-[#304461] dark:bg-[#142844] dark:hover:bg-[#1c3658]">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl" style={{background:"linear-gradient(135deg,"+art.colors[0]+"22,"+art.colors[1]+"55)"}} aria-hidden="true">{art.subject}</div>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold leading-snug text-slate-950 dark:text-white">{sub.name}</h3><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-200">{countsLoading?"Checking listings…":count+" "+(count===1?"listing":"listings")}</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300"/>
              </Link>;
            })}</div> : <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-700 dark:border-slate-700 dark:bg-[#111f36] dark:text-slate-200">No active subcategories for this department.</p>}
          </section>}
          <section aria-label="Category listings">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Recently listed {featuredCategory ? "in "+featuredCategory.name : "on Bazunk"}</h2><p className="text-sm text-slate-700 dark:text-slate-200">Actual marketplace listings — no example products</p></div><Link href={featuredCategory?"/browse?category="+encodeURIComponent(featuredCategory.slug):"/browse"} className="text-sm font-bold text-blue-700 hover:underline dark:text-blue-200">Browse all →</Link></div>
            {featuredLoading ? <p role="status" className="rounded-xl border border-slate-200 p-6 text-slate-700 dark:text-slate-200">Loading listings…</p> : categoryListings.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{categoryListings.map(item=><Link key={item.id} href={"/listing/"+(item.public_id??item.publicId??item.id)} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-500 dark:border-[#304461] dark:bg-[#111f36]"><div className="aspect-[5/4] bg-slate-100 p-3 dark:bg-[#1b3052]">{item.image ? <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-contain"/> : <div className="grid h-full place-items-center text-sm text-slate-600 dark:text-slate-200">No photo</div>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-950 dark:text-white">{item.title}</h3><p className="mt-2 text-lg font-extrabold text-slate-950 dark:text-white">{formatPrice(Number(item.price))}</p></div></Link>)}</div> : <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-[#304461] dark:bg-[#111f36]"><p className="text-sm text-slate-700 dark:text-slate-200">No live listings found in this category yet. You can still explore its subcategories or browse the marketplace.</p><Link href="/browse" className="mt-3 inline-block text-sm font-bold text-blue-700 dark:text-blue-200">Browse all listings →</Link></div>}
          </section>

        </div>
      </div>
    </main><AdSlot slotKey="categories_top"/><Footer/>
  </div>;
}
