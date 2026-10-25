import { motion } from "framer-motion";
import { Zap, Handshake, ArrowRight, Shield, Tag, Radio, BadgePoundSterling } from "lucide-react";
import { Link } from "wouter";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled } from "@/components/FeatureGate";

const FEATURE_BLOCKS = [
  {
    feature: "flash_sales",
    icon: Zap,
    iconBg: "bg-[#F26B21]",
    tag: "New Feature",
    title: "Flash Sales",
    description: "Sellers set time-limited discounts — you see the countdown, grab the deal before it's gone. Updated constantly.",
    cta: "Browse Flash Sales",
    href: "/flash-sales",
    bg: "bg-white dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-700",
    tagColor: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-slate-800",
    ctaColor: "text-orange-700 dark:text-orange-300 hover:underline",
    glow: "",
  },
  {
    feature: "quick_sell",
    icon: BadgePoundSterling,
    iconBg: "bg-[#F26B21]",
    tag: "Private Sellers",
    title: "Sell for FREE",
    description: "List for free. No final value fees. Keep 100% of your sale price — no commission taken from private sellers.",
    cta: "Start Selling",
    href: "/sell",
    bg: "bg-white dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-700",
    tagColor: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-slate-800",
    ctaColor: "text-orange-700 dark:text-orange-300 hover:underline",
    glow: "",
  },
  {
    feature: "offers",
    icon: Handshake,
    iconBg: "bg-[#F26B21]",
    tag: "Unique to Bazunk",
    title: "Make an Offer",
    description: "See something you like? Name your price. Sellers can accept, counter, or decline — it's all negotiable.",
    cta: "Browse Listings",
    href: "/browse",
    bg: "bg-white dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-700",
    tagColor: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-slate-800",
    ctaColor: "text-orange-700 dark:text-orange-300 hover:underline",
    glow: "",
  },
];

const TRUST_ITEMS = [
  { feature: "buyer_protection", icon: Shield,  label: "Buyer Protection",      sub: "30-day dispute window"       },
  { feature: "quick_sell", icon: Tag,     label: "Free to List & Sell",    sub: "0% seller fees for private sellers" },
  { feature: "live", icon: Radio,   label: "Live Selling",           sub: "Stream and sell in real time"},
];

export function FeaturedFeatures() {
  const flags = useRawSettings();
  const blocks = FEATURE_BLOCKS.filter(x => isFeatureEnabled(flags, x.feature));
  const trustItems = TRUST_ITEMS.filter(x => isFeatureEnabled(flags, x.feature));
  return (
    <section className="bg-slate-50 dark:bg-slate-950 py-14 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4">

        {/* 3 feature blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {blocks.map(({ icon: Icon, iconBg, tag, title, description, cta, href, bg, border, tagColor, ctaColor, glow }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className={`bz-store-card ${bg} ${border} border rounded-3xl p-6 flex flex-col justify-between min-h-[260px] shadow-sm ${glow} relative overflow-hidden`}
            >
              {/* Subtle glow circle */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-orange-500/5 pointer-events-none" />

              <div className="relative z-10">
                <span className={`bz-store-tag inline-flex text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 ${tagColor}`}>
                  {tag}
                </span>
                <div className={`bz-store-feature-icon w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="bz-store-title text-xl font-semibold mb-2">{title}</h3>
                <p className="bz-store-description text-base leading-relaxed">{description}</p>
              </div>

              <div className="relative z-10 mt-5">
                <Link href={href}>
                  <button className={`bz-store-action flex items-center gap-1.5 text-base font-semibold px-0 py-2.5 rounded-xl transition-all ${ctaColor}`}>
                    {cta} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trustItems.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bz-store-card rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="bz-store-title font-semibold text-base">{label}</p>
                <p className="bz-store-description text-sm">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
