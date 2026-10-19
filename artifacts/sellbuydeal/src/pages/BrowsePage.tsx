import { useMarketplaceLoadingDelay } from "@/components/useMarketplaceLoadingDelay";
import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useSearch, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Bell, SlidersHorizontal, X, Heart, Eye, CheckCircle2,
  Grid3X3, List, ChevronDown, ChevronUp, ArrowUpDown, Users,
  MapPin, Star, ImageOff, Truck, Globe, Gavel, Zap, ShoppingBag,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { Badge } from "@/components/ui/badge";
import { ALL_PRODUCTS } from "@/data/products";
import { CATEGORIES, suggestedThirdLevel, thirdLevelSlug, loadThirdLevelTaxonomy } from "@/data/categories";
import { useCurrency } from "@/context/CurrencyContext";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

type SortKey = "newest" | "price-asc" | "price-desc" | "views" | "price-lowest";

interface ApiListing {
  id: number;
  title: string;
  price: string;
  category: string;
  subcategory: string | null;
  subsubcategory?: string | null;
  condition: string;
  image: string | null;
  seller_email: string;
  seller_name: string | null;
  views: number;
  watchers: number;
  status: string;
  created_at: string;
  promotions?: string[];
  publicId?: string | null;
  public_id?: string | null;
  shipOrigin?: string | null;
  shipOriginOther?: string | null;
  shipZone?: string | null;
  shippingPrice?: string | number | null;
}

function mapApiListing(l: ApiListing): typeof ALL_PRODUCTS[0] & { subcategory?: string; subsubcategory?: string; promotions: string[] } {
  return {
    id: l.id,
    title: l.title,
    price: parseFloat(l.price),
    condition: (l.condition as typeof ALL_PRODUCTS[0]["condition"]) || "good",
    category: l.category,
    subcategory: l.subcategory ?? undefined,
    subsubcategory: l.subsubcategory ?? undefined,
    promotions: l.promotions ?? [],
    publicId: l.publicId ?? l.public_id ?? null,
    shipOrigin: l.shipOrigin ?? null,
    shipOriginOther: l.shipOriginOther ?? null,
    shipZone: l.shipZone ?? null,
    shippingPrice: l.shippingPrice ?? null,
    image: l.image ?? null,
    views: l.views ?? 0,
    watchers: l.watchers ?? 0,
    verified: false,
    location: l.shipOriginOther || l.shipOrigin || "UK",
    listed: l.created_at ?? new Date().toISOString(),
    seller: { name: l.seller_name ?? "Seller", verified: false, rating: 4.5, reviews: 0 },
    description: "",
    tags: [],
    badges: [],
    rating: 4.5,
    reviews: 0,
  } as unknown as typeof ALL_PRODUCTS[0] & { subcategory?: string; promotions: string[] };
}

const CONDITIONS = ["new", "like new", "good", "fair", "poor"];

const CONDITION_COLORS: Record<string, string> = {
  "new":      "bg-emerald-100 text-emerald-700",
  "like new": "bg-teal-100 text-teal-700",
  "good":     "bg-blue-100 text-blue-700",
  "fair":     "bg-yellow-100 text-yellow-700",
  "poor":     "bg-red-100 text-red-700",
};

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-gray-800 mb-0 hover:text-[#4A5CE8] transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROMO_BADGE: Record<string, { label: string; cls: string }> = {
  spotlight: { label: "★ Spotlight", cls: "bg-[#F26B21] text-white" },
  featured:  { label: "⭐ Featured",  cls: "bg-amber-400 text-white" },
  flash:     { label: "⚡ Flash Sale", cls: "bg-[#4A5CE8] text-white" },
};

function PromoBadge({ promotions }: { promotions: string[] }) {
  const key = ["spotlight", "featured", "flash"].find((k) => promotions.includes(k));
  if (!key) return null;
  const { label, cls } = PROMO_BADGE[key];
  return <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function ProductCard({ product, view, promotions = [] }: { product: typeof ALL_PRODUCTS[0]; view: "grid" | "list"; promotions?: string[] }) {
  const [wishlisted, setWishlisted] = useState(false);
  const { formatPrice } = useCurrency();

  const isFeatured = promotions.includes("featured");
  const isSpotlight = promotions.includes("spotlight");
  const hasPromo = promotions.length > 0;

  if (view === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bz-product-card bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex gap-4 p-4 group border ${isSpotlight ? "border-[#F26B21] ring-2 ring-[#F26B21]/20" : isFeatured ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200 dark:border-slate-700"}`}
        data-testid={`card-product-${product.id}`}
      >
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f5f7fa] dark:bg-[#18253a] flex-shrink-0 overflow-hidden relative">
          {product.image
            ? <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="w-full h-full object-contain p-4 transition-opacity duration-200" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-8 h-8 text-gray-300" /></div>
          }
          <button
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); setWishlisted(!wishlisted); }}
            aria-label={wishlisted ? "Remove from favourites" : "Add to favourites"} title={wishlisted ? "Remove from favourites" : "Add to favourites"} aria-pressed={wishlisted} className="absolute z-20 top-1.5 right-1.5 w-9 h-9 rounded-full border-2 border-white bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-colors"
            data-testid={`button-wishlist-${product.id}`}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-white text-white" : "fill-none text-white"}`} />
          </button>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {hasPromo && <PromoBadge promotions={promotions} />}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 text-base transition-colors">{product.title}</h3>
            <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">Sold by {product.seller?.name || "Marketplace seller"}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[product.condition]}`}>{product.condition}</span>
              <span className="flex items-center gap-0.5 text-sm text-slate-700 dark:text-slate-200"><MapPin className="w-3.5 h-3.5" />{product.location}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">{formatPrice(product.price)}</span>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{product.views}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{product.watchers}</span>
              {product.verified && <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bz-product-card bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group cursor-pointer flex flex-col border ${isSpotlight ? "border-[#F26B21] ring-2 ring-[#F26B21]/20" : isFeatured ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200 dark:border-slate-700"}`}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-[5/4] bg-[#f5f7fa] dark:bg-[#18253a] border-b border-slate-200 dark:border-slate-700 overflow-hidden">
        {product.image
          ? <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="w-full h-full object-contain p-4 transition-opacity duration-200" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-12 h-12 text-gray-300" /></div>
        }
        {hasPromo && (
          <div className="absolute top-2.5 left-2.5">
            <PromoBadge promotions={promotions} />
          </div>
        )}
        <button
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); setWishlisted(!wishlisted); }}
          aria-label={wishlisted ? "Remove from favourites" : "Add to favourites"} title={wishlisted ? "Remove from favourites" : "Add to favourites"} aria-pressed={wishlisted} className="absolute z-20 top-2.5 right-2.5 w-10 h-10 rounded-full border-2 border-white bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-colors"
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? "fill-white text-white" : "fill-none text-white"}`} />
        </button>
        <div className="absolute bottom-2.5 left-2.5">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[product.condition]}`}>{product.condition}</span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-2 min-h-[2.5rem] transition-colors mb-auto">{product.title}</h3>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">{formatPrice(product.price)}</span>
            <span className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-200"><Eye className="w-3.5 h-3.5" />{product.views}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-200"><MapPin className="w-3.5 h-3.5" />{product.location}</span>
            {product.verified && (
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function BrowsePage() {
  const [marketRegion, setMarketRegion] = useMarketplaceRegion();
  const { getToken } = useClerkAuth();
  const [, refreshThirdLevels] = useState(0);
  useEffect(() => { let active = true; loadThirdLevelTaxonomy().then(() => { if (active) refreshThirdLevels(n => n + 1); }); return () => { active = false; }; }, []);

  const { t } = useLanguage();
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(rawSearch);
  const urlQuery = params.get("q") ?? "";
  const urlCategory = params.get("category") ?? "";
  const urlSub = params.get("sub") ?? "";
  const urlSubsub = params.get("subsub") ?? "";
  const urlList=(name:string)=>params.get(name)?.split(",").filter(Boolean)??[];

  const [query, setQuery] = useState(urlQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlList("categories").length ? urlList("categories") : urlCategory ? [urlCategory] : []);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(urlList("subcategories").length ? urlList("subcategories") : urlSub ? [urlSub] : []);
  const [selectedThirdLevels, setSelectedThirdLevels] = useState<string[]>(urlList("thirdLevels").length ? urlList("thirdLevels") : urlSubsub ? [urlSubsub] : []);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(urlList("conditions"));
  const [minPrice, setMinPrice] = useState(params.get("minPrice")??"");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice")??"");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey)||"newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [listingTypes, setListingTypes] = useState<string[]>([]);
  const [shipFrom, setShipFrom] = useState<string[]>(urlList("shipFrom"));
  const [shipTo, setShipTo] = useState<string[]>(urlList("shipTo"));
  const [freeShipping, setFreeShipping] = useState(params.get("freeShipping")==="true");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [listedWithin, setListedWithin] = useState(params.get("listedWithin")||"any");
  const [apiListings, setApiListings] = useState<(typeof ALL_PRODUCTS[0] & { subcategory?: string; promotions: string[] })[]>([]);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const delayedLoading = useMarketplaceLoadingDelay(loadingListings, "browse");
  const [listingError, setListingError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [saveOpen,setSaveOpen] = useState(false);
  const [saveName,setSaveName] = useState("");
  const [saveAlert,setSaveAlert] = useState(true);
  const [savingSearch,setSavingSearch] = useState(false);
  const [saveFeedback,setSaveFeedback] = useState("");
  const [saveSuccess,setSaveSuccess] = useState(false);
  async function saveCurrentSearch() {
    setSavingSearch(true);setSaveFeedback("");setSaveSuccess(false);
    try{
      const token=await getToken();
      if(!token)throw new Error("Sign in to save searches and receive alerts.");
      const name=saveName.trim()||query.trim()||"My saved search";
      const filters=Object.fromEntries(browseScope.entries());
      const response=await fetch("/api/saved-searches",{
        method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({name,filters,alertEnabled:saveAlert})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not save search");
      setSaveSuccess(true);setSaveOpen(false);setSaveName("");
      setSaveFeedback("Saved to your dashboard. Alerts will appear when newly listed items match.");
    }catch(err){setSaveFeedback(err instanceof Error?err.message:"Could not save search");}
    finally{setSavingSearch(false);}
  }

  const [loadAttempt, setLoadAttempt] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});


  const LISTING_BATCH = 24;
  // Query the database for the selected category rather than filtering only the
  // first 24 listings from the entire marketplace.
  const browseCategory = selectedCategories.length === 1 ? selectedCategories[0] : "";
  const browseSub = browseCategory && selectedSubcategories.length === 1 ? selectedSubcategories[0] : "";
  const browseSubsub = browseSub && selectedThirdLevels.length === 1 ? selectedThirdLevels[0] : "";
  const browseScope = new URLSearchParams();
  browseScope.set("region", marketRegion);
  if (browseCategory) browseScope.set("category", browseCategory);
  if (browseSub) browseScope.set("sub", browseSub);
  if (browseSubsub) browseScope.set("subsub", browseSubsub);
  if (query.trim()) browseScope.set("q", query.trim());
  if (selectedCategories.length) browseScope.set("categories", selectedCategories.join(","));
  if (selectedSubcategories.length) browseScope.set("subcategories", selectedSubcategories.join(","));
  if (selectedThirdLevels.length) browseScope.set("thirdLevels", selectedThirdLevels.join(","));
  if (selectedConditions.length) browseScope.set("conditions", selectedConditions.join(","));
  if (minPrice) browseScope.set("minPrice", minPrice);
  if (maxPrice) browseScope.set("maxPrice", maxPrice);
  browseScope.set("sort", sort);
  if (shipFrom.length) browseScope.set("shipFrom", shipFrom.join(","));
  if (shipTo.length) browseScope.set("shipTo", shipTo.join(","));
  if (freeShipping) browseScope.set("freeShipping", "true");
  if (listedWithin !== "any") browseScope.set("listedWithin", listedWithin);
  const browseScopeQuery = browseScope.toString();


  useEffect(() => {
    fetch(`${API_BASE}/api/listings/category-counts?region=${marketRegion}`)
      .then((r) => {
        if (!r.ok) throw new Error(`category counts ${r.status}`);
        return r.json();
      })
      .then((rows: Array<{ category?: string; subcategory?: string; count?: number | string }>) => {
        const cats: Record<string, number> = {};
        const subs: Record<string, number> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (!row.category) continue;
          const count = Number(row.count ?? 0);
          cats[row.category] = (cats[row.category] ?? 0) + count;
          if (row.subcategory) subs[`${row.category}:${row.subcategory}`] = count;
        }
        setCategoryCounts(cats);
        setSubcategoryCounts(subs);
        setCountsLoaded(true);
      })
      .catch((err) => { setCountsLoaded(false); console.warn("Could not load category counts", err); });
  }, [marketRegion]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingListings(true);
    setApiListings([]);
    setHasMoreListings(true);
    setListingError(null);
    setMoreError(null);
    fetch(`${API_BASE}/api/listings?limit=${LISTING_BATCH}&offset=0${browseScopeQuery ? `&${browseScopeQuery}` : ""}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Listings API returned HTTP ${r.status}`);
        const data: ApiListing[] = await r.json();
        if (!Array.isArray(data)) throw new Error("Invalid listings response");
        if (controller.signal.aborted) return;
        setApiListings(data.map(mapApiListing));
        setHasMoreListings(data.length === LISTING_BATCH);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListingError(error instanceof Error ? error.message : "We couldn’t load listings. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingListings(false);
      });
    return () => controller.abort();
  }, [loadAttempt, browseScopeQuery]);

  async function loadMoreListings() {
    if (loadingMore || loadingListings || !hasMoreListings) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const r = await fetch(`${API_BASE}/api/listings?limit=${LISTING_BATCH}&offset=${apiListings.length}${browseScopeQuery ? `&${browseScopeQuery}` : ""}`);
      if (!r.ok) throw new Error("Could not load more listings");
      const data: ApiListing[] = await r.json();
      if (!Array.isArray(data)) throw new Error("Invalid listings response");
      setApiListings((current) => [...current, ...data.map(mapApiListing)]);
      setHasMoreListings(data.length === LISTING_BATCH);
    } catch {
      setMoreError("We couldn’t load more listings. Your current results are still available. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const url = new URLSearchParams(rawSearch);
    const r=url.get("region");
    if(r==="uk"||r==="us")setMarketRegion(r);
    setSelectedCategories(url.get("categories")?.split(",").filter(Boolean)??(url.get("category")?[url.get("category")!]:[]));
    setSelectedSubcategories(url.get("subcategories")?.split(",").filter(Boolean)??(url.get("sub")?[url.get("sub")!]:[]));
    setSelectedThirdLevels(url.get("thirdLevels")?.split(",").filter(Boolean)??(url.get("subsub")?[url.get("subsub")!]:[]));
    setSelectedConditions(url.get("conditions")?.split(",").filter(Boolean)??[]);
    setMinPrice(url.get("minPrice")||"");setMaxPrice(url.get("maxPrice")||"");
    setShipFrom(url.get("shipFrom")?.split(",").filter(Boolean)??[]);
    setShipTo(url.get("shipTo")?.split(",").filter(Boolean)??[]);
    setFreeShipping(url.get("freeShipping")==="true");
    setListedWithin(url.get("listedWithin")||"any");
    const sorting=url.get("sort");
    if(sorting&&["newest","price-asc","price-desc","price-lowest","views"].includes(sorting))setSort(sorting as SortKey);
  },[rawSearch]);

  // Keep query in sync with URL
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (urlCategory && !selectedCategories.includes(urlCategory)) {
      setSelectedCategories([urlCategory]);
    }
  }, [urlCategory]);

  // Public browsing must use the live listings API, not stale demo products.
  const allListings = useMemo(() => apiListings, [apiListings]);

  const filtered = useMemo(() => {
    let result = [...allListings];

    if (verifiedOnly) {
      result = result.filter((p) => p.verified);
    }
    if (minRating !== null) {
      result = result.filter((p) => ((p as unknown as Record<string, unknown>).rating as number ?? 0) >= minRating);
    }

    switch (sort) {
      case "price-asc":
      case "price-lowest":
        result.sort((a, b) => a.price - b.price); break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price); break;
      case "views":
        result.sort((a, b) => b.views - a.views); break;
      case "newest":
      default:
        result.sort((a, b) => new Date(b.listed).getTime() - new Date(a.listed).getTime());
    }

    return result;
  }, [allListings, query, selectedCategories, selectedSubcategories, selectedThirdLevels, selectedConditions, minPrice, maxPrice, verifiedOnly, shipFrom, shipTo, freeShipping, minRating, listedWithin, sort]);

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) => {
      const next = prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug];
      // If deselecting a category, also clear its subcategories
      if (prev.includes(slug)) {
        const cat = CATEGORIES.find((c) => c.slug === slug);
        const catSubSlugs = cat?.subcategories.map((s) => s.slug) ?? [];
        setSelectedSubcategories((subs) => subs.filter((s) => !catSubSlugs.includes(s)));
        setSelectedThirdLevels([]);
      }
      return next;
    });
  }
  function toggleSubcategory(slug: string) {
    setSelectedThirdLevels([]);
    setSelectedSubcategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }
  function toggleThirdLevel(slug: string) {
    setSelectedThirdLevels(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev,slug]);
  }
  function toggleCondition(c: string) {
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }
  function clearAll() {
    setQuery("");
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedThirdLevels([]);
    setSelectedConditions([]);
    setMinPrice("");
    setMaxPrice("");
    setVerifiedOnly(false);
    setSort("newest");
    setListingTypes([]);
    setShipFrom([]);
    setShipTo([]);
    setFreeShipping(false);
    setMinRating(null);
    setListedWithin("any");
    setLocation("/browse");
  }

  function toggleArr<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  const activeFilterCount =
    selectedCategories.length +
    selectedSubcategories.length +
    selectedThirdLevels.length +
    selectedConditions.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    shipFrom.length +
    shipTo.length +
    (freeShipping ? 1 : 0) +
    (minRating !== null ? 1 : 0) +
    (listedWithin !== "any" ? 1 : 0);

  const pageTitle = urlQuery ? `Results for "${urlQuery}"` : selectedCategories.length === 1 ? `Browse ${CATEGORIES.find(c => c.slug === selectedCategories[0])?.name ?? selectedCategories[0]}` : "Browse All Listings";

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "newest",    label: "Newest First" },
    { key: "price-asc", label: "Price: Low to High" },
    { key: "price-desc",label: "Price: High to Low" },
    { key: "views",     label: "Most Viewed" },
  ];

  const SHIP_FROM_OPTIONS = [
    { id: "UK",    label: "UK",    flag: "🇬🇧" },
    { id: "US",    label: "US",    flag: "🇺🇸" },
    { id: "EU",    label: "EU",    flag: "🇪🇺" },
    { id: "China", label: "China", flag: "🇨🇳" },
    { id: "Other", label: "Other", flag: "🌍" },
  ];
  const SHIP_TO_OPTIONS = [
    { id: "domestic",  label: "UK Only",      flag: "🇬🇧" },
    { id: "eu",        label: "UK & EU",       flag: "🇪🇺" },
    { id: "worldwide", label: "Worldwide",     flag: "🌍" },
  ];
  const LISTING_TYPE_OPTIONS = [
    { id: "buy-now",    label: "Buy Now",    icon: ShoppingBag },
    { id: "auction",    label: "Auction",    icon: Gavel },
    { id: "flash-sale", label: "Flash Sale", icon: Zap },
  ];

  const filterPanel = (
    <div className="space-y-0">


      <FilterSection title="Category">
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.slug] ?? 0;
            const isChecked = selectedCategories.includes(cat.slug);
            return (
              <div key={cat.slug}>
                <label className="flex items-center justify-between gap-2 cursor-pointer group py-0.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCategory(cat.slug)}
                      className="accent-[#4A5CE8] w-3.5 h-3.5"
                      data-testid={`filter-category-${cat.slug}`}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-[#4A5CE8] transition-colors">{cat.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{!countsLoaded ? "—" : count}</span>
                </label>
                {isChecked && cat.subcategories.length > 0 && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-[#4A5CE8]/15 pl-2.5">
                    {cat.subcategories.map((sub) => {
                      const subCount = subcategoryCounts[`${cat.slug}:${sub.slug}`] ?? 0;
                      return (
                        <div key={sub.slug}>
                        <label key={sub.slug} className="flex items-center justify-between gap-2 cursor-pointer group py-0.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedSubcategories.includes(sub.slug)}
                              onChange={() => toggleSubcategory(sub.slug)}
                              className="accent-[#4A5CE8] w-3 h-3"
                              data-testid={`filter-subcategory-${sub.slug}`}
                            />
                            <span className="text-xs text-gray-600 group-hover:text-[#4A5CE8] transition-colors">{sub.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{subCount}</span>
                        </label>
                        {selectedSubcategories.includes(sub.slug) && suggestedThirdLevel(cat.slug, sub.slug).length > 0 && (
                          <div className="ml-5 space-y-1 border-l border-orange-200 pl-2">
                            {suggestedThirdLevel(cat.slug, sub.slug).map(name => {
                              const slug = thirdLevelSlug(name);
                              return <label key={slug} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                                <input type="checkbox" checked={selectedThirdLevels.includes(slug)} onChange={() => toggleThirdLevel(slug)} />
                                {name}
                              </label>;
                            })}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        <div className="space-y-1.5">
          {Array.from(new Set([...CONDITIONS, ...allListings.map((p) => p.condition)])).map((c) => {
            const count = allListings.filter((p) => p.condition === c).length;
            return (
              <label key={c} className="flex items-center justify-between gap-2 cursor-pointer group py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(c)}
                    onChange={() => toggleCondition(c)}
                    className="accent-[#4A5CE8] w-3.5 h-3.5"
                    data-testid={`filter-condition-${c}`}
                  />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[c]}`}>{c}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{loadingListings || listingError ? "—" : count}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
              data-testid="filter-price-min"
            />
          </div>
          <span className="text-gray-300 text-sm">—</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
              data-testid="filter-price-max"
            />
          </div>
        </div>
      </FilterSection>

      {/* Ships From */}
      <FilterSection title="Ships From" defaultOpen={false}>
        <div className="space-y-1.5">
          {SHIP_FROM_OPTIONS.map((o) => {
            const sel = shipFrom.includes(o.id);
            return (
              <label key={o.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggleArr(shipFrom, setShipFrom, o.id)}
                  className="accent-[#4A5CE8] w-3.5 h-3.5"
                />
                <span className="text-base leading-none">{o.flag}</span>
                <span className="text-sm text-gray-700 group-hover:text-[#4A5CE8] transition-colors">{o.label}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Ships To */}
      <FilterSection title="Ships To" defaultOpen={false}>
        <div className="space-y-1.5">
          {SHIP_TO_OPTIONS.map((o) => {
            const sel = shipTo.includes(o.id);
            return (
              <label key={o.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggleArr(shipTo, setShipTo, o.id)}
                  className="accent-[#4A5CE8] w-3.5 h-3.5"
                />
                <span className="text-base leading-none">{o.flag}</span>
                <span className="text-sm text-gray-700 group-hover:text-[#4A5CE8] transition-colors">{o.label}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Delivery */}
      <FilterSection title="Delivery" defaultOpen={false}>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setFreeShipping(!freeShipping)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${freeShipping ? "bg-[#4A5CE8]" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${freeShipping ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <div>
              <span className="text-sm text-gray-700 font-medium flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-500" /> Free Shipping
              </span>
              <p className="text-xs text-gray-400">No delivery charge</p>
            </div>
          </label>
        </div>
      </FilterSection>

      {/* Seller */}
      <FilterSection title="Seller" defaultOpen={false}>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${verifiedOnly ? "bg-[#4A5CE8]" : "bg-gray-200"}`}
            data-testid="filter-verified-only"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${verifiedOnly ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <div>
            <span className="text-sm text-gray-700 font-medium">Verified Sellers Only</span>
            <p className="text-xs text-gray-400">ID checked and approved</p>
          </div>
        </label>
      </FilterSection>

      {/* Seller Rating */}
      <FilterSection title="Seller Rating" defaultOpen={false}>
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3].map((stars) => {
            const sel = minRating === stars;
            return (
              <button
                key={stars}
                onClick={() => setMinRating(sel ? null : stars)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition-all text-left ${
                  sel ? "border-[#F26B21] bg-orange-50 text-[#F26B21]" : "border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200"
                }`}
              >
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 fill-current ${sel ? "text-[#F26B21]" : "text-amber-400"}`} />
                  ))}
                  {Array.from({ length: 5 - stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-gray-200 fill-current" />
                  ))}
                </span>
                <span className="font-medium">{stars}+ stars</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Listed Within */}
      <FilterSection title="Listed Within" defaultOpen={false}>
        <div className="flex flex-col gap-1.5">
          {[
            { id: "today", label: "Today" },
            { id: "week",  label: "Last 7 days" },
            { id: "month", label: "Last 30 days" },
          ].map(({ id, label }) => {
            const sel = listedWithin === id;
            return (
              <button
                key={id}
                onClick={() => setListedWithin(sel ? "any" : id)}
                className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  sel ? "border-[#4A5CE8] bg-[#4A5CE8]/8 text-[#4A5CE8]" : "border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {activeFilterCount > 0 && (
        <div className="pt-4">
          <button
            onClick={clearAll}
            className="w-full text-sm text-red-500 hover:text-red-600 font-semibold border border-red-200 hover:border-red-300 rounded-xl py-2 transition-colors"
            data-testid="button-clear-filters"
          >
            Clear all filters ({activeFilterCount})
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Search header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings..."
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-gray-50"
                data-testid="input-browse-search"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#4A5CE8] transition-colors"
              data-testid="button-mobile-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-[#4A5CE8] text-white text-xs font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>

          {saveOpen && <form onSubmit={e=>{e.preventDefault();void saveCurrentSearch();}} className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 text-slate-950">
            <label className="min-w-[190px] flex-1 text-sm font-bold">Search name
              <input maxLength={80} required value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder={query||"e.g. Vintage games"} className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 font-semibold text-slate-950"/>
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm font-bold">
              <input type="checkbox" checked={saveAlert} onChange={e=>setSaveAlert(e.target.checked)}/> Alert on new matching listings
            </label>
            <button type="submit" disabled={savingSearch} className="rounded-lg bg-orange-600 px-4 py-2.5 font-black text-white disabled:opacity-50">{savingSearch?"Saving…":"Save"}</button>
          </form>}
          {saveFeedback && <div role="status" className={`mb-3 rounded-lg border p-3 text-sm font-semibold ${saveSuccess?"border-green-300 bg-green-50 text-green-900":"border-red-300 bg-red-50 text-red-900"}`}>
            {saveFeedback}{saveSuccess && <Link href="/dashboard?section=saved-searches" className="ml-2 font-black underline">View saved searches</Link>}
          </div>}
          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedCategories.map((slug) => {
                const cat = CATEGORIES.find((c) => c.slug === slug);
                return (
                  <span key={slug} className="flex items-center gap-1.5 bg-[#4A5CE8]/10 text-[#4A5CE8] text-xs font-semibold px-3 py-1 rounded-full">
                    {cat?.name ?? slug}
                    <button onClick={() => toggleCategory(slug)}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {selectedSubcategories.map((slug) => {
                let label = slug;
                for (const cat of CATEGORIES) {
                  const sub = cat.subcategories.find((s) => s.slug === slug);
                  if (sub) { label = sub.name; break; }
                }
                return (
                  <span key={slug} className="flex items-center gap-1.5 bg-[#4A5CE8]/5 text-[#4A5CE8] text-xs font-medium px-3 py-1 rounded-full border border-[#4A5CE8]/20">
                    ↳ {label}
                    <button onClick={() => toggleSubcategory(slug)}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {selectedConditions.map((c) => (
                <span key={c} className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                  {c}<button onClick={() => toggleCondition(c)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {(minPrice || maxPrice) && (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                  £{minPrice || "0"} – £{maxPrice || "∞"}
                  <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {verifiedOnly && (
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified Only
                  <button onClick={() => setVerifiedOnly(false)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {shipFrom.map((f) => (
                <span key={f} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                  From: {f}
                  <button onClick={() => toggleArr(shipFrom, setShipFrom, f)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {shipTo.map((t) => {
                const label = SHIP_TO_OPTIONS.find((o) => o.id === t)?.label ?? t;
                return (
                  <span key={t} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <Globe className="w-3 h-3" /> {label}
                    <button onClick={() => toggleArr(shipTo, setShipTo, t)}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {freeShipping && (
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                  <Truck className="w-3 h-3" /> Free Shipping
                  <button onClick={() => setFreeShipping(false)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {minRating !== null && (
                <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-current" /> {minRating}+ stars
                  <button onClick={() => setMinRating(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {listedWithin !== "any" && (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                  {{ today: "Today", week: "Last 7 days", month: "Last 30 days" }[listedWithin]}
                  <button onClick={() => setListedWithin("any")}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <AdSlot slotKey="browse_top" />

      <div className="container mx-auto px-4 py-6 flex gap-6 flex-1">

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto overscroll-contain [scrollbar-width:thin] dark:bg-[#132543] dark:border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4A5CE8]" /> Filters
              </h2>
              {activeFilterCount > 0 && (
                <span className="text-xs font-bold bg-[#4A5CE8] text-white px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </div>
            {filterPanel}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-sm text-gray-400">{loadingListings ? "Loading listings…" : listingError ? "Listings unavailable" : `${filtered.length} listing${filtered.length !== 1 ? "s" : ""} found`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={()=>{setSaveOpen(v=>!v);setSaveFeedback("");setSaveSuccess(false);}}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 font-black text-sm text-white hover:bg-orange-700" data-testid="button-save-search">
                <Bell className="h-4 w-4"/> Save search
              </button>
              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] cursor-pointer"
                  data-testid="select-sort"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={`p-2 ${view === "grid" ? "bg-[#4A5CE8] text-white" : "bg-white text-gray-500 hover:bg-gray-50"} transition-colors`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-2 ${view === "list" ? "bg-[#4A5CE8] text-white" : "bg-white text-gray-500 hover:bg-gray-50"} transition-colors`}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {delayedLoading ? (
            <MarketplaceLoader area="browse" label="Finding your next great deal…" />
          ) : listingError ? (
            <div role="alert" className="bg-white rounded-2xl border border-orange-100 py-16 px-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Listings couldn’t load</h3>
              <p className="text-sm text-gray-500 mb-6">{listingError}</p>
              <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No listings found</h3>
              <p className="text-sm text-gray-400 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={clearAll}
                className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={view === "grid"
              ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-3"
            }>
              {filtered.map((product) => (
                <Link key={product.id} href={`/listing/${'publicId' in product && product.publicId ? (product as unknown as Record<string,unknown>).publicId as string : product.id}`}>
                  <ProductCard product={product} view={view} promotions={'promotions' in product ? (product as unknown as Record<string,unknown>).promotions as string[] : []} />
                </Link>
              ))}
            </div>
          )}
          {moreError && <p role="alert" className="mt-6 text-center text-sm text-red-600">{moreError}</p>}
          {!loadingListings && !listingError && hasMoreListings && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreListings}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] disabled:opacity-50 transition-colors"
              >
                {loadingMore ? "Loading…" : moreError ? "Try loading more again" : "Load more listings"}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[90] md:hidden" aria-hidden="true"
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              role="dialog" aria-modal="true" aria-label="Filter marketplace listings" className="fixed left-0 top-0 bottom-0 w-[min(360px,90vw)] bg-white dark:bg-[#101e33] z-[100] flex flex-col shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-slate-900 dark:text-white">{t("filters")} ({activeFilterCount})</h2>
                <button aria-label="Close filters" onClick={() => setShowMobileFilters(false)} className="rounded-lg p-2 text-slate-700 dark:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{filterPanel}</div>
              <div className="shrink-0 bg-white dark:bg-[#101e33] border-t border-slate-200 dark:border-slate-700 px-5 py-3">
                {activeFilterCount > 0 && <button type="button" onClick={clearAll} className="mb-2 w-full py-2 text-sm font-bold text-slate-800 dark:text-white underline">Reset all filters</button>}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full py-3 rounded-xl bg-[#4A5CE8] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Show {filtered.length} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AdSlot slotKey="browse_bottom" />
      <Footer />
    </div>
  );
}
