import { useState, useMemo, useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Lock, ShoppingBag, Truck, Shield,
  Package, AlertCircle, Loader2, Trash2, Minus, Plus, Tag,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BuyerProtectionBadge } from "@/components/BuyerProtectionBadge";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

type Step = "summary" | "redirecting";

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "summary",     label: "Review"  },
    { key: "redirecting", label: "Payment" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            i < idx  ? "bg-emerald-100 text-emerald-700" :
            i === idx ? "bg-[#4A5CE8] text-white shadow-sm" :
                        "bg-gray-100 text-slate-600"
          }`}>
            {i < idx ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < idx ? "bg-emerald-300" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

const CONDITION_COLORS: Record<string, string> = {
  "new": "bg-emerald-100 text-emerald-700", "like new": "bg-teal-100 text-teal-700",
  "good": "bg-blue-100 text-blue-700", "fair": "bg-yellow-100 text-yellow-700", "poor": "bg-red-100 text-red-700",
};

export function CheckoutPage() {
  const { items, clearCart, removeFromCart, updateQuantity } = useCart();
  const { getToken } = useClerkAuth();
  const { user, refreshBalance } = useAuth();
  const [, setLocation] = useLocation();
  // Cart checkout is charged in GBP by the Stripe API; never show converted totals as the amount payable.
  const formatPrice = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const [step, setStep] = useState<Step>("summary");
  const [placed, setPlaced] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(() => new URLSearchParams(window.location.search).has("session_id"));
  const [paymentReturnFailed, setPaymentReturnFailed] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [discountCode,setDiscountCode] = useState("");
  const [discountMessage,setDiscountMessage] = useState("");
  type Quote = { currency:string; subtotal:number; privateSubtotal:number; buyerProtectionFee:number; delivery:number; bundleDiscount:number; bundleBreakdown:{sellerEmail:string;itemCount:number;discountMinor:number;shippingMinor:number}[]; total:number; protectionPercent:number; fixedProtection:number; items:{id:number;price:number;title:string;sellerType:string}[] };
  const [recoveryConsent, setRecoveryConsent] = useState(false);
  const [quote,setQuote]=useState<Quote|null>(null);
  const [quoteError,setQuoteError]=useState("");
  const [quoteLoading,setQuoteLoading]=useState(true);
  const [quoteRevision,setQuoteRevision]=useState(0);
  const cartKey=JSON.stringify(items.map(item=>({id:item.product.id,quantity:item.quantity})));
  const [quotedKey,setQuotedKey]=useState("");
  useEffect(()=>{
    const controller=new AbortController();setQuoteLoading(true);setQuoteError("");setQuote(null);
    if(!items.length) { setQuoteLoading(false); return; }
    fetch("/api/stripe/quote-cart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:JSON.parse(cartKey)}),signal:controller.signal})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not calculate fees.");return data;})
      .then(data=>{setQuote(data);setQuotedKey(cartKey);})
      .catch(err=>{if(err.name!=="AbortError")setQuoteError(err.message);})
      .finally(()=>{if(!controller.signal.aborted)setQuoteLoading(false);});
    return ()=>controller.abort();
  },[cartKey,quoteRevision]);
  const subtotal=quote?.subtotal??0;
  const delivery=quote?.delivery??0;
  const bundleDiscount=quote?.bundleDiscount??0;
  const buyerProtectionFee=quote?.buyerProtectionFee??0;
  const total=quote?.total??0;

  // Detect return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    setConfirming(true);
    // Clean the URL without reloading
    window.history.replaceState({}, "", "/checkout");

    fetch("/api/stripe/confirm-cart-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Payment verification unavailable"); return data as { success?: boolean; error?: string }; })
      .then((data) => {
        if (data.success) {
          clearCart();
          refreshBalance();
          setPlaced(true);
        } else {
          setPaymentReturnFailed(true);
          setCheckoutError(data.error ?? "Payment verification failed. Check your order history before attempting another payment.");
        }
      })
      .catch(() => { setPaymentReturnFailed(true); setCheckoutError("Payment verification is not available yet. Your payment may have succeeded: check your orders or contact support before trying again."); })
      .finally(() => setConfirming(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the credit balance once the order is placed and the signed-in user has loaded
  useEffect(() => {
    if (placed && user?.email) refreshBalance();
  }, [placed, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const editCart=()=>{setCheckoutError(null);setQuote(null);setQuotedKey("");};
  async function handleContinueToPayment() {
    const email = user?.email ?? guestEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setCheckoutError("Please enter a valid email address to continue.");
      return;
    }
    if(!quote || quoteLoading || quotedKey!==cartKey) {setCheckoutError("Wait for your fee breakdown before paying.");return;}
    setCheckoutError(null);
    setCheckoutLoading(true);
    setStep("redirecting");

    try {
      if (user?.email) {
        try {
          const token = await getToken();
          if (token) await fetch("/api/checkout-recovery/save", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({items:JSON.parse(cartKey),consent:recoveryConsent}) });
        } catch { /* Optional recovery never blocks payment. */ }
      }
      const res = await fetch("/api/stripe/checkout-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: user?.name,
          items: items.map((i) => ({
            id: i.product.id,
            title: i.product.title,
            price: i.product.price,
            quantity: i.quantity,
            currency: i.product.currency ?? "GBP",
            priceGbp: i.product.priceGbp,
          })),
          expectedTotal:total,
          deliveryGbp: delivery,
        }),
      });
      const data = await res.json() as { url?: string; freeOrder?: boolean; error?: string };


      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if(res.status===409)setQuoteRevision(value=>value+1);
      throw new Error(data.error ?? "Failed to start checkout");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setCheckoutError(msg);
      setStep("summary");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Verifying Stripe return
  if (confirming) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <Loader2 className="w-12 h-12 text-[#4A5CE8] animate-spin mb-4" />
          <p className="text-gray-600 font-semibold">Verifying your payment…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (paymentReturnFailed) {
    return <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main role="alert" className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <AlertCircle className="w-12 h-12 text-amber-600 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">We couldn't verify your payment yet</h1>
        <p className="max-w-xl mt-3 text-base text-slate-700">{checkoutError}</p>
        <p className="max-w-xl mt-2 text-sm text-slate-700">Do not pay again until you've checked whether the order was completed.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Check your orders</Link>
          <Link href="/contact" className="rounded-xl border border-slate-400 bg-white px-5 py-3 text-sm font-semibold text-slate-900">Contact support</Link>
        </div>
      </main><Footer />
    </div>;
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-slate-600 text-sm mb-6">Add items before checking out</p>
          <Link href="/browse" className="px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Browse Listings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-slate-600 text-sm mb-2">Thank you for your purchase. You'll receive a confirmation shortly.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                View Dashboard
              </Link>
              <Link href="/browse" className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-300 transition-colors">
                Keep Shopping
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-4xl flex-1">
        <button onClick={() => setLocation("/browse")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-gray-700 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to browsing
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Secure checkout</h1>
        <p className="mb-4 text-sm font-semibold text-slate-700">Payments are charged in GBP (£). Your bank may convert the amount if your account uses another currency.</p>
        <StepIndicator step={step} />

        {checkoutError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">{checkoutError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* ── STEP 1: Order Review ── */}
            {step === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>

                {/* Items */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#4A5CE8]" /> Your Items ({items.length})</h2>
                    <button type="button" onClick={()=>{if(window.confirm("Remove all items from your basket?")){editCart();clearCart();}}} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100" aria-label="Remove all items from basket" data-testid="checkout-clear-cart"><Trash2 className="h-3.5 w-3.5"/> Clear cart</button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                          <img src={item.product.image} alt={item.product.title} loading="lazy" decoding="async" className="w-full h-full object-contain p-1.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full capitalize ${CONDITION_COLORS[item.product.condition]}`}>{item.product.condition}</span>
                            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-950">
                              <button type="button" onClick={()=>{if(item.quantity>1){editCart();updateQuantity(item.product.id,item.quantity-1);}}} disabled={item.quantity<=1} aria-label={`Decrease quantity of ${item.product.title}`} className="flex min-h-11 min-w-11 items-center justify-center hover:bg-slate-100 rounded-l-lg disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-3 w-3"/></button>
                              <span className="min-w-5 text-center text-xs font-bold" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                              <button type="button" onClick={()=>{editCart();updateQuantity(item.product.id,item.quantity+1);}} aria-label={`Increase quantity of ${item.product.title}`} className="flex min-h-11 min-w-11 items-center justify-center hover:bg-slate-100 rounded-r-lg"><Plus className="h-3 w-3"/></button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-bold text-gray-900 text-sm">{formatPrice((quote?.items.find(row=>row.id===item.product.id)?.price ?? item.product.priceGbp ?? item.product.price) * item.quantity)}</span>
                          <button type="button" onClick={()=>{editCart();removeFromCart(item.product.id);}} aria-label={`Remove ${item.product.title} from basket`} title="Remove item" className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-bold text-red-700 hover:bg-red-50 hover:text-red-900" data-testid={`checkout-remove-${item.product.id}`}><Trash2 className="h-3.5 w-3.5"/> Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="mb-4 rounded-xl border border-slate-300 bg-white p-3 text-slate-900 lg:hidden">
                  <summary className="cursor-pointer text-sm font-bold">Have a discount or promo code?</summary>
                  <div className="mt-3 space-y-2">
                    <label htmlFor="mobile-checkout-discount-code" className="block text-xs font-semibold">Discount code</label>
                    <div className="flex gap-2">
                      <input id="mobile-checkout-discount-code" type="text" autoComplete="off" maxLength={64} value={discountCode} onChange={e=>{setDiscountCode(e.target.value);setDiscountMessage("");}} placeholder="Enter a code" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950" />
                      <button type="button" onClick={()=>setDiscountMessage(discountCode.trim()?"Promo codes are not yet supported. No discount has been applied.":"Enter a code first.")} className="min-h-11 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white">Check</button>
                    </div>
                    {discountMessage&&<p role="status" className="text-xs font-semibold text-amber-900">{discountMessage}</p>}
                    <p className="text-xs text-slate-700">Promo codes are not yet enabled. Your order total will not change.</p>
                  </div>
                </details>

                <p className="text-xs text-slate-600 leading-relaxed">Eligible purchases include Buyer Protection. Your exact fee and delivery costs appear in the order summary before payment.</p>
                {quoteLoading && <p role="status" className="mt-4 text-sm text-muted-foreground">Calculating your checkout fees…</p>}
                {quoteError && <div role="alert" className="mt-4 text-sm text-red-600">{quoteError}<button onClick={()=>setQuoteRevision(v=>v+1)} className="ml-3 underline font-bold">Retry fee calculation</button></div>}
                {!user && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email for your receipt</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                      data-testid="input-guest-email"
                    />
                  </div>
                )}

                {/* At phone sizes the entire fee breakdown sits beside the payment decision,
                    rather than hidden below the Pay button in the desktop sidebar. */}
                <section aria-label="Mobile order cost breakdown" className="mt-5 rounded-2xl border-2 border-indigo-300 bg-white p-4 text-slate-900 shadow-sm lg:hidden">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-black text-slate-950">Payable total · GBP</h2>
                    <span className="text-xs font-bold text-slate-700">Stripe secure payment</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><span>Items</span><strong>{quote?formatPrice(subtotal):"Calculating…"}</strong></div>
                    <div className="flex justify-between gap-3"><span>Delivery</span><strong>{quote?(delivery===0?"FREE":formatPrice(delivery)):"Calculating…"}</strong></div>
                    <div className="flex justify-between gap-3"><span>Buyer protection</span><strong>{quote?(buyerProtectionFee>0?formatPrice(buyerProtectionFee):"Included"):"Calculating…"}</strong></div>
                    {bundleDiscount>0&&<div className="flex justify-between gap-3 font-bold text-emerald-800"><span>Bundle savings</span><span>−{formatPrice(bundleDiscount)}</span></div>}
                    <div aria-live="polite" className="flex justify-between gap-3 border-t border-indigo-200 pt-3 text-xl font-black">
                      <span>Total</span><span data-testid="mobile-checkout-total">{!quote||quotedKey!==cartKey?"Calculating…":formatPrice(total)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-700">The price is calculated by Bazunk. It will be confirmed again before Stripe payment.</p>
                </section>

                <button
                  onClick={handleContinueToPayment}
                  disabled={checkoutLoading || quoteLoading || !quote || quotedKey!==cartKey}
                  className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 w-full mt-4 min-h-14 py-4 rounded-xl bg-[#E66A20] text-white font-black text-base hover:bg-orange-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 lg:static"
                  data-testid="button-continue-payment"
                >
                  {checkoutLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
                    : <><Lock className="w-4 h-4" /> Pay {formatPrice(total)} with Stripe <ChevronRight className="w-4 h-4" /></>
                  }
                </button>

                {!user && (
                  <p className="text-center text-xs text-slate-600 mt-2">
                    Checkout as a guest. After purchase, create or sign in to a Bazunk account using this same email address to see and track this order.
                  </p>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Redirecting to Stripe ── */}
            {step === "redirecting" && (
              <motion.div key="redirecting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#4A5CE8]/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-[#4A5CE8] animate-spin" />
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg mb-1">Redirecting to secure checkout</h2>
                  <p className="text-sm text-slate-600 mb-6">You're being taken to Stripe's secure payment page…</p>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    256-bit SSL encryption · Powered by Stripe
                  </div>
                </div>
                <button onClick={() => setStep("summary")} className="w-full mt-3 py-3 rounded-xl border-2 border-gray-200 text-slate-600 font-semibold text-sm hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5">
                  <ChevronLeft className="w-4 h-4" /> Cancel and go back
                </button>
              </motion.div>
            )}
          </div>

          {/* Right: order summary (sticky) */}
          <div className="hidden space-y-4 lg:block lg:sticky lg:top-24 lg:self-start">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Order Summary · GBP</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">Buyer Protection <Link href="/buyer-protection" className="text-[#4A5CE8] underline text-xs">Learn more</Link></span>
                  <span className="font-semibold text-gray-900">{quoteLoading ? "Calculating…" : !quote ? "Unavailable" : buyerProtectionFee>0 ? formatPrice(buyerProtectionFee) : "Included"}</span>
                </div>
                <p className="text-xs text-slate-600">{quote?.privateSubtotal ? `${quote.protectionPercent}% of personal-seller items + ${formatPrice(quote.fixedProtection)} once per checkout.` : "Protection is included on business-seller purchases."}</p>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery (combined by seller where offered)</span>
                  <span className={`font-semibold ${delivery === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                    {delivery === 0 ? "FREE" : formatPrice(delivery)}
                  </span>
                </div>
                {quote?.bundleBreakdown?.filter(b=>b.discountMinor>0||b.shippingMinor>0).map(b=><p key={b.sellerEmail} className="text-xs font-semibold text-slate-700">{b.itemCount} item(s) from one seller · shipping {formatPrice(b.shippingMinor/100)}{b.discountMinor>0?` · saved ${formatPrice(b.discountMinor/100)}`:""}</p>)}
                {bundleDiscount > 0 && <div className="flex justify-between gap-2 text-emerald-700"><span>Multi-item savings</span><span className="font-bold">−{formatPrice(bundleDiscount)}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 text-xl pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{quoteLoading || !quote || quotedKey !== cartKey ? "Calculating…" : formatPrice(total)}</span>
                </div>
              </div>


              <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900">
                <label htmlFor="checkout-discount-code" className="flex items-center gap-2 text-sm font-bold"><Tag className="h-4 w-4"/> Discount or promo code</label>
                <div className="mt-2 flex gap-2">
                  <input id="checkout-discount-code" type="text" autoComplete="off" maxLength={64} value={discountCode} onChange={e=>{setDiscountCode(e.target.value);setDiscountMessage("");}} placeholder="Enter a code" className="min-w-0 flex-1 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-600" />
                  <button type="button" onClick={()=>setDiscountMessage(discountCode.trim()?"Promotion codes are not enabled for Bazunk checkout yet. No discount has been applied.":"Enter a code first.")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white">Apply</button>
                </div>
                {discountMessage&&<p role="status" className="mt-2 text-xs font-semibold text-amber-900">{discountMessage}</p>}
                <p className="mt-2 text-xs text-slate-700">Codes are not yet supported by the payment system; totals will not change.</p>
              </div>
              {user?.email && <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <summary className="cursor-pointer font-semibold">Optional checkout reminder</summary>
                {user?.email&&<label className="mt-3 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" className="mt-1" checked={recoveryConsent} onChange={e=>{const allowed=e.target.checked;setRecoveryConsent(allowed);void (async()=>{try{const token=await getToken();if(!token)return;await fetch("/api/checkout-recovery/save",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({items:JSON.parse(cartKey),consent:allowed})});}catch{/* Optional reminders never block checkout. */}})();}}/><span>Send me one reminder if I leave checkout unfinished. This does not affect payment.</span></label>}
              </details>}
              <div className="mt-4 space-y-2">
                {[
                  { icon: Shield,  text: "Buyer Protection on eligible orders" },
                  { icon: Truck,   text: "Shipping arranged by seller" },
                  { icon: Package, text: "Track orders from your Dashboard" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-[#4A5CE8] flex-shrink-0" />
                    {text}
                  </div>
                ))}
                <div className="pt-1">
                  <BuyerProtectionBadge compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
