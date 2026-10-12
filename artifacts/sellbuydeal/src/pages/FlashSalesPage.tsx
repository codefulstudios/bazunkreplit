import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Zap, Clock, Plus, AlertCircle, Loader2, Tag, ChevronRight, Timer,
  CalendarClock, TrendingDown, Flame, Bell, BellOff, Coffee, Calendar, Star,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { useAuth } from "@/context/AuthContext";

type FlashSale = {
  id: string; seller_name: string; seller_email: string;
  title: string; description: string | null; image: string | null; category: string | null;
  original_price: string; sale_price: string; discount_percent: number;
  starts_at: string; ends_at: string; status: string; created_at: string;
  sale_type: string;
};

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

function CountdownPill({ target, label, urgent }: { target: string; label: string; urgent?: boolean }) {
  const [t, setT] = useState(() => getTimeLeft(target));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!t) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#253d60] text-white">Ended</span>;
  const isUrgent = urgent && t.total < 3600000;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
      isUrgent ? "bg-[#ff315f] text-white animate-pulse" :
      urgent ? "bg-[#ff681d] text-white" : "bg-[#3051b0] text-white"
    }`}>
      <Timer className="w-3 h-3" />
      {label} {String(t.hours).padStart(2,"0")}:{String(t.mins).padStart(2,"0")}:{String(t.secs).padStart(2,"0")}
    </span>
  );
}

const SALE_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  standard:       { label: "Flash Sale",     icon: Zap,          color: "text-orange-600",  bg: "bg-orange-100",  description: "" },
  lightning:      { label: "Lightning Deal", icon: Zap,          color: "text-red-600",     bg: "bg-red-100",     description: "5–15 minutes only" },
  happy_hour:     { label: "Happy Hour",     icon: Coffee,       color: "text-amber-600",   bg: "bg-amber-100",   description: "Limited-hour promo" },
  weekend_mega:   { label: "Weekend Mega",   icon: Calendar,     color: "text-purple-600",  bg: "bg-purple-100",  description: "Weekend-only deal" },
  category_event: { label: "Category Event", icon: Star,         color: "text-blue-600",    bg: "bg-blue-100",    description: "Category flash event" },
};

function SaleTypeBadge({ type }: { type: string }) {
  const meta = SALE_TYPE_META[type] ?? SALE_TYPE_META.standard;
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${meta.bg} ${meta.color}`}>
      <Icon className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
}

function NotifyButton({ sale }: { sale: FlashSale }) {
  const [state, setState] = useState<"idle" | "set" | "denied">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleNotify() {
    if (!("Notification" in window)) { setState("denied"); return; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }

    const msUntilStart = new Date(sale.starts_at).getTime() - Date.now();
    const msUntilEnd = new Date(sale.ends_at).getTime() - Date.now();
    const isActive = sale.status === "active";

    if (isActive && msUntilEnd < 300000) {
      new Notification("⚡ Ending Soon!", { body: `${sale.title} — only ${Math.ceil(msUntilEnd / 60000)} min left!`, icon: "/logo.png" });
    } else if (!isActive && msUntilStart > 0) {
      const notifyAt = Math.max(0, msUntilStart - 60000);
      timerRef.current = setTimeout(() => {
        new Notification("🔥 Flash Sale Starting!", { body: `${sale.title} is going live now!`, icon: "/logo.png" });
      }, notifyAt);
      if (msUntilEnd > 0) {
        setTimeout(() => {
          new Notification("⚡ Last 5 Minutes!", { body: `${sale.title} ends soon — grab it!`, icon: "/logo.png" });
        }, Math.max(0, msUntilEnd - 300000));
      }
    }
    setState("set");
  }

  if (state === "set") return (
    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#075d55] text-white cursor-default">
      <Bell className="w-3 h-3" /> Notified
    </button>
  );
  if (state === "denied") return (
    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#253d60] text-white cursor-default">
      <BellOff className="w-3 h-3" /> Blocked
    </button>
  );
  return (
    <button onClick={handleNotify} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#164db4] text-white hover:bg-[#246de2] transition-colors">
      <Bell className="w-3 h-3" /> Notify Me
    </button>
  );
}

type TabValue = "active" | "upcoming";
const TABS: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "active",   label: "On Now",       icon: Flame },
  { value: "upcoming", label: "Starting Soon", icon: CalendarClock },
];

type SaleTypeFilter = "all" | "lightning" | "happy_hour" | "weekend_mega" | "category_event" | "standard";
const TYPE_FILTERS: { value: SaleTypeFilter; label: string; icon: React.ElementType }[] = [
  { value: "all",           label: "All",           icon: Zap },
  { value: "lightning",     label: "Lightning",     icon: Zap },
  { value: "happy_hour",    label: "Happy Hour",    icon: Coffee },
  { value: "weekend_mega",  label: "Weekend Mega",  icon: Calendar },
  { value: "category_event",label: "Category Event",icon: Star },
];

const CATEGORIES = ["All", "Electronics", "Fashion", "Gaming", "Books", "Collectibles", "Home", "Sports", "Other"];

function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}
function isHappyHour() {
  const h = new Date().getHours();
  return h >= 17 && h < 19;
}

export function FlashSalesPage() {
  const [marketRegion] = useMarketplaceRegion();
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>("active");
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleTypeFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: tab });
      if (category !== "All") params.set("category", category);
      if (saleTypeFilter !== "all") params.set("sale_type", saleTypeFilter);
      params.set("region", marketRegion);
      const res = await fetch(`/api/flash-sales?${params}`);
      if (!res.ok) throw new Error();
      setSales(await res.json());
    } catch {
      setError("Could not load flash sales.");
    } finally {
      setLoading(false);
    }
  }, [tab, category, saleTypeFilter, marketRegion]);

  useEffect(() => { load(); }, [load]);

  const lightningDeals = sales.filter(s => s.sale_type === "lightning");
  const otherSales = sales.filter(s => s.sale_type !== "lightning");

  return (
    <div className="min-h-screen flex flex-col bg-[#03152e] text-white">
      <Navbar />
      <header className="relative overflow-hidden border-b border-[#2d65ff] bg-gradient-to-r from-[#00349c] via-[#0755e8] to-[#7a20c9]">
        <div className="pointer-events-none absolute -top-24 right-[-8%] h-[380px] w-[600px] rounded-full bg-[#fb29c8]/40 blur-3xl"/>
        <div className="pointer-events-none absolute bottom-[-150px] left-[30%] h-[320px] w-[420px] rounded-full bg-[#00b9ff]/50 blur-3xl"/>
        <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-5 py-8 sm:px-8 md:grid-cols-[1fr_.85fr] md:py-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#ff315f] px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[0_5px_20px_rgba(255,35,102,.45)]"><Zap className="h-5 w-5 fill-white"/> Flash Sales</span>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">Deals that don't <span className="block text-[#ffe329]">last forever!</span></h1>
            <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-white sm:text-lg">Massive discounts for a limited time only. Grab them before the countdown hits zero.</p>
            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-purple-200/40 bg-[#5c32e9] px-4 py-2.5 text-sm font-bold text-white shadow-lg"><Calendar className="h-4 w-4 shrink-0"/>{isWeekend() ? "Weekend Mega Sales are on — explore this weekend's deals!" : "Limited-time offers — check back for upcoming deals!"}</div>
            {user && <Link href="/flash-sales/create" className="mt-5 flex w-fit items-center gap-2 rounded-xl bg-[#ff711f] px-5 py-3 font-black !text-white shadow-lg hover:bg-[#ff8b42]"><Plus className="h-5 w-5"/> Run a Flash Sale</Link>}
          </div>
          <div aria-hidden="true" className="relative flex min-h-[230px] items-center justify-center sm:min-h-[280px]">
            <div className="absolute left-[8%] top-[12%] rotate-[-18deg] text-7xl drop-shadow-2xl">🎮</div>
            <div className="absolute right-[5%] top-[8%] rotate-[18deg] text-6xl drop-shadow-2xl">⚡</div>
            <div className="absolute left-[8%] bottom-[5%] rotate-[-12deg] text-7xl drop-shadow-2xl">📦</div>
            <div className="absolute right-[3%] bottom-[2%] rotate-[9deg] text-8xl drop-shadow-2xl">🛒</div>
            <div className="relative flex h-52 w-52 rotate-[-8deg] flex-col items-center justify-center rounded-[2.5rem] border-[9px] border-[#ff80ac] bg-gradient-to-br from-[#ffdf43] to-[#ff792e] text-[#102047] shadow-[0_22px_50px_rgba(0,0,0,.4)] sm:h-60 sm:w-60">
              <Clock className="h-12 w-12 stroke-[3]"/>
              <strong className="mt-2 text-center text-3xl font-black leading-none">LIMITED<br/>TIME<br/>ONLY</strong>
            </div>
            <span className="absolute right-[8%] top-[28%] rotate-12 rounded-xl bg-[#ff2c9b] px-3 py-2 text-3xl font-black shadow-xl">%</span>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-5 pt-4 sm:px-8"><AdSlot slotKey="flash_sales_mid" /></div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-5 sm:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">{TYPE_FILTERS.map(({value,label,icon:Icon})=><button key={value} onClick={()=>setSaleTypeFilter(value)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-extrabold transition-all ${saleTypeFilter===value?"border-[#248bff] bg-[#066af3] text-white shadow-lg shadow-blue-950/50":"border-[#2463a3] bg-[#092b55] text-white hover:bg-[#174a85]"}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-[#2562aa] bg-[#08254c] px-4 py-3 text-sm font-bold text-white"><Timer className="h-5 w-5 text-[#ff5473]"/> Live deals update automatically when refreshed</span>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl border border-[#2869b4] bg-[#08264b] p-1">{TABS.map(({value,label,icon:Icon})=><button key={value} onClick={()=>setTab(value)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold ${tab===value?"bg-[#0669ef] text-white":"text-white hover:bg-[#19487b]"}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-[#2869b4] bg-[#08264b] p-1">{CATEGORIES.map(cat=><button key={cat} onClick={()=>setCategory(cat)} className={`rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${category===cat?"bg-[#0669ef] text-white":"text-white hover:bg-[#19487b]"}`}>{cat}</button>)}</div>
        </div>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-[#ff751f]"/></div>
        : error ? <div className="flex flex-col items-center rounded-2xl border border-red-500/40 bg-[#12294c] py-20 text-white"><AlertCircle className="mb-3 h-10 w-10 text-red-400"/><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-[#1767f5] px-6 py-3 font-bold text-white">Retry</button></div>
        : sales.length===0 ? <div className="flex flex-col items-center rounded-3xl border border-[#1e508d] bg-gradient-to-br from-[#092a59] to-[#17225d] px-5 py-16 text-center"><span className="text-7xl">⏰</span><h2 className="mt-4 text-2xl font-black text-white">{tab==="active"?"No flash sales running right now":"No upcoming flash sales scheduled"}</h2><p className="mt-2 max-w-lg text-sm font-medium text-sky-100">Real seller deals will appear here as soon as they are available. Check back soon, or launch the next great deal!</p>{user&&<Link href="/flash-sales/create" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff721e] px-6 py-3 font-black !text-white hover:bg-[#ff8d3d]"><Zap className="h-5 w-5"/> Create Flash Sale</Link>}</div>
        : <div className="space-y-7">
          {lightningDeals.length>0&&<section><div className="mb-4 flex items-center gap-2"><Zap className="h-6 w-6 text-yellow-300"/><h2 className="text-2xl font-black text-white">Lightning Deals</h2><span className="rounded-full bg-[#ff315f] px-3 py-1 text-xs font-black text-white">5–15 min</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{lightningDeals.map(s=><SaleCard key={s.id} s={s} tab={tab} formatPrice={formatPrice} setLocation={setLocation}/>)}</div></section>}
          {otherSales.length>0&&<section>{lightningDeals.length>0&&<h2 className="mb-4 text-2xl font-black text-white">More Deals</h2>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{otherSales.map(s=><SaleCard key={s.id} s={s} tab={tab} formatPrice={formatPrice} setLocation={setLocation}/>)}</div></section>}
        </div>}
        <div className="relative mt-7 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-fuchsia-300/60 bg-gradient-to-r from-[#6526f9] via-[#c41bdc] to-[#ff6284] px-6 py-6 shadow-xl">
          <span aria-hidden="true" className="absolute -left-5 bottom-[-22px] rotate-[-15deg] text-7xl">📣</span>
          <div className="relative pl-14 sm:pl-20"><h2 className="text-2xl font-black text-[#fff22a] sm:text-3xl">Weekend Mega Sales!</h2><p className="mt-1 text-sm font-bold text-white">Discover limited-time deals across your favourite categories.</p></div>
          <button onClick={()=>{setSaleTypeFilter("weekend_mega");setTab("active");window.scrollTo({top:0,behavior:"smooth"});}} className="relative rounded-xl bg-white px-5 py-3 font-black text-[#5025d4] hover:bg-yellow-100">View Mega Sales →</button>
        </div>
      </main>
      <Footer/>
    </div>
  );
}

function SaleCard({ s, tab, formatPrice, setLocation }: {
  s: FlashSale; tab: "active" | "upcoming";
  formatPrice: (n: number) => string;
  setLocation: (p: string) => void;
}) {
  const orig = parseFloat(s.original_price);
  const sale = parseFloat(s.sale_price);
  const isLightning = s.sale_type === "lightning";
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#2875c2] bg-gradient-to-b from-[#0c315f] to-[#051c3a] shadow-lg shadow-black/20 transition-transform hover:-translate-y-1">
      <div className="relative aspect-[5/3] overflow-hidden bg-gradient-to-br from-[#1666f2] via-[#8435ec] to-[#ff36aa]">
        {s.image?<img src={s.image} alt={s.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/>:<div className="flex h-full items-center justify-center text-7xl" aria-label="Product image unavailable">🎁</div>}
        <span className="absolute left-2 top-2 rounded-lg bg-[#ff315b] px-3 py-1 text-base font-black text-white shadow-lg">-{s.discount_percent}%</span>
        <span className="absolute right-2 top-2 rounded-lg bg-[#102348]/90 px-2 py-1 text-[11px] font-extrabold text-white">{SALE_TYPE_META[s.sale_type]?.label??"Flash Sale"}</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-snug text-white">{s.title}</h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-2"><strong className="text-xl font-black text-[#ffe15b]">{formatPrice(sale)}</strong><span className="text-sm font-semibold text-slate-300 line-through">{formatPrice(orig)}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#34557b]"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#ff386a] to-[#ff812c]"/></div>
        <div className="mt-3 flex items-center justify-between gap-2"><CountdownPill target={tab==="active"?s.ends_at:s.starts_at} label={tab==="active"?"Ends":"Starts"} urgent={tab==="active"}/><NotifyButton sale={s}/></div>
        <button onClick={()=>setLocation(`/flash-sales/${s.id}`)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff701e] px-4 py-2.5 text-sm font-black text-white hover:bg-[#ff8b3e]">{tab==="active"?"View Deal":"Preview Deal"}<ChevronRight className="h-4 w-4"/></button>
      </div>
    </article>
  );
}
