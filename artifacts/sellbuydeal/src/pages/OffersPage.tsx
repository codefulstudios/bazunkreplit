import { useState, useEffect, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  Tag, Clock, CheckCircle2, XCircle, ChevronRight,
  MessageSquare, AlertCircle, RefreshCw, ArrowLeft, Sparkles, Search, Lightbulb, ShoppingBag, Percent, Gift, Handshake, Hourglass, List,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useOffers, type Offer, type OfferStatus } from "@/context/OfferContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:          { label: "Pending",          color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock       },
  accepted:         { label: "Accepted",          color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  declined:         { label: "Declined",          color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle     },
  countered:        { label: "Counter Offer",     color: "bg-blue-100 text-blue-700 border-blue-200",      icon: MessageSquare },
  counter_accepted: { label: "Counter Accepted",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  counter_declined: { label: "Counter Declined",  color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle     },
};

const TABS = [
  { key: "all",      label: "All Offers" },
  { key: "pending",  label: "Pending" },
  { key: "countered",label: "Counter Offers" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function StatusBadge({ status }: { status: OfferStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

type RemoteOffer = Offer & { buyerEmail?: string; sellerEmail?: string; publicId?: string | null; fromServer?: boolean };
function OfferCard({ offer, currentEmail, onRespond }: { offer: RemoteOffer; currentEmail?: string; onRespond: (id:string, action:string, counterPrice?:number)=>Promise<void> }) {
  const { formatPrice } = useCurrency();
  const { respondToCounter } = useOffers();
  const isSeller = !!offer.sellerEmail && offer.sellerEmail.toLowerCase() === currentEmail?.toLowerCase();
  const [counterInput,setCounterInput] = useState("");
  const [, setLocation] = useLocation();
  const cfg = STATUS_CONFIG[offer.status];

  const savings = offer.listingPrice - offer.offerPrice;
  const savingsPct = Math.round((savings / offer.listingPrice) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Product image */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {offer.productImage ? (
            <img src={offer.productImage} alt={offer.productTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag className="w-7 h-7 text-gray-300" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{offer.productTitle}</h3>
            <StatusBadge status={offer.status} />
          </div>

          <p className="text-xs text-slate-600 mb-2">{isSeller ? `Buyer: ${offer.buyerEmail?.split("@")[0] || "Bazunk buyer"}` : `Seller: ${offer.sellerName}`}</p>

          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Listed at</p>
              <p className="font-bold text-gray-600 line-through">{formatPrice(offer.listingPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">{isSeller ? "Buyer offered" : "Your offer"}</p>
              <p className="font-black text-[#F26B21]">{formatPrice(offer.offerPrice)}</p>
            </div>
            {savings > 0 && (
              <div>
                <p className="text-xs text-gray-400">Saving</p>
                <p className="font-bold text-emerald-600">{formatPrice(savings)} ({savingsPct}%)</p>
              </div>
            )}
          </div>

          {offer.message && (
            <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
              "{offer.message}"
            </p>
          )}

          <p className="mt-2 text-xs text-gray-300">
            {new Date(offer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {isSeller && offer.status === "pending" && (
        <div className="border-t border-blue-100 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-bold text-slate-900">Respond to this buyer's offer</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void onRespond(offer.id,"accept")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Accept</button>
            <button onClick={() => void onRespond(offer.id,"decline")} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white">Decline</button>
            <input aria-label="Counter-offer price" type="number" min="0.01" step="0.01" value={counterInput} onChange={e=>setCounterInput(e.target.value)} placeholder="Counter price" className="w-32 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900"/>
            <button disabled={Number(counterInput)<=0} onClick={() => void onRespond(offer.id,"counter",Number(counterInput))}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Counter</button>
          </div>
        </div>
      )}
      {/* Counter offer section */}
      {!isSeller && offer.status === "countered" && offer.counterPrice && (
        <div className="border-t border-blue-100 bg-blue-50/60 px-4 py-3">
          <div className="flex items-start gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Seller made a counter offer</p>
              <p className="text-sm font-black text-blue-800">{formatPrice(offer.counterPrice)}</p>
              {offer.counterMessage && (
                <p className="text-xs text-blue-600 mt-0.5 italic">"{offer.counterMessage}"</p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => offer.fromServer ? void onRespond(offer.id,"accept-counter") : respondToCounter(offer.id, true)}
              className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
            >
              Accept {formatPrice(offer.counterPrice)}
            </button>
            <button
              onClick={() => offer.fromServer ? void onRespond(offer.id,"decline-counter") : respondToCounter(offer.id, false)}
              className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* View listing button */}
      <div className="border-t border-gray-50 px-4 py-2.5 flex justify-end">
        <button
          onClick={() => setLocation(`/listing/${offer.publicId || offer.productId}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#4A5CE8] hover:text-[#3a4cc8] transition-colors"
        >
          View listing <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function OffersPage() {
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();
  const { offers: localOffers } = useOffers();
  const { getToken } = useClerkAuth();
  const [remoteOffers,setRemoteOffers] = useState<RemoteOffer[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [offerApiError,setOfferApiError] = useState("");
  const refreshOffers=useCallback(async()=>{
    const token=await getToken();
    if(!token)return;
    const response=await fetch("/api/offers",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    const data=await response.json().catch(()=>[]);
    if(!response.ok)throw new Error(data.error || "Offers unavailable");
    setRemoteOffers((Array.isArray(data)?data:[]).map((o:any)=>({
      id:String(o.id), productId:Number(o.listing_id), productTitle:String(o.product_title),
      productImage:String(o.product_image||""), listingPrice:Number(o.listing_price),
      sellerName:String(o.seller_name||"Bazunk seller"), sellerId:0, offerPrice:Number(o.offer_price),
      message:o.message||undefined, status:o.status as OfferStatus, counterPrice:o.counter_price?Number(o.counter_price):undefined,
      counterMessage:o.counter_message||undefined, createdAt:String(o.created_at),
      respondedAt:o.updated_at, buyerEmail:String(o.buyer_email),sellerEmail:String(o.seller_email),
      publicId:o.public_id,fromServer:true
    })));
    setOfferApiError("");setLoaded(true);
  },[getToken]);
  useEffect(()=>{
    if(!user?.email)return;
    void refreshOffers().catch(e=>{setOfferApiError(e instanceof Error?e.message:"Could not load offers");setLoaded(true);});
  },[user?.email,refreshOffers]);
  async function respond(id:string,action:string,counterPrice?:number){
    try{
      const token=await getToken();
      if(!token)throw new Error("Please sign in");
      const response=await fetch(`/api/offers/${encodeURIComponent(id)}`,{
        method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({action,counterPrice})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not respond to offer");
      await refreshOffers();
    }catch(e){setOfferApiError(e instanceof Error?e.message:"Could not respond to offer");}
  }
  const offers = loaded ? remoteOffers : localOffers;
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("all");

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in to view offers</h2>
            <p className="text-sm text-gray-500 mb-4">You need an account to make and manage offers.</p>
            <button
              onClick={() => setLocation("/login")}
              className="bg-[#F26B21] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#d45c1a] transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filtered = tab === "all"
    ? offers
    : tab === "declined"
      ? offers.filter(o => o.status === "declined" || o.status === "counter_declined")
      : tab === "accepted"
        ? offers.filter(o => o.status === "accepted" || o.status === "counter_accepted")
        : offers.filter(o => o.status === tab);

  const counts: Record<TabKey, number> = {
    all:       offers.length,
    pending:   offers.filter(o => o.status === "pending").length,
    countered: offers.filter(o => o.status === "countered").length,
    accepted:  offers.filter(o => o.status === "accepted" || o.status === "counter_accepted").length,
    declined:  offers.filter(o => o.status === "declined" || o.status === "counter_declined").length,
  };

  return (
    <div className="min-h-screen bg-[#06172f] text-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-blue-400/30 bg-gradient-to-r from-[#074af2] via-[#2528e9] to-[#c423e7]">
          <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 30% 20%, #4ff9ff 0, transparent 25%), radial-gradient(circle at 82% 70%, #ff3cae 0, transparent 30%)"}} />
          <div className="relative max-w-7xl mx-auto px-5 py-9 md:py-12 flex items-center justify-between gap-5">
            <div className="relative z-10">
              <button onClick={() => setLocation("/dashboard")} className="mb-4 flex items-center gap-2 text-white font-bold text-sm hover:text-yellow-200"><ArrowLeft className="w-4 h-4"/> Back to Dashboard</button>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight drop-shadow-lg">My <span className="text-yellow-300">Offers</span></h1>
              <p className="text-base md:text-xl font-semibold mt-3 text-white">Track and manage all your price negotiations</p>
              <div className="flex gap-2 mt-5 flex-wrap"><span className="rounded-full bg-white/20 px-3 py-1.5 font-bold text-sm">✨ Make a deal</span><span className="rounded-full bg-white/20 px-3 py-1.5 font-bold text-sm">💸 Save money</span></div>
            </div>
            <div aria-hidden="true" className="hidden sm:flex relative shrink-0 items-center justify-center w-48 h-40 md:w-80 md:h-48">
              <span className="absolute left-0 top-0 text-5xl rotate-[-22deg] drop-shadow-lg">🏷️</span>
              <span className="absolute right-0 top-0 text-5xl rotate-[20deg] drop-shadow-lg">💝</span>
              <span className="text-[110px] md:text-[145px] leading-none drop-shadow-2xl">🧑🏻‍💻</span>
              <span className="absolute bottom-0 right-1 text-5xl">🛍️</span>
              <span className="absolute top-3 right-1/3 text-3xl">⭐</span>
            </div>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-4">
          {offerApiError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{offerApiError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label:"Pending Offers", value:counts.pending, detail:"Waiting for a response", icon:Hourglass, cls:"from-orange-500 via-orange-600 to-amber-700" },
              { label:"Accepted Offers", value:counts.accepted, detail:"Great deals!", icon:CheckCircle2, cls:"from-emerald-500 via-teal-600 to-emerald-800" },
              { label:"Declined Offers", value:counts.declined, detail:"Keep trying!", icon:XCircle, cls:"from-pink-500 via-fuchsia-700 to-purple-800" },
            ].map(item => <div key={item.label} className={`flex items-center gap-4 rounded-2xl border border-white/20 bg-gradient-to-br ${item.cls} p-4 shadow-lg`}>
              <div className="p-3 rounded-xl bg-white/20"><item.icon className="w-8 h-8 text-white"/></div>
              <div><p className="text-3xl font-black text-white">{item.value}</p><p className="font-extrabold text-white">{item.label}</p><p className="text-white/90 text-sm">{item.detail}</p></div>
            </div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-full px-4 py-2.5 text-sm font-bold border transition-all ${tab===t.key?"bg-gradient-to-r from-sky-500 to-blue-600 border-sky-400 text-white shadow-lg":"bg-[#09254c] border-blue-500/40 text-white hover:bg-[#16427b]"}`}>{t.label}{counts[t.key]>0?` (${counts[t.key]})`:""}</button>)}
            </div>
            <button onClick={() => setLocation("/browse")} className="flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-3 text-white font-black shadow-lg"><ShoppingBag className="w-5 h-5"/> Browse Listings</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-4">
            <div className="min-h-[310px] rounded-2xl border border-blue-400/60 bg-gradient-to-br from-[#073a97] via-[#092a6e] to-[#21146d] p-6">
              {filtered.length===0 ? <div className="flex min-h-[265px] flex-col items-center justify-center text-center">
                <div className="text-7xl mb-3 drop-shadow-xl">🎁</div>
                <h2 className="text-2xl font-black text-white">{tab==="all"?"No offers yet":`No ${tab} offers`}</h2>
                <p className="mt-2 text-blue-100">{tab==="all"?"Browse listings and make an offer on something you like.":"Switch tabs to see your other offers."}</p>
                <button onClick={() => tab==="all"?setLocation("/browse"):setTab("all")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-3 text-white font-black"><Search className="w-4 h-4"/>{tab==="all"?"Browse Listings":"All Offers"} <ChevronRight className="w-4 h-4"/></button>
              </div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{filtered.map(offer=><OfferCard key={offer.id} offer={offer} currentEmail={user.email} onRespond={respond}/>)}</div>}
            </div>
            <aside className="rounded-2xl border border-blue-400/60 bg-gradient-to-br from-[#092d80] to-[#111060] p-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4"><Lightbulb className="w-6 h-6 text-yellow-300"/> Tips for Getting Great Deals</h2>
              {[
                {icon:"🏷️", title:"Be reasonable",detail:"Fair offers are more likely to be accepted."},
                {icon:"💬",title:"Try a counter offer",detail:"Sellers might come back with a better price."},
                {icon:"💗",title:"Keep an eye on offers",detail:"Check back for seller responses."},
              ].map(t=><div key={t.title} className="flex gap-3 items-center rounded-xl border border-blue-400/30 bg-[#051d4b]/75 p-3 mb-2"><span className="text-3xl">{t.icon}</span><div><h3 className="text-white font-extrabold">{t.title}</h3><p className="text-sm font-semibold text-white/95 leading-relaxed">{t.detail}</p></div></div>)}
            </aside>
          </div>
          {counts.countered>0&&tab!=="countered"&&<button onClick={()=>setTab("countered")} className="w-full text-left rounded-xl border border-cyan-400 bg-cyan-900 p-4 text-white font-bold">{counts.countered} counter offer(s) waiting for your response →</button>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-6">
            {[
              {title:"Find Something You Love",detail:"Browse items and make an offer.",icon:"🔎",cls:"from-blue-600 via-indigo-600 to-fuchsia-600",link:"/browse"},
              {title:"Negotiate a Better Price",detail:"Make an offer and save on items you want.",icon:"🤝",cls:"from-cyan-500 via-blue-600 to-indigo-700",link:"/browse"},
              {title:"Great Deals Are Waiting!",detail:"Start browsing and make your first offer today.",icon:"🛍️",cls:"from-fuchsia-600 via-pink-600 to-orange-500",link:"/browse"},
            ].map(c=><button key={c.title} onClick={()=>setLocation(c.link)} className={`text-left rounded-2xl p-5 bg-gradient-to-r ${c.cls} flex items-center gap-4 hover:brightness-110 transition shadow-lg`}><span className="text-5xl">{c.icon}</span><span><strong className="text-xl font-black text-white block">{c.title}</strong><span className="text-sm text-white font-medium">{c.detail}</span></span></button>)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
