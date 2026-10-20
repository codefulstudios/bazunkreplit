import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Store, Zap, Gavel, Handshake, Newspaper, Tag, Layers,
  ArrowRight, X,
  Smartphone, Shirt, Armchair, Dumbbell, BookOpen, CarFront, Gamepad2, Gem, Package2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { useTheme } from "next-themes";
import { readSection,sectionStyle } from "@/design-system/sectionAppearance";
import {readIconAppearance,iconStyle} from "@/design-system/iconAppearance";
import { featureForHref, isFeatureEnabled } from "@/components/FeatureGate";

const PILLS = [
  { icon: Tag,       label: "buyNow"    },
  { icon: Handshake, label: "makeOffer" },
  { icon: Gavel,     label: "auctions"      },
  { icon: Zap,       label: "flashSales"   },
  { icon: Newspaper, label: "classifieds"   },
];

const SELL_OPTIONS = [
  { icon: Zap, label: "Quick Sale", desc: "List the basics now, edit later", href: "/sell/quick", color: "bg-yellow-500/10 text-yellow-500", hover: "hover:border-yellow-400/30 hover:bg-yellow-50" },
  {
    icon: ShoppingCart,
    label: "Direct Sale",
    desc: "List an item for sale right now",
    href: "/sell/direct",
    color: "bg-[#4A5CE8]/10 text-[#4A5CE8]",
    hover: "hover:border-[#4A5CE8]/30 hover:bg-[#4A5CE8]/5",
  },
  {
    icon: Gavel,
    label: "Auction",
    desc: "Start a bidding war for maximum value",
    href: "/auctions/create",
    color: "bg-[#F26B21]/10 text-[#F26B21]",
    hover: "hover:border-[#F26B21]/30 hover:bg-[#F26B21]/5",
  },
  {
    icon: Zap,
    label: "Flash Sale",
    desc: "Time-limited deal that drives urgency",
    href: "/flash-sales/create",
    color: "bg-yellow-500/10 text-yellow-500",
    hover: "hover:border-yellow-400/30 hover:bg-yellow-50",
  },
  {
    icon: Newspaper,
    label: "Classifieds",
    desc: "Post a local ad — no listing fee",
    href: "/classifieds",
    color: "bg-emerald-500/10 text-emerald-600",
    hover: "hover:border-emerald-400/30 hover:bg-emerald-50",
  },
  {
    icon: Layers,
    label: "Bundle",
    desc: "Group items together for a deal",
    href: "/bundle",
    color: "bg-purple-500/10 text-purple-600",
    hover: "hover:border-purple-400/30 hover:bg-purple-50",
  },
];

const APPROVED_CATEGORY_ICONS = { smartphone:Smartphone,shirt:Shirt,gaming:Gamepad2,home:Armchair,sports:Dumbbell,books:BookOpen,collectibles:Gem,automotive:CarFront,package:Package2 } as const;
const HERO_CATS = [
  { name: "Electronics",   icon: Smartphone, color: "#3B82F6", emoji:"💻", href: "/browse?category=electronics" },
  { name: "Fashion",       icon: Shirt,      color: "#EC4899", emoji:"🧥", href: "/browse?category=fashion"     },
  { name: "Gaming",        icon: Gamepad2,   color: "#8B5CF6", emoji:"🎮", href: "/browse?category=gaming"      },
  { name: "Home & Garden", icon: Armchair,   color: "#0D9488", emoji:"🪴", href: "/browse?category=home"        },
  { name: "Sports",        icon: Dumbbell,   color: "#10B981", emoji:"👟", href: "/browse?category=sports"      },
  { name: "Books",         icon: BookOpen,   color: "#F59E0B", emoji:"📚", href: "/browse?category=books"       },
  { name: "Collectibles",  icon: Gem,        color: "#F26B21", emoji:"🧸", href: "/browse?category=collectibles"},
  { name: "Automotive",    icon: CarFront,   color: "#64748B", emoji:"🚙", href: "/browse?category=automotive"  },
  { name: "All Categories",icon: Package2,   color: "#4A5CE8", emoji:"🛍️", href: "/categories"                  },
];

export function Hero() {
  const { currency, country } = useCurrency();
  const [marketRegion] = useMarketplaceRegion();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [sellOpen, setSellOpen] = useState(false);
  const featureSettings = useRawSettings();
  const {resolvedTheme}=useTheme();
  const designMode=resolvedTheme==="dark"?"dark":"light";
  const heroAppearance=readSection(featureSettings,"home_hero",designMode);
  const categoryAppearance=readSection(featureSettings,"home_categories",designMode);
  const categoryIconAppearance=readIconAppearance(featureSettings,"categories",designMode);
  const heroGraphic = featureSettings.design_hero_image_url || "";
  const safeHeroGraphic = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s]*)?$/i.test(heroGraphic) ? heroGraphic : "";
  const visibleSellOptions = SELL_OPTIONS.filter((option) => { const feature = featureForHref(option.href); return !feature || isFeatureEnabled(featureSettings, feature); });
  const visiblePills = PILLS.filter((pill) => { const feature = pill.label === "auctions" ? "auctions" : pill.label === "flashSales" ? "flash_sales" : pill.label === "classifieds" ? "classifieds" : pill.label === "makeOffer" ? "offers" : undefined; return !feature || isFeatureEnabled(featureSettings, feature); });

  function handleSellClick() {
    if (!user) {
      setLocation("/sell");
    } else {
      setSellOpen(true);
    }
  }

  return (
    <section data-design-home-hero={heroAppearance?"true":"false"} style={sectionStyle(heroAppearance)} className="bz-design-home-hero relative w-full overflow-hidden bg-[#1A1D2E]">
      {/* Diagonal accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -right-48 top-0 h-full w-[700px] bg-[#4A5CE8]/10"
          style={{ transform: "skewX(-14deg)" }} />
        <div className="absolute right-32 -top-20 w-72 h-72 rounded-full bg-[#F26B21]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-7 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] gap-6 lg:gap-8 items-start">

          {/* ── Left panel ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-300 bz-hero-kicker">Discover something great · {marketRegion === "uk" ? "UK" : "USA"} marketplace</p>
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">Great finds. Better deals. <span className="text-orange-400">All in one place.</span></h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-200 bz-hero-summary">Explore unique finds, everyday essentials and new arrivals from independent sellers. Browse at your own pace, or make an offer.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/browse" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F26B21] px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-950/20 transition-colors hover:bg-[#d95712]">
                <ShoppingCart className="h-5 w-5" /> Shop all listings <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/categories" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20">
                Explore categories
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm !text-white">
              <Link href="/buyer-protection" className="!text-white hover:!text-orange-200">✓ Buyer Protection on eligible orders</Link>
              <Link href="/sell" className="!text-white hover:!text-orange-200">✓ Sell your items on Bazunk</Link>
            </div>
            <Link href="/welcome-new-buyers" className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-orange-200/25 bg-white/10 px-4 py-3 text-sm text-white transition-colors hover:bg-white/15">
              <span><span className="font-bold text-orange-300">New to Bazunk?</span> Discover the {currency.symbol}5 introductory credit offer and its conditions.</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </motion.div>

          {/* ── Right panel — top categories ──────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-4 self-start"
          >
            {safeHeroGraphic && <img src={safeHeroGraphic} alt={featureSettings.design_hero_image_alt || "Bazunk marketplace graphic"} loading="lazy" className="max-h-52 w-full rounded-xl object-contain" />}
            <div data-design-home-categories={categoryAppearance?"true":"false"} data-design-icons={categoryIconAppearance?"true":"false"} style={{...sectionStyle(categoryAppearance),...iconStyle(categoryIconAppearance)}} className="bz-design-home-categories grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {HERO_CATS.map(({ name, icon: DefaultIcon, href }, i) => { const key = href.split("category=")[1]; const selected = featureSettings["design_category_icon_" + key] as keyof typeof APPROVED_CATEGORY_ICONS | undefined; const Icon = (selected && APPROVED_CATEGORY_ICONS[selected]) || DefaultIcon; return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <Link href={href}>
                  <div className="bz-design-category-tile bg-[#27364d] border border-slate-500/70 rounded-xl px-3 py-3.5 min-h-[105px] flex flex-col items-center justify-center gap-2 hover:bg-[#35475e] hover:border-orange-300 transition-all duration-200 cursor-pointer group">
                    <div
                      className="bz-design-category-icon w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700 border border-slate-500"
                    >
                      <Icon className="w-6 h-6 text-orange-200" aria-hidden="true" />
                    </div>
                    <p className="text-white text-sm font-medium text-center leading-tight group-hover:text-white transition-colors">
                      {name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ); })}
            </div>

            {/* Marketplace type pills — aligned under categories */}
            <div className="hidden sm:flex flex-wrap gap-2 pt-1">
              {visiblePills.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-sm font-semibold border px-3 py-2 rounded-full hover:brightness-125 transition-all" style={{backgroundColor:"#334155",borderColor:"#64748B",color:"#FFFFFF"}}>
                  <Icon className="w-4 h-4" style={{color:"#FFFFFF"}} /> {t(label, label)}
                </span>
              ))}
            </div>
          </motion.div>
        </div>


      </div>

      {/* ── Sell flyout portal (escapes overflow-hidden) ── */}
      {createPortal(
        <AnimatePresence>
          {sellOpen && (
            <motion.div
              key="sell-flyout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={() => setSellOpen(false)}
            >
              <motion.div
                key="sell-flyout-panel"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">How do you want to sell?</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Pick a listing type — all are free to post</p>
                  </div>
                  <button
                    onClick={() => setSellOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Options */}
                <div className="p-4 space-y-2">
                  {visibleSellOptions.map(({ icon: Icon, label, desc, href, color, hover }) => (
                    <Link key={href} href={href} onClick={() => setSellOpen(false)}>
                      <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-gray-100 ${hover} transition-all cursor-pointer group`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 pt-1 text-center">
                  <p className="text-sm text-gray-600">
                    No fees to list · Bazunk only earns when you sell
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
