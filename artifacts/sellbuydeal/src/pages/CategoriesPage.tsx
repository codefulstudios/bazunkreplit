import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useState, useEffect } from "react";
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

  const { formatPrice, currency } = useCurrency();
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

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-950 dark:bg-[#071426] dark:text-white flex flex-col transition-colors">
      <Navbar />
      {countsLoading && <MarketplaceLoader area="categories" label="Loading categories…" />}

      <main className="bazunk-categories flex-1 bg-[#f5f8fd] text-slate-950 dark:bg-[#071426] dark:text-white">
        <div className="container mx-auto max-w-7xl px-4 py-5 grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)] gap-4 items-start">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#10213d] lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto [scrollbar-width:thin]" aria-label="Browse categories">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-sky-200" />
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories..." className="pl-9 bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-500 dark:bg-[#07172e] dark:border-slate-600 dark:text-white" />
            </div>
            <nav className="space-y-1">
              <button type="button" onClick={()=>{setOpenSlug(null);setSearch("");}} className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-3 text-left font-extrabold transition-colors ${!selected?"bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg":"bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-[#193353] dark:text-white dark:hover:bg-[#255082]"}`}>
                <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-white/20"><Grid3X3 className="w-5 h-5 text-white"/></span>
                <span className="flex-1 text-sm">All Categories</span><ChevronRight className="w-4 h-4"/>
              </button>
              <div className="my-3 border-t border-slate-200 dark:border-sky-300/20"/>
              {filtered.map(category=>{
                const state=statusFor(category.slug), active=selected?.slug===category.slug;
                const disabled=state!=="active";
                return <button key={category.slug} type="button" disabled={disabled} onClick={()=>setOpenSlug(category.slug)} className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${active?"bg-blue-600 text-white shadow-lg shadow-blue-900/30":disabled?"bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-[#172941] dark:text-slate-300":"bg-white text-slate-900 hover:bg-blue-50 dark:bg-[#142c4b] dark:text-white dark:hover:bg-[#235187]"}`}>
                  <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br ${themeFor(category.slug)}`}><CategoryIcon name={category.icon} className="w-4 h-4 text-white"/></span>
                  <span className="flex-1 min-w-0 text-sm font-bold">{category.name}</span>
                  {disabled?<LucideIcons.LockKeyhole className="w-3.5 h-3.5 text-slate-200"/>:<span className="flex items-center gap-1 text-xs font-bold">{catCount(category.slug)>0?catCount(category.slug).toLocaleString():""}<ChevronRight className="w-3.5 h-3.5"/></span>}
                </button>;
              })}
              {!filtered.length&&<p className="p-3 text-sm text-slate-300">No categories match your search.</p>}
            </nav>
          </aside>
          <div className="min-w-0 space-y-5">
            {selected ? <>
              <section className={`relative min-h-[190px] sm:min-h-[215px] overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-r ${themeFor(selected.slug)}`}>
                {CATEGORY_ART[selected.slug]&&<img src={CATEGORY_ART[selected.slug]} alt="" className="absolute right-0 inset-y-0 h-full w-[65%] object-cover object-bottom opacity-90"/>}
                <div className="absolute inset-0 bg-gradient-to-r from-[#06132e]/95 via-[#071d43]/75 to-transparent"/>
                <div className="relative z-10 p-6 sm:p-8 max-w-[85%]">
                  <p className="text-xs text-sky-100 mb-3"><Link href="/" className="hover:underline">Home</Link> › Categories › {selected.name}</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{selected.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{selected.subcategories.length} subcategories{catCount(selected.slug)>0?` · ${catCount(selected.slug).toLocaleString()} listings`:""}</p>
                  <p className="mt-3 text-xs sm:text-sm text-white">Explore {selected.name.toLowerCase()} products from Bazunk sellers.</p>
                  <Link href={`/browse?category=${encodeURIComponent(selected.slug)}`} className="inline-flex mt-4 items-center gap-1 rounded-lg bg-white px-4 py-2 text-xs font-black text-[#08204a] hover:bg-sky-100">View all listings <ChevronRight className="w-4 h-4"/></Link>
                </div>
              </section>
              <section>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4"><h3 className="text-xl font-black">Subcategories</h3><Link href={`/browse?category=${encodeURIComponent(selected.slug)}`} className="text-sm font-bold text-amber-300 hover:text-white">View All {selected.name} →</Link></div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {selected.subcategories.map((sub,index)=>{
                    const state=statusFor(selected.slug,sub.slug),disabled=state!=="active",subTotal=subCount(selected.slug,sub.slug),art=subcategoryArtwork(selected.slug,sub.name,index);
                    const body=<><div className="relative h-36 sm:h-44 overflow-hidden" style={{background:`linear-gradient(125deg, ${art.colors[0]}, ${art.colors[1]})`}}>
                      <div aria-hidden="true" className="absolute -right-7 -top-10 h-36 w-36 rounded-full bg-white/20 blur-xl"/>
                      <div aria-hidden="true" className="absolute -left-8 -bottom-12 h-36 w-36 rounded-full bg-black/10"/>
                      <span aria-hidden="true" className="absolute right-3 bottom-0 text-[100px] sm:text-[120px] leading-none drop-shadow-[0_12px_12px_rgba(0,0,0,0.24)] transition-transform duration-300 group-hover:scale-110" style={{transform:`rotate(${art.angle}deg)`}}>{art.subject}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"/>
                      <div className="absolute left-3 top-3 right-3"><h4 className="max-w-[88%] text-base sm:text-lg font-black leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{sub.name}</h4><p className="text-xs font-bold text-white mt-1 drop-shadow">{disabled?labelFor(state):subTotal>0?`${subTotal.toLocaleString()} listings`:"Explore listings"}</p></div>
                      <span className="absolute bottom-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-[#092243]/85 border border-white/40 text-white"><ChevronRight className="w-5 h-5"/></span>
                    </div></>;
                    return disabled?<div key={sub.slug} className="rounded-xl overflow-hidden border border-white/10 bg-[#102541] opacity-60">{body}</div>:<Link key={sub.slug} href={`/browse?category=${encodeURIComponent(selected.slug)}&sub=${encodeURIComponent(sub.slug)}`} className="group rounded-xl overflow-hidden border border-sky-300/20 bg-[#102541] hover:border-sky-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-fuchsia-900/30 transition-all">{body}</Link>;
                  })}
                </div>
              </section>
              {selected.subcategories.some(sub=>suggestedThirdLevel(selected.slug,sub.slug).length>0)&&<section className="rounded-2xl border border-sky-300/30 bg-[#142e50] p-5"><h3 className="font-black text-lg text-white mb-4">Explore more specific categories</h3><div className="flex flex-wrap gap-2">{selected.subcategories.flatMap(sub=>suggestedThirdLevel(selected.slug,sub.slug).map(name=><Link key={sub.slug+name} href={`/browse?category=${encodeURIComponent(selected.slug)}&sub=${encodeURIComponent(sub.slug)}&subsub=${encodeURIComponent(thirdLevelSlug(name))}`} className="inline-flex items-center rounded-lg bg-[#1765dc] border border-[#65b4ff] px-4 py-2.5 text-sm font-extrabold !text-white hover:bg-[#287cf3] shadow-sm shadow-blue-950/40 transition-colors">{name}</Link>))}</div></section>}
              <section><h3 className="text-xl font-black mb-4">Browse Other Categories</h3><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">{ordered.filter(c=>c.slug!==selected.slug&&statusFor(c.slug)==="active").slice(0,8).map(c=><button type="button" key={c.slug} onClick={()=>{setOpenSlug(c.slug);}} className={`relative min-h-[105px] rounded-xl overflow-hidden text-left p-3 bg-gradient-to-br ${themeFor(c.slug)} hover:brightness-110 transition-all`}>{CATEGORY_ART[c.slug]&&<img src={CATEGORY_ART[c.slug]} alt="" className="absolute inset-0 w-full h-full object-cover object-bottom opacity-65"/>}<div className="absolute inset-0 bg-gradient-to-r from-black/65 to-transparent"/><span className="relative z-10 text-sm font-black">{c.name}</span></button>)}</div></section>
            </>:<>
<section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1947b5] via-[#7135c9] to-[#e23b97] px-6 py-7 text-white sm:px-8 sm:py-8">
 <div className="relative z-10 max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Explore Bazunk</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Shop by Category</h1><p className="mt-2 text-sm font-medium text-white">Browse categories and discover listings from Bazunk sellers.</p>
 <div className="relative mt-5 max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"/><Input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search all categories" placeholder="Search in all categories…" className="h-11 rounded-full border-white bg-white pl-10 text-slate-950 placeholder:text-slate-500"/></div>
 <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-white"><span>✓ Easy browsing</span><span>✓ Verified sellers</span><span>✓ UK &amp; USA</span></div></div>
 <Grid3X3 aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-8 h-52 w-52 rotate-12 text-white/15"/></section>
<section><div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-xl font-black">Popular categories</h3><span className="text-sm font-semibold text-slate-600 dark:text-sky-200">{filtered.length} categories</span></div>
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
{filtered.map((category,index)=>{
const state=statusFor(category.slug),unavailable=state!=="active",art=CATEGORY_ART[category.slug];
return <button key={category.slug} type="button" disabled={unavailable} onClick={()=>{setOpenSlug(category.slug);window.scrollTo({top:0,behavior:"smooth"});}} className={`group relative overflow-hidden rounded-2xl border border-sky-300/20 bg-white dark:bg-[#112846] text-left transition-colors ${unavailable?"opacity-55 cursor-not-allowed":"hover:border-blue-500 hover:shadow-md"}`}>
<div className={`relative h-28 sm:h-32 bg-gradient-to-br ${CATEGORY_THEMES[index%CATEGORY_THEMES.length]}`}>{art&&<img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#061426]/80 via-transparent to-transparent"/><div className="absolute bottom-2 left-3 rounded-lg bg-black/45 p-2"><CategoryIcon name={category.icon} className="w-5 h-5 text-white"/></div></div>
<div className="p-3 sm:p-4"><h4 className="text-sm font-black leading-tight text-slate-950 dark:text-white">{category.name}</h4><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-sky-200">{unavailable?labelFor(state):category.subcategories.length+" subcategories"+(catCount(category.slug)>0?" · "+catCount(category.slug)+" listings":"")}</p></div>
</button>;
})}
</div></section></>}
          </div>
        </div>
      </main>

      {/* Keep the existing admin-managed categories_top placement and its saved advert settings. */}
      <AdSlot slotKey="categories_top" />

      <Footer />
    </div>
  );
}
