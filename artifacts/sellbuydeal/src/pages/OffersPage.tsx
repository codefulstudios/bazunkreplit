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
    <span className={`bz-offer-status bz-offer-status-${status} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold ${cfg.color}`}>
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
    <div className="bz-offer-card overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 p-3">
        {/* Product image */}
        <div className="w-20 h-20 rounded-xl bg-white flex-shrink-0 overflow-hidden">
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
            <h3 className="font-extrabold text-white text-sm leading-tight">{offer.productTitle}</h3>
            <StatusBadge status={offer.status} />
          </div>

          <p className="text-xs text-blue-100 mb-2">{isSeller ? `Buyer: ${offer.buyerEmail?.split("@")[0] || "Bazunk buyer"}` : `Seller: ${offer.sellerName}`}</p>

          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <p className="text-xs text-blue-200">Listed at</p>
              <p className="font-bold text-blue-100 line-through">{formatPrice(offer.listingPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-blue-100">{isSeller ? "Buyer offered" : "Your offer"}</p>
              <p className="font-black text-[#ff9b3d]">{formatPrice(offer.offerPrice)}</p>
            </div>
            {savings > 0 && (
              <div>
                <p className="text-xs text-gray-400">Saving</p>
                <p className="font-bold text-emerald-300">{formatPrice(savings)} ({savingsPct}%)</p>
              </div>
            )}
          </div>

          {offer.message && (
            <p className="mt-2 text-xs text-blue-100 italic bg-[#0b2b50] rounded-lg px-2.5 py-1.5 border border-[#315275]">
              "{offer.message}"
            </p>
          )}

          <p className="mt-2 text-xs text-blue-200">
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
      <div className="border-t border-white/10 px-4 py-2.5 flex justify-end">
        <button
          onClick={() => setLocation(`/listing/${offer.publicId || offer.productId}`)}
          className="flex items-center gap-1.5 text-xs font-bold text-orange-300 hover:text-orange-200 transition-colors"
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
      <main className="bz-offers-page flex-1">
        <div className="bz-offers-wrap">
          <section className="bz-offers-hero">
            <div className="bz-offers-hero-copy">
              <button type="button" onClick={()=>setLocation("/dashboard")} className="bz-offers-back"><ArrowLeft size={17}/> Back to Dashboard</button>
              <h1>My <span>Offers</span></h1>
              <p>Track and manage all your price negotiations</p>
              <div className="bz-offers-hero-perks"><span>🏷️ Make a deal</span><span>🪙 Save money</span></div>
            </div>
            <div className="bz-offers-hero-art" aria-hidden="true"><span className="bz-offers-bag-blue"><ShoppingBag/></span><span className="bz-offers-bag-orange"><ShoppingBag/><b>B</b></span><span className="bz-offers-percent">%</span><span className="bz-offers-spark">✦</span></div>
          </section>
          <section className="bz-offers-board">
            {offerApiError&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{offerApiError}</p>}
            <div className="bz-offers-metrics">
              {[
                {label:"Pending Offers",value:counts.pending,detail:"Waiting for a response",icon:Hourglass,cls:"pending"},
                {label:"Accepted Offers",value:counts.accepted,detail:"Great deals!",icon:CheckCircle2,cls:"accepted"},
                {label:"Declined Offers",value:counts.declined,detail:"Keep trying!",icon:XCircle,cls:"declined"}
              ].map(item=><div key={item.label} className={`bz-offers-metric bz-offers-metric-${item.cls}`}><item.icon size={39}/><div><strong>{item.value}</strong><b>{item.label}</b><small>{item.detail}</small></div></div>)}
            </div>
            <div className="bz-offers-tabs"><div className="bz-offers-tab-list">{TABS.map(t=><button type="button" key={t.key} aria-pressed={tab===t.key} onClick={()=>setTab(t.key)} className={tab===t.key?"active":""}>{t.label} ({counts[t.key]})</button>)}</div><button type="button" className="bz-offers-notifications" onClick={()=>setLocation("/messages")}><MessageSquare size={16}/> Offer Notifications</button></div>
            <div className="bz-offers-content">
              <div className="bz-offers-list">
                {!filtered.length?<div className="bz-offers-empty"><span>🎁</span><h2>{tab==="all"?"No offers yet":`No ${tab} offers`}</h2><p>{tab==="all"?"Browse listings and make an offer on something you like.":"Switch tabs to see your other offers."}</p><button type="button" onClick={()=>tab==="all"?setLocation("/browse"):setTab("all")}><Search size={17}/>{tab==="all"?"Browse Listings":"All Offers"} <ChevronRight size={17}/></button></div>:filtered.map(offer=><OfferCard key={offer.id} offer={offer} currentEmail={user.email} onRespond={respond}/>)}
              </div>
              <aside className="bz-offers-tips"><h2><Lightbulb size={24}/> Tips for Getting Great Deals</h2>{[
                {icon:"🏷️",title:"Be reasonable",detail:"Fair offers are more likely to be accepted."},
                {icon:"💬",title:"Try a counter offer",detail:"Sellers might come back with a better price."},
                {icon:"💗",title:"Keep an eye on offers",detail:"Check back for seller responses."}
              ].map(t=><div className="bz-offers-tip" key={t.title}><span>{t.icon}</span><div><strong>{t.title}</strong><p>{t.detail}</p></div></div>)}</aside>
            </div>
            {counts.countered>0&&tab!=="countered"&&<button type="button" onClick={()=>setTab("countered")} className="bz-offers-counter-alert">{counts.countered} counter offer(s) waiting for your response <ChevronRight size={18}/></button>}
            <div className="bz-offers-bottom"><button type="button" onClick={()=>setLocation("/browse")}><span>🔎</span><div><strong>Find great deals</strong><small>Browse listings and make an offer.</small></div></button><button type="button" onClick={()=>setLocation("/browse")}><span>🤝</span><div><strong>Negotiate with sellers</strong><small>Make a fair offer and agree a price that works.</small></div></button><button type="button" onClick={()=>setLocation("/deals")}><span>🎁</span><div><strong>Save more on Bazunk</strong><small>Get the items you want for less.</small></div></button></div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
