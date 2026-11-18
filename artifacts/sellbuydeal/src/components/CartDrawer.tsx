import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  X, Minus, Plus, Trash2, ShoppingBag, ArrowRight,
  Shield, Truck, Tag, CheckCircle2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { BuyerProtectionModal } from "@/components/BuyerProtectionModal";

const CONDITION_COLORS: Record<string, string> = {
  "new":      "bg-emerald-100 text-emerald-700",
  "like new": "bg-teal-100 text-teal-700",
  "good":     "bg-blue-100 text-blue-700",
  "fair":     "bg-yellow-100 text-yellow-700",
  "poor":     "bg-red-100 text-red-700",
};

export function CartDrawer() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, clearCart, itemCount, subtotal } = useCart();
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();

  const [protectionOpen, setProtectionOpen] = useState(false);
  const [quote, setQuote] = useState<{ buyerProtectionFee: number; delivery: number; total: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const cartKey = JSON.stringify(items.map(item => ({ id: item.product.id, quantity: item.quantity })));
  useEffect(() => {
    if (!isOpen || !items.length) { setQuote(null); return; }
    const controller = new AbortController();
    setQuote(null); setQuoteError(false); setQuoteLoading(true);
    fetch("/api/stripe/quote-cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: JSON.parse(cartKey) }), signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Quote unavailable"); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setQuote({ buyerProtectionFee: Number(data.buyerProtectionFee), delivery: Number(data.delivery), total: Number(data.total) }); })
      .catch(() => { if (!controller.signal.aborted) setQuoteError(true); })
      .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    return () => controller.abort();
  }, [cartKey, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeCart(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [isOpen, closeCart]);

  function goToCheckout() {
    closeCart();
    setLocation("/checkout");
  }

  const delivery = quote?.delivery;
  const total = quote?.total;

  return typeof document === "undefined" ? null : createPortal(
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bz-cart-overlay"
            style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", backgroundColor: "rgba(3, 12, 29, 0.68)", zIndex: 2147483000 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="bz-cart-drawer flex flex-col shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: "auto", width: "min(400px, 100vw)", maxWidth: "100vw", height: "100dvh", backgroundColor: "#ffffff", color: "#14243d", zIndex: 2147483001, opacity: 1, isolation: "isolate" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#4A5CE8]" />
                <h2 className="font-bold text-gray-900 text-base">
                  Cart
                  {itemCount > 0 && (
                    <span className="ml-2 text-xs font-bold bg-[#4A5CE8] text-white px-2 py-0.5 rounded-full">
                      {itemCount}
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors font-medium"
                    data-testid="button-clear-cart"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  data-testid="button-close-cart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Secure checkout note */}
            {subtotal > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 font-medium text-center">
                  🔒 Payments secured by Bazunk/Stripe
                </p>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">Your cart is empty</h3>
                  <p className="text-sm text-gray-400 mb-6">Browse listings to add items</p>
                  <button
                    onClick={closeCart}
                    className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    data-testid="button-browse-from-cart"
                  >
                    Browse Listings
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-gray-50 rounded-2xl p-3 flex gap-3"
                      data-testid={`cart-item-${item.product.id}`}
                    >
                      {/* Image */}
                      <Link
                        href={`/listing/${item.product.id}`}
                        onClick={closeCart}
                        className="w-16 h-16 rounded-xl bg-white flex-shrink-0 overflow-hidden border border-gray-100"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-full h-full object-contain p-1.5"
                        />
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/listing/${item.product.id}`}
                          onClick={closeCart}
                          className="text-xs font-semibold text-gray-800 line-clamp-2 hover:text-[#4A5CE8] transition-colors leading-tight"
                        >
                          {item.product.title}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${CONDITION_COLORS[item.product.condition]}`}>
                            {item.product.condition}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                          {/* Quantity stepper */}
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                              data-testid={`button-qty-minus-${item.product.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                              data-testid={`button-qty-plus-${item.product.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="flex-shrink-0 self-start w-6 h-6 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors"
                        data-testid={`button-remove-${item.product.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer: order summary + checkout */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 pt-4 pb-6 space-y-3 bg-white">
                {/* Trust row */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 pb-1">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure Checkout</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Seller ships</span>
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Make an offer</span>
                </div>

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={`font-semibold ${delivery === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                      {quoteLoading ? "Calculating…" : delivery == null ? "At checkout" : delivery === 0 ? "FREE" : formatPrice(delivery)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Buyer Protection</span>
                    <span className="text-right font-semibold text-gray-900">{quoteLoading ? "Calculating…" : quote ? formatPrice(quote.buyerProtectionFee) : "At checkout"}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Estimated total</span>
                    <span>{quoteLoading ? "Calculating…" : total == null ? "At checkout" : formatPrice(total)}</span>
                  </div>
                  {quoteError && <p role="status" className="text-xs text-amber-800">Live fees are temporarily unavailable. Your final charges will be calculated at checkout.</p>}
                  <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
                    Buyer Protection is included for business-seller purchases. Personal-seller purchases may have an additional fee, shown above when available. The final amount is confirmed at checkout.
                  </p>
                  <button type="button" onClick={() => setProtectionOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700" data-testid="button-cart-buyer-protection">
                    <Shield className="h-4 w-4" /> Buyer Protection <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Checkout button */}
                <button
                  onClick={goToCheckout}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#D97706] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                  data-testid="button-checkout"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={closeCart}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                  data-testid="button-continue-shopping"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <BuyerProtectionModal open={protectionOpen && isOpen} onClose={() => setProtectionOpen(false)} />
    </>,
    document.body
  );
}
