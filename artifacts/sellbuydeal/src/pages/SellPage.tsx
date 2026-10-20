import { useState } from "react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { featureForHref, isFeatureEnabled } from "@/components/FeatureGate";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Camera,
  ShoppingCart,
  Layers,
  Newspaper,
  Store,
  ArrowRight,
  Globe,
  Headphones,
  ShieldCheck,
  Tag,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Calculator,
  ExternalLink,
  Banknote,
  Percent,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/context/CurrencyContext";

const SELL_OPTIONS = [
  {
    id:"snap-sell",title:"Snap & Sell",
    description:"Take a photo or scan a barcode to start an editable listing with AI-assisted details.",
    icon:Camera,gradient:"from-orange-500 to-fuchsia-600",cta:"Snap an item",ctaColor:"text-orange-600",href:"/sell/snap",badge:"NEW",
  },
  {
    id: "direct-sale",
    title: "Direct Sale",
    description:
      "List your item for immediate sale with Buy It Now or Make an Offer options",
    icon: ShoppingCart,
    gradient: "from-[#5B4FD9] to-[#7C3AED]",
    cta: "Get started",
    ctaColor: "text-[#4A5CE8]",
    href: "/sell/direct",
    badge: null,
  },
  {
    id: "create-bundle",
    title: "Create Bundle",
    description:
      "Group multiple items together for bundle deals and increased sales",
    icon: Layers,
    gradient: "from-[#1a9e6f] to-[#0d7a57]",
    cta: "Create bundle",
    ctaColor: "text-[#1a9e6f]",
    href: "/bundle",
    badge: null,
  },
  {
    id: "classified-ads",
    title: "Classified Ads",
    description:
      "Post classified ads for services, rentals, and local items",
    icon: Newspaper,
    gradient: "from-[#E8622A] to-[#C0392B]",
    cta: "Post an ad",
    ctaColor: "text-[#E8622A]",
    href: "/classifieds",
    badge: null,
  },
  {
    id: "open-store",
    title: "Open a Store",
    description:
      "Create your own branded storefront with a banner, profile pic, and all your listings",
    icon: Store,
    gradient: "from-[#2563EB] to-[#1E3A8A]",
    cta: "Create store",
    ctaColor: "text-[#2563EB]",
    href: "/dashboard",
    badge: "FREE",
  },
];

const WHY_FEATURES = [
  {
    icon: Tag,
    title: "Free to List",
    desc: "No listing fee and no seller commission for private sellers — keep your item price.",
  },
  {
    icon: Globe,
    title: "Wide Reach",
    desc: "List your items and reach buyers across the Bazunk marketplace instantly.",
  },
  {
    icon: Headphones,
    title: "Seller Support",
    desc: "Questions? Contact our support team and we'll get back to you fast.",
  },
  {
    icon: ShieldCheck,
    title: "Dispute Handling",
    desc: "Report issues with buyers and our team will review the case fairly.",
  },
];

const STRIPE_RATE = 0.029;
const STRIPE_FIXED = 0.30;

function useMktRate(rawSettings: Record<string, string>) {
  return (parseFloat(rawSettings["fee_rate_default"] ?? "8") || 8) / 100;
}

function buildFeeRows(mktRatePct: number) {
  const sellerPct = Math.round((1 - mktRatePct / 100 - STRIPE_RATE) * 100);
  return [
    {
      label: "Listing fee",
      value: "Free",
      sub: "Always — no upfront cost",
      color: "text-emerald-300",
      bg: "bg-emerald-50",
      icon: Tag,
      iconColor: "text-emerald-500",
    },
    {
      label: "Private seller commission",
      value: "0%",
      sub: "Private sellers keep 100% of the item price",
      color: "text-[#F26B21]",
      bg: "bg-orange-50",
      icon: Percent,
      iconColor: "text-[#F26B21]",
    },
    {
      label: "Stripe card processing",
      value: "Covered by Bazunk",
      sub: "Not shown as a private-seller commission",
      color: "text-[#4A5CE8]",
      bg: "bg-blue-50",
      icon: CreditCard,
      iconColor: "text-[#4A5CE8]",
    },
    {
      label: "Seller receives",
      value: "100%",
      sub: "Of the item price for private sellers",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: Banknote,
      iconColor: "text-emerald-300",
    },
  ];
}

function FeeCalculator() {
  const { currency } = useCurrency();
  const formatPrice = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.code }).format(amount);
  const rawSettings = useRawSettings();
  const businessRate = useMktRate(rawSettings);
  const businessRatePct = businessRate * 100;
  const buyerPct = (parseFloat(rawSettings["buyer_protection_rate"] ?? rawSettings["buyer_protection_percent"] ?? "6") || 6) / 100;
  const defaultFixed: Record<string, number> = { GBP: 1.00, USD: 1.00, EUR: 1.00, AUD: 1.00, CAD: 1.00, NZD: 1.00, CHF: 1.00 };
  const fixedSetting = rawSettings[`buyer_protection_fixed_${currency.code.toLowerCase()}`] ?? (currency.code === "GBP" ? rawSettings["buyer_protection_fixed"] : undefined);
  const buyerFixed = fixedSetting !== undefined && Number.isFinite(Number(fixedSetting)) ? Math.max(0, Number(fixedSetting)) : defaultFixed[currency.code] ?? 1;
  const [amount, setAmount] = useState("50");
  const [sellerType, setSellerType] = useState<"private"|"business">("private");
  const val = Math.max(0, parseFloat(amount) || 0);
  const buyerProtection = sellerType === "private" ? val * buyerPct + (val > 0 ? buyerFixed : 0) : 0;
  const buyerPays = val + buyerProtection;
  const sellerFee = sellerType === "business" ? val * businessRate : 0;
  const sellerReceives = Math.max(0, val - sellerFee);

  return (
    <div className="bg-[#081c3c] text-white rounded-xl border border-blue-400/25 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-500/30 flex items-center justify-center"><Calculator className="w-4 h-4 text-[#4A5CE8]" /></div>
        <div><p className="font-bold text-white text-sm">Buyer & Seller Fee Calculator</p><p className="text-xs text-white/85">See what the buyer pays and seller receives</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 rounded-xl bg-[#0c2852] p-1">
        <button type="button" onClick={()=>setSellerType("private")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${sellerType==="private"?"bg-[#ff9b28] text-[#06142e] shadow-sm":"text-white hover:bg-blue-700"}`}>Private seller</button>
        <button type="button" onClick={()=>setSellerType("business")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${sellerType==="business"?"bg-white text-[#4A5CE8] shadow-sm":"text-blue-100"}`}>Business seller</button>
      </div>
      <label className="block text-xs font-bold text-blue-100 mb-1.5">Item sale price</label>
      <div className="relative mb-5"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 font-bold text-sm">{currency.symbol}</span><input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-[#102d57] text-white pl-8 pr-4 py-3 border border-blue-400/30 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#4A5CE8] focus:ring-2 focus:ring-[#4A5CE8]/10"/></div>
      {val>0 ? <div className="space-y-2.5">
        <div className="flex justify-between text-sm"><span className="text-blue-100">Item price</span><b>{formatPrice(val)}</b></div>
        {sellerType==="private" ? <>
          <div className="flex justify-between gap-3 text-sm"><span className="text-blue-100">Buyer Protection ({(buyerPct*100).toFixed(1).replace(".0","")}% + {formatPrice(buyerFixed)})</span><b className="text-cyan-300">+{formatPrice(buyerProtection)}</b></div>
          <div className="flex justify-between border-t border-white/20 pt-3 text-sm"><span className="font-black text-white">Buyer pays</span><span className="font-black text-cyan-300 text-base">{formatPrice(buyerPays)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-blue-100">Private seller fee</span><b className="text-emerald-300">{formatPrice(0)} (0%)</b></div>
          <div className="flex justify-between border-t border-white/20 pt-3 text-sm"><span className="font-black">Seller receives</span><span className="font-black text-emerald-300 text-base">{formatPrice(sellerReceives)}</span></div>
          <p className="text-xs text-blue-200">Buyer Protection is paid by the buyer. The private seller keeps 100% of the item price. Delivery is excluded from this example.</p>
        </> : <>
          <div className="flex justify-between gap-3 text-sm"><span className="text-blue-100">Buyer Protection</span><b className="text-emerald-300">Included · {formatPrice(0)} extra</b></div>
          <div className="flex justify-between border-t border-white/20 pt-3 text-sm"><span className="font-black">Buyer pays</span><span className="font-black text-cyan-300 text-base">{formatPrice(buyerPays)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-blue-100">Business selling fee ({businessRatePct.toFixed(1).replace(".0","")}%)</span><b className="text-[#F26B21]">−{formatPrice(sellerFee)}</b></div>
          <div className="flex justify-between border-t border-white/20 pt-3 text-sm"><span className="font-black">Business seller receives</span><span className="font-black text-emerald-300 text-base">{formatPrice(sellerReceives)}</span></div>
          <p className="text-xs text-blue-200">Protection and support are included in the business selling fee, so the buyer pays no additional Buyer Protection charge. Category rates may differ. Delivery is excluded.</p>
        </>}
      </div> : <div className="text-center py-4 text-sm text-blue-200">Enter an item price to calculate the transaction</div>}
    </div>
  );
}

export function SellPage() {
  const { formatPrice, currency } = useCurrency();
  const rawSettings = useRawSettings();
  const mktRate = useMktRate(rawSettings);
  const mktRatePct = Math.round(mktRate * 100);
  const FEE_ROWS = buildFeeRows(mktRatePct);

  const visibleOptions = SELL_OPTIONS.filter(option => ["direct-sale","create-bundle","open-store"].includes(option.id) && (!featureForHref(option.href) || isFeatureEnabled(rawSettings, featureForHref(option.href)!)));
  const art: Record<string,{emoji:string;bg:string;caption:string}> = {
    "direct-sale": {emoji:"👟 📱 ✨",bg:"from-orange-500 via-amber-400 to-pink-500",caption:"Quick & easy · Most popular"},
    "create-bundle": {emoji:"📦 🎁 💝",bg:"from-purple-600 via-fuchsia-500 to-indigo-600",caption:"Save time · Bigger sales"},
    "open-store": {emoji:"🏪 📦 🌟",bg:"from-blue-600 via-cyan-500 to-blue-700",caption:"Build your brand · Grow your business"}
  };
  return (
    <div className="min-h-screen bg-[#03152d] text-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-blue-400/30 bg-gradient-to-r from-[#063bd4] via-[#174aff] to-[#b318db]">
          <div className="absolute -top-20 right-16 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-5 py-9 md:py-14 grid gap-5 md:grid-cols-[1fr_1fr] items-center">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.02] drop-shadow-lg">Start Selling<br/><span className="text-[#ff9b28] drop-shadow-[0_2px_12px_rgba(255,130,0,0.45)]">Today!</span></h1>
              <p className="mt-4 max-w-lg text-lg md:text-xl font-semibold text-white">Turn your items into cash. It's free, simple and takes just minutes!</p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs md:text-sm font-bold">
                {["✓ No seller fees for private sellers","✓ Reach buyers worldwide","✓ Safe & secure marketplace"].map(t=><span key={t} className="rounded-full bg-[#001b64]/55 border border-white/20 px-3 py-2 text-white">{t}</span>)}
              </div>
            </div>
            <div className="relative flex justify-center items-center min-h-48 md:min-h-64">
              <div className="absolute inset-4 rounded-[3rem] bg-gradient-to-br from-yellow-300/35 via-pink-400/25 to-cyan-400/30 blur-2xl" />
              <div className="relative text-center rotate-[-5deg]">
                <div className="text-7xl md:text-8xl drop-shadow-2xl">📦 🎮 👟</div>
                <div className="mt-3 inline-block rotate-6 rounded-2xl border-4 border-yellow-300 bg-fuchsia-600 px-7 py-3 text-2xl md:text-3xl font-black shadow-xl">SELL ANYTHING! ✨</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
          <section>
            <h2 className="text-center text-3xl md:text-4xl font-black">Choose <span className="text-yellow-300">How You Want to Sell</span></h2>
            <p className="text-center text-white/85 mt-1 mb-5">Different ways to sell for every item and every style.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {visibleOptions.map(option => {
                const artwork=art[option.id];
                return <Link key={option.id} href={option.href} className="group relative overflow-hidden rounded-2xl border-2 border-white/25 bg-[#0d2550] hover:border-yellow-300 hover:-translate-y-1 transition-all shadow-xl" data-testid={`card-sell-option-${option.id}`}>
                  <div className={`h-36 sm:h-44 flex items-center justify-center bg-gradient-to-br ${artwork.bg} relative`}>
                    <span className="text-6xl sm:text-7xl drop-shadow-2xl group-hover:scale-110 transition-transform">{artwork.emoji}</span>
                    {option.badge && <span className="absolute right-3 top-3 rounded-lg bg-green-400 px-3 py-1 text-[#002e24] font-black rotate-6">{option.badge}</span>}
                  </div>
                  <div className="p-5 bg-gradient-to-br from-[#102c57] to-[#08172f]">
                    <div className="flex items-center justify-between"><h3 className="text-2xl font-black">{option.title}</h3><span className="rounded-full bg-orange-500 p-2 text-white"><ArrowRight className="w-5 h-5"/></span></div>
                    <p className="text-sm text-white/90 mt-2 min-h-10">{option.description}</p>
                    <div className="mt-3 text-xs font-bold text-yellow-300">✓ {artwork.caption}</div>
                  </div>
                </Link>;
              })}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-3" aria-label="Seller fees and calculator">
            <div className="rounded-2xl border border-blue-400/40 bg-gradient-to-br from-[#062a54] to-[#061a34] p-5">
              <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-black">⚡ Transparent Pricing</span>
              <h2 className="text-2xl md:text-3xl font-black mt-3">Seller Fees — No Hidden Costs</h2>
              <p className="mt-2 text-sm text-white/85">Private sellers list and sell free. Business sellers pay their configured fee when an item sells. No invoices, no surprises.</p>
              <div className="mt-4 rounded-xl border border-blue-400/25 overflow-hidden">
                {FEE_ROWS.map(row=>{const Icon=row.icon;return <div key={row.label} className="flex gap-3 items-center justify-between border-b border-white/10 bg-[#041c3b]/80 p-3 last:border-b-0"><span className="flex items-center gap-3"><span className="rounded-lg bg-blue-600 p-2"><Icon className="w-5 h-5 text-white"/></span><span><strong className="block text-sm text-white">{row.label}</strong><small className="text-white/75">{row.sub}</small></span></span><strong className="text-emerald-300 text-sm text-right">{row.value}</strong></div>})}
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs font-bold text-white/90"><span>✓ No invoices</span><span>✓ No monthly fees</span><span>✓ No hidden charges</span></div>
              <p className="mt-3 text-xs text-white/70">Business fees vary by category. Exact fees appear before checkout.</p>
            </div>
            <div className="rounded-2xl border border-blue-400/40 bg-gradient-to-br from-[#062a54] to-[#061a34] p-4 sm:p-5">
              <h2 className="text-xl font-black mb-3">🧮 Fee Calculator</h2>
              <div className="sell-bright-calculator"><FeeCalculator /></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 p-4">
                <div><strong className="block">💳 Get paid automatically</strong><span className="text-xs text-white/90">Connect your bank account securely via Stripe.</span></div>
                <Link href="/dashboard?section=seller-payouts" className="rounded-lg bg-white px-4 py-2.5 font-black text-blue-800 hover:bg-yellow-200" data-testid="button-connect-bank">Connect Bank Account →</Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-400/40 bg-gradient-to-r from-[#04264e] to-[#061b3c] p-5">
            <h2 className="text-center text-2xl md:text-3xl font-black">Why Sellers <span className="text-yellow-300">Choose Bazunk</span></h2>
            <p className="text-center text-white/85 text-sm mb-5">Everything you need to succeed as a seller.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{WHY_FEATURES.map((f,i)=>{const Icon=f.icon;return <div key={f.title} className="flex items-start gap-3"><span className={`shrink-0 rounded-xl p-3 ${["bg-fuchsia-600","bg-blue-600","bg-orange-500","bg-emerald-500"][i]}`}><Icon className="w-6 h-6 text-white"/></span><div><h3 className="font-black text-sm">{f.title}</h3><p className="text-xs text-white/85 mt-1">{f.desc}</p></div></div>})}</div>
          </section>
          <section className="relative overflow-hidden rounded-2xl border-2 border-purple-400 bg-gradient-to-r from-[#1256f2] via-[#4e20e8] to-[#f02dc1] p-5 md:p-7 flex flex-col md:flex-row justify-between gap-5 items-center">
            <span className="absolute right-4 top-1 text-5xl opacity-60">🚀 📦 ✨</span>
            <div className="relative"><h2 className="text-2xl md:text-3xl font-black">Ready to <span className="text-yellow-300">Start Selling?</span></h2><p className="text-sm text-white mt-1">It's free to list. Private sellers keep 100% of the item price.</p></div>
            <div className="relative flex flex-wrap gap-2"><Link href="/sell/direct" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600" data-testid="button-create-seller-account">🛒 List Your First Item →</Link><Link href="/dashboard?section=seller-payouts" className="rounded-full bg-[#071c46] px-5 py-3 text-sm font-black text-white hover:bg-blue-900" data-testid="button-seller-dashboard">Connect Bank Account</Link></div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
