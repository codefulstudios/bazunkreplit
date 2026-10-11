import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Gavel, Clock, Plus, ChevronRight, Loader2,
  Tag, Filter, AlertCircle, ShieldCheck, Globe2, Gem, Trophy, Users, Flame, Search, Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

type Auction = {
  id: string; title: string; description: string | null; images: string[];
  category: string | null; condition: string; seller_name: string; seller_email: string;
  starting_bid: string; current_bid: string | null; bid_count: number;
  bid_increment: string; end_time: string; status: string; created_at: string;
};

function getTimeLeft(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

function Countdown({ endTime }: { endTime: string }) {
  const [t, setT] = useState(() => getTimeLeft(endTime));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  if (!t) return <span className="text-red-500 font-bold text-xs">Ended</span>;
  if (t.days > 0) return <span className="font-mono font-bold text-sm">{t.days}d {t.hours}h {t.mins}m</span>;
  if (t.hours > 0) return <span className="font-mono font-bold text-sm text-amber-600">{t.hours}h {t.mins}m {t.secs}s</span>;
  return <span className="font-mono font-bold text-sm text-red-600 animate-pulse">{t.mins}m {t.secs}s</span>;
}

const CATEGORIES = ["All", "Electronics", "Fashion", "Gaming", "Books", "Collectibles", "Home", "Sports", "Digital", "Adult", "Other"];
const SORT_OPTIONS = [
  { value: "ending", label: "Ending Soon" },
  { value: "newest", label: "Newest First" },
];

export function AuctionsPage() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("ending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: "active", sort });
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/auctions?${params}`);
      if (!res.ok) throw new Error("Failed to load auctions");
      setAuctions(await res.json());
    } catch {
      setError("Could not load auctions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => { load(); }, [load]);

  const endingCount = auctions.filter(a => new Date(a.end_time).getTime() - Date.now() <= 86400000).length;
  const isEndingSoon = (endTime: string) => new Date(endTime).getTime() - Date.now() < 3600000;
  const isNew = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 86400000;

  return (
    <div className="min-h-screen bg-[#04152f] text-white flex flex-col">
      <Navbar />
      <section className="relative isolate overflow-hidden border-b-4 border-[#19a4ff] bg-gradient-to-r from-[#003bb8] via-[#1057fa] to-[#9620df]">
        <div className="pointer-events-none absolute -top-28 right-[-5%] h-[430px] w-[540px] rounded-full bg-[#f52dbf]/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-160px] left-[24%] h-[320px] w-[420px] rounded-full bg-[#01b9f8]/45 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-2 md:items-center md:py-12 lg:px-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4c58] to-[#f20c55] px-4 py-2 text-sm font-black text-white shadow-lg"><Gavel className="h-5 w-5"/> LIVE AUCTIONS</div>
            <h1 className="mt-4 text-5xl font-black leading-[.98] tracking-tight text-white sm:text-6xl">Bid on Unique <span className="block text-[#ffe341]">Items</span></h1>
            <p className="mt-4 max-w-xl text-base font-semibold text-white sm:text-lg">Place bids on one-of-a-kind listings. The highest bid wins when the timer hits zero.</p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-white sm:text-sm">
              <span className="flex items-center gap-2"><span className="rounded-lg bg-[#ffbd27] p-2 text-[#052253]"><Trophy className="h-4 w-4"/></span> Great deals</span>
              <span className="flex items-center gap-2"><span className="rounded-lg bg-[#a22fff] p-2"><Gem className="h-4 w-4"/></span> Unique items</span>
              <span className="flex items-center gap-2"><span className="rounded-lg bg-[#00bc82] p-2"><ShieldCheck className="h-4 w-4"/></span> Safe &amp; secure</span>
              <span className="flex items-center gap-2"><span className="rounded-lg bg-[#ff299d] p-2"><Globe2 className="h-4 w-4"/></span> Worldwide buyers</span>
            </div>
            {user && <Link href="/auctions/create" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff711d] px-5 py-3 font-black !text-white shadow-lg hover:bg-[#ff8c3b]" data-testid="button-create-auction"><Plus className="h-5 w-5"/> List an Auction</Link>}
          </div>
          <div className="relative flex min-h-[235px] items-center justify-center sm:min-h-[310px]">
            <div className="pointer-events-none absolute inset-4 rounded-full bg-[#ff56c7]/30 blur-3xl" />
            <img src="/auction-mascot.svg" alt="Smiling Bazunk auction mascot in a blue hoodie holding a gold coin and auction gavel" className="relative z-10 h-[290px] w-full max-w-[470px] object-contain drop-shadow-[0_20px_25px_rgba(3,5,46,.45)] sm:h-[370px]" />
            <span className="absolute bottom-[7%] right-[2%] z-20 rotate-[-8deg] rounded-2xl border-4 border-[#ffe94a] bg-[#f20a9b] px-4 py-2 text-xl font-black text-white shadow-2xl sm:text-2xl">BID NOW!</span>
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl px-5 pt-4 lg:px-8"><AdSlot slotKey="auctions_mid" /></div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-5 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-2xl border border-[#15538d] bg-[#05284c] p-1">
            {CATEGORIES.map(cat => <button key={cat} onClick={() => setCategory(cat)} className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition-colors sm:text-sm ${category===cat?"bg-[#0878fa] text-white shadow-lg":"text-white hover:bg-[#15538d]"}`}>{cat}</button>)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Filter className="h-4 w-4 text-white"/>
            <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-xl border border-[#3476c1] bg-[#082b54] px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#3aa8ff]">{SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#082e59] to-[#09214a] p-4">
          <div className="flex items-center gap-3"><span className="text-4xl">🔥</span><div><h2 className="text-2xl font-black text-white">Ending Soon</h2><p className="text-sm font-medium text-white">Hurry! These auctions finish soon.</p></div></div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#112f62] px-4 py-2 text-sm font-extrabold text-white"><Zap className="h-5 w-5 text-[#ffe342]"/>{loading?"Loading live auctions":`${endingCount} ending in the next 24 hours`}</span>
        </div>
        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A5CE8]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#2463a0] bg-gradient-to-br from-[#0b3266] to-[#191d59] py-20 text-white">
            <AlertCircle className="w-10 h-10 mb-3 text-red-300" />
            <p className="font-semibold">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-[#086ff1] text-white text-sm font-bold">Retry</button>
          </div>
        ) : auctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Gavel className="w-14 h-14 mb-4 text-blue-300" />
            <p className="text-2xl font-black text-white">No active auctions</p>
            <p className="text-sm mt-1">
              {category !== "All" ? `No auctions in ${category} right now. ` : ""}
              Be the first to list one!
            </p>
            {user && (
              <Link href="/auctions/create" className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Create Auction
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-white mb-4">{auctions.length} auction{auctions.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {auctions.map((a) => {
                const currentBid = a.current_bid ? parseFloat(a.current_bid) : null;
                const displayBid = currentBid ?? parseFloat(a.starting_bid);
                const endingSoon = isEndingSoon(a.end_time);
                const isNewListing = isNew(a.created_at);
                const img = Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null;
                return (
                  <div key={a.id} className="bg-gradient-to-b from-[#0b3566] to-[#061b39] rounded-2xl border border-[#2469b2] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1355c6] via-[#6228cf] to-[#e42eac] overflow-hidden">
                      {img ? (
                        <img src={img} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gavel className="w-12 h-12 text-gray-200" />
                        </div>
                      )}
                      {endingSoon && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          Ending Soon
                        </span>
                      )}
                      {!endingSoon && isNewListing && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                      {a.category && (
                        <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                          {a.category}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-black text-white text-sm leading-snug mb-2 line-clamp-2">{a.title}</h3>

                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-400">{currentBid ? "Current bid" : "Starting bid"}</p>
                          <p className="text-xl font-black text-[#ffe04b]">{formatPrice(displayBid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{a.bid_count} bid{a.bid_count !== 1 ? "s" : ""}</p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <Countdown endTime={a.end_time} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                        <Tag className="w-3 h-3" />
                        <span>{a.condition}</span>
                        <span className="ml-auto">by {a.seller_name}</span>
                      </div>

                      <button
                        onClick={() => setLocation(`/auctions/${a.id}`)}
                        className="mt-auto w-full py-2.5 rounded-xl bg-[#ff711d] text-white text-sm font-black hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                        data-testid={`button-view-auction-${a.id}`}
                      >
                        View Auction <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-gradient-to-r from-[#7b21e8] to-[#d228e9] p-5"><div className="text-4xl">💎</div><h3 className="mt-2 text-xl font-black text-white">Find Hidden Gems!</h3><p className="mt-1 text-sm font-medium text-white">Rare items, great deals and amazing finds.</p><button onClick={()=>{setCategory("All");setSort("newest");}} className="mt-4 rounded-xl bg-white px-4 py-2 font-black text-[#5b20ae]">Browse Auctions →</button></div><div className="rounded-2xl bg-gradient-to-r from-[#0373ec] to-[#11b2ed] p-5"><div className="text-4xl">🔎</div><h3 className="mt-2 text-xl font-black text-white">Something for Everyone</h3><p className="mt-1 text-sm font-medium text-white">Electronics, collectibles, fashion, gaming and more.</p><Link href="/categories" className="mt-4 inline-block rounded-xl bg-white px-4 py-2 font-black !text-[#0453b3]">Explore Categories →</Link></div><div className="rounded-2xl bg-gradient-to-r from-[#ee149f] to-[#ff7550] p-5"><div className="text-4xl">⏰</div><h3 className="mt-2 text-xl font-black text-white">Don’t Miss Out!</h3><p className="mt-1 text-sm font-medium text-white">Bids end fast. Find your favourite items before the timer hits zero.</p><button onClick={()=>setSort("ending")} className="mt-4 rounded-xl bg-white px-4 py-2 font-black text-[#bd176f]">View Ending Soon →</button></div></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#164c84] bg-[#082b55] p-5 text-xs font-bold text-white sm:grid-cols-5">{[[Trophy,"Unique one-of-a-kind items"],[ShieldCheck,"Safe & secure bidding"],[Users,"Active community"],[Globe2,"Worldwide buyers"],[Gem,"Great deals"]].map(([Icon,label])=><div key={label as string} className="flex items-center gap-2">{typeof Icon!=="string"&&<Icon className="h-5 w-5 shrink-0 text-[#ffcf37]"/>}{label as string}</div>)}</div>
      </main>

      <Footer />
    </div>
  );
}
