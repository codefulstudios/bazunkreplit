import { useMarketplaceLoadingDelay } from "@/components/useMarketplaceLoadingDelay";
import { useEffect, useState, useRef } from "react";
import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import { Store, Heart, Eye, CheckCircle2, Flame, ArrowRight, Zap, Star, Crown, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useCurrency } from "@/context/CurrencyContext";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import {useTheme} from "next-themes";
import {useRawSettings} from "@/context/SiteSettingsContext";
import {readSection,sectionStyle} from "@/design-system/sectionAppearance";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

interface Listing {
  id: number;
  publicId: string;
  title: string;
  price: string;
  condition: string;
  image?: string | null;
  views: number;
  category: string;
  promotions: string[];
  sellerName: string;
  sellerUsername?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  "New":      "bg-emerald-50 text-emerald-700",
  "Like New": "bg-blue-50 text-blue-700",
  "Good":     "bg-amber-50 text-amber-700",
  "Fair":     "bg-orange-50 text-orange-700",
  "Poor":     "bg-red-50 text-red-700",
};

function PromoBadge({ promotions }: { promotions: string[] }) {
  if (promotions.includes("homepage-spotlight") || promotions.includes("spotlight")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#F26B21] text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10">
        <Zap className="w-2.5 h-2.5 fill-white" /> SPOTLIGHT
      </div>
    );
  }
  if (promotions.includes("premium-placement")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-pink-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10">
        <Crown className="w-2.5 h-2.5" /> PREMIUM
      </div>
    );
  }
  if (promotions.includes("featured-badge") || promotions.includes("featured")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-300 text-slate-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10">
        <Star className="w-2.5 h-2.5 fill-white" /> FEATURED
      </div>
    );
  }
  return (
    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#F26B21] text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10">
      <Flame className="w-2.5 h-2.5 fill-white" /> HOT
    </div>
  );
}

export function FeaturedListings({ mode = "recent" }: { mode?: "recent" | "promoted" }) {
  const [marketRegion] = useMarketplaceRegion();
  const rawDesign=useRawSettings();
  const {resolvedTheme}=useTheme();
  const spotlightStyle=readSection(rawDesign,"home_spotlight",resolvedTheme==="dark"?"dark":"light");
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [spotlightListings, setSpotlightListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const delayedLoading = useMarketplaceLoadingDelay(loading, "homepage");
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setSpotlightListings([]);
    setRecentListings([]);
    const endpoint = mode === "promoted"
      ? `${API_BASE}/api/listings/spotlight?region=${marketRegion}`
      : `${API_BASE}/api/listings?limit=16&region=${marketRegion}`;
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch(endpoint, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`Homepage listings HTTP ${response.status}`);
        const listings = await response.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(listings)) throw new Error("Invalid homepage listings");
        if (mode === "promoted") setSpotlightListings(listings);
        else setRecentListings(listings);
      })
      .catch(error => {
        if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") {
          setLoadError(true);
          console.warn("Homepage listings unavailable:", error);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setLoading(false);
      });
    return () => { clearTimeout(timeout); controller.abort("unmounted"); };
  }, [marketRegion, mode]);

  const hasSpotlight = spotlightListings.length > 0;
  const displayListings = mode === "promoted" ? spotlightListings : recentListings;

  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(el);
    Array.from(el.children).forEach(child => observer.observe(child));
    const frame = requestAnimationFrame(updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [displayListings]);

  function scrollBy(delta: number) {
    const el=scrollRef.current;
    if (!el) return;
    const amount=Math.min(700,Math.max(220,el.clientWidth*0.8));
    el.scrollTo({left:Math.max(0,Math.min(el.scrollWidth-el.clientWidth,el.scrollLeft+Math.sign(delta)*amount)),behavior:"smooth"});
    window.setTimeout(updateScrollButtons,400);
  }

  if (delayedLoading) {
    return (
      <section aria-busy="true" aria-label="Loading marketplace listings" className="py-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4">
          <MarketplaceLoader area="homepage" label={mode === "promoted" ? "Loading spotlight listings…" : "Loading recent listings…"} />
        </div>
      </section>
    );
  }

  if (displayListings.length === 0) return <section className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-10"><div className="max-w-6xl mx-auto px-4"><div data-design-spotlight={spotlightStyle?"true":"false"} style={sectionStyle(spotlightStyle)} className="bz-design-spotlight rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center"><Package className="mx-auto h-9 w-9 text-orange-600 dark:text-orange-300" /><h2 className="bz-design-spotlight-heading mt-3 text-xl font-semibold text-slate-900 dark:text-white">{mode === "promoted" ? "Spotlight listings" : "Recently listed"}</h2><p className="bz-design-spotlight-copy mt-2 text-base text-slate-700 dark:text-slate-200">{loadError ? "Listings could not be loaded right now. Please try again shortly." : mode === "promoted" ? "No spotlight listings are available at the moment." : "No listings are available in this region yet."}</p><Link href="/browse" className="bz-design-spotlight-link mt-4 inline-flex text-sm font-semibold text-orange-700 dark:text-orange-300">Browse the marketplace <ArrowRight className="ml-1 h-4 w-4" /></Link></div></div></section>;

  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">
            {mode === "promoted" ? "Featured & promoted listings" : "Latest arrivals"}
          </h2>

          <div className="flex items-center gap-2">
            {/* Scroll arrows */}
            <button
              onClick={() => scrollBy(-700)}
              aria-label="Scroll spotlight listings left"
              aria-disabled={!canScrollLeft}
              className="hidden sm:flex w-10 h-10 rounded-full border-2 border-slate-400 dark:border-slate-500 items-center justify-center !bg-slate-800 !text-white hover:!bg-blue-700 hover:!border-blue-300 cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(700)}
              aria-label="Scroll spotlight listings right"
              aria-disabled={!canScrollRight}
              className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <Link href="/browse">
              <button className="flex items-center gap-1.5 text-sm font-bold text-orange-700 dark:text-orange-300 hover:text-orange-600 transition-colors ml-1">
                {t("browseAll")} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Horizontal scroll row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {displayListings.map((listing, index) => (
            <Link key={listing.id} href={`/listing/${listing.publicId}`}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                className="bz-store-card bz-product-card w-52 shrink-0 group rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer" style={{ scrollSnapAlign: "start" }}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {listing.image ? (
                    <img
                      src={listing.image}
                      loading="lazy" decoding="async"
                      alt={listing.title}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="w-12 h-12 text-gray-200" />
                    </div>
                  )}

                  <PromoBadge promotions={listing.promotions} />



                  <div className="absolute bottom-2.5 left-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONDITION_COLORS[listing.condition] ?? CONDITION_COLORS["Good"]}`}>
                      {listing.condition}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3.5 pt-3">
                  <p className="bz-store-title text-base font-semibold line-clamp-2 min-h-[2.5rem] mb-2 leading-snug">
                    {listing.title}
                  </p>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg font-bold text-[#F26B21]">
                      {formatPrice(parseFloat(listing.price))}
                    </span>
                    {listing.views > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                        <Eye className="w-3 h-3" /> {listing.views.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="bz-store-description flex items-center gap-1 text-xs font-semibold" style={{ color: "#475569" }}>
                    <Store className="w-3.5 h-3.5" /> {listing.sellerUsername ? `@${listing.sellerUsername}` : (listing.sellerName || "Bazunk seller")}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}

          {/* Browse All end card */}
          <Link href="/browse">
            <div className="w-52 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#4A5CE8] hover:bg-[#4A5CE8]/5 transition-all group" style={{ minHeight: "280px" }}>
              <div className="w-12 h-12 rounded-full bg-[#4A5CE8]/10 flex items-center justify-center group-hover:bg-[#4A5CE8]/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-[#4A5CE8]" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#4A5CE8] transition-colors text-center px-4">
                {t("browseAllListings")}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
