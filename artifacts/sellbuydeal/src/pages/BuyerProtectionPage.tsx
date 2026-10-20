import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useCurrency } from "@/context/CurrencyContext";
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, Package, SearchCheck, RotateCcw, CreditCard, ClipboardList, Handshake, MessageCircle, FileText, Bell, Headphones, Store, UserRound, LockKeyhole, Sparkles, X } from "lucide-react";

const coverage = [
  { title: "Item Not Received", text: "If your order never arrives, you can open a dispute for review and a possible refund.", icon: Package, gradient: "from-[#007c79] to-[#005f69]", iconBg: "bg-emerald-400" },
  { title: "Not As Described", text: "If an item differs significantly from its listing, submit evidence and we'll review your claim.", icon: SearchCheck, gradient: "from-[#0656bd] to-[#073575]", iconBg: "bg-blue-500" },
  { title: "Return Support", text: "Changed your mind? Check the seller's return policy and request an eligible return from your dashboard.", icon: RotateCcw, gradient: "from-[#7535b6] to-[#492487]", iconBg: "bg-fuchsia-500" },
];
const steps = [
  { title: "Pay Securely", text: "Complete your purchase through Bazunk checkout.", icon: CreditCard, emoji: "💳", gradient: "from-[#262755] to-[#19294e]", badge: "bg-orange-500" },
  { title: "Item Arrives", text: "Check your item on arrival and report any problems promptly.", icon: Package, emoji: "📦", gradient: "from-[#123c80] to-[#142c59]", badge: "bg-sky-500" },
  { title: "Open a Dispute", text: "If there's an issue, file a claim from your dashboard. We review evidence from both sides.", icon: ClipboardList, emoji: "📋", gradient: "from-[#33276f] to-[#122b56]", badge: "bg-purple-500" },
  { title: "Review & Resolution", text: "We explain the outcome. Approved refunds return to your original payment method.", icon: Handshake, emoji: "🤝", gradient: "from-[#075b5d] to-[#103151]", badge: "bg-emerald-500" },
];
const support = [
  { title: "Help reporting an order issue", subtitle: "Step-by-step instructions", icon: MessageCircle, color: "bg-blue-500" },
  { title: "Review of buyer and seller evidence", subtitle: "Fair and impartial review", icon: FileText, color: "bg-sky-600" },
  { title: "Guidance on eligible returns", subtitle: "Check if your item qualifies", icon: Package, color: "bg-orange-500" },
  { title: "Updates on your claim and its outcome", subtitle: "We'll keep you informed", icon: Bell, color: "bg-violet-600" },
];

export default function BuyerProtectionPage() {
  const { formatPrice, currency } = useCurrency();
  const [sellerInfo, setSellerInfo] = useState<"personal" | "business" | null>(null);
  useEffect(() => { if (!sellerInfo) return; const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSellerInfo(null); }; window.addEventListener("keydown", onEscape); return () => window.removeEventListener("keydown", onEscape); }, [sellerInfo]);
  useEffect(() => {
    const jump = () => { if (window.location.hash === "#fees") document.getElementById("fees")?.scrollIntoView(); };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, []);

  return <div className="min-h-screen bg-[#061b36] text-white">
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0045a6] via-[#1649e2] to-[#982de3]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-36 right-[-5%] h-[550px] w-[550px] rounded-full bg-fuchsia-400/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-[#001b50]/60 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 lg:pb-0">
        <Link href="/support" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#08245e]/75 px-4 py-2 text-sm font-bold text-white hover:bg-[#153d85]"><ArrowLeft className="h-4 w-4"/> Back to Help & Support</Link>
        <div className="grid items-center gap-8 lg:grid-cols-[1.04fr_.96fr]">
          <div className="relative z-10 py-8 lg:py-14">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#068afa] px-4 py-2 text-sm font-extrabold text-white shadow-lg"><ShieldCheck className="h-4 w-4"/> Buyer Protection & Support</span>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">Shop With Complete <span className="block text-[#ffdb22] drop-shadow-[0_3px_1px_rgba(0,0,0,0.2)]">Confidence</span></h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white sm:text-lg">Eligible purchases completed through Bazunk checkout receive Buyer Protection. If something isn't right, we're here to help — with clear steps, fair resolutions and real support.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard?section=disputes" className="inline-flex items-center gap-2 rounded-full bg-[#ff691a] px-7 py-3.5 font-black text-white shadow-lg shadow-orange-950/30 hover:bg-[#ff813d]">Open a Dispute <ArrowRight className="h-5 w-5"/></Link><a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-[#062d81] px-7 py-3.5 font-bold text-white hover:bg-[#15419c]">View Protection Terms ↗</a></div>
          </div>
          <div aria-hidden="true" className="relative flex min-h-[290px] items-center justify-center lg:min-h-[425px]">
            <div className="absolute h-64 w-64 rounded-full bg-yellow-400/40 blur-3xl"/>
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[3rem] border-[10px] border-[#58c5ff] bg-gradient-to-br from-[#1cc8ff] via-[#075bfa] to-[#00399d] shadow-[0_25px_60px_rgba(0,0,0,.4)] sm:h-72 sm:w-72"><ShieldCheck className="h-32 w-32 text-white drop-shadow-[0_8px_10px_rgba(0,0,0,.25)] sm:h-44 sm:w-44"/></div>
            <span className="absolute bottom-3 left-0 -rotate-12 text-7xl drop-shadow-2xl sm:text-8xl">📦</span>
            <span className="absolute bottom-0 right-0 rotate-6 text-7xl drop-shadow-2xl sm:text-8xl">🛒</span>
            <span className="absolute right-0 top-0 rotate-12 rounded-2xl bg-emerald-500 px-4 py-3 text-center text-base font-black shadow-xl sm:text-xl">YOU'RE<br/>PROTECTED ✓</span>
            <Sparkles className="absolute left-4 top-8 h-12 w-12 text-yellow-300"/>
          </div>
        </div>
      </div>
    </div>
    <div className="border-b border-blue-400/20 bg-[#04142d]"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4 sm:px-8">{["Secure checkout","Eligible purchase protection","Clear dispute process","Dedicated support"].map(t=><div key={t} className="flex items-center gap-2 text-sm font-bold text-white"><CheckCircle2 className="h-5 w-5 shrink-0 fill-emerald-500 text-[#073a44]"/>{t}</div>)}</div></div>
    <main className="mx-auto max-w-7xl space-y-4 px-5 py-5 sm:px-8">
      <section id="fees" className="grid scroll-mt-24 gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-pink-400/40 bg-gradient-to-br from-[#d71c94] via-[#fa466a] to-[#ff973f] p-6 shadow-lg"><div className="relative z-10 max-w-[80%]"><UserRound className="mb-3 h-10 w-10 rounded-xl bg-white/20 p-2"/><h2 className="text-xl font-black sm:text-2xl">Buying from a Personal Seller</h2><p className="mt-3 text-sm font-medium leading-relaxed text-white">Personal sellers pay no selling commission. Buyers pay Buyer Protection: 6% + {formatPrice(1.00)} by default in {currency.code}, with one fixed fee per checkout. Your exact fee is shown before payment.</p><button type="button" onClick={() => setSellerInfo("personal")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111c42] px-5 py-2.5 text-sm font-black !text-white hover:bg-[#263b73]">Learn more <ArrowRight className="h-4 w-4"/></button></div><span aria-hidden="true" className="absolute -bottom-5 -right-5 text-[125px] drop-shadow-2xl">🙋📦</span></div>
        <div className="relative overflow-hidden rounded-2xl border border-blue-400/40 bg-gradient-to-br from-[#0056f6] via-[#5336ed] to-[#cd35df] p-6 shadow-lg"><div className="relative z-10 max-w-[80%]"><Store className="mb-3 h-10 w-10 rounded-xl bg-white/20 p-2"/><h2 className="text-xl font-black sm:text-2xl">Buying from a Business</h2><p className="mt-3 text-sm font-medium leading-relaxed text-white">Buyer Protection is included with no extra buyer fee. Business sellers pay a selling fee, 8% by default, including protection and support. Admin-configured category rates can differ.</p><button type="button" onClick={() => setSellerInfo("business")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111c42] px-5 py-2.5 text-sm font-black !text-white hover:bg-[#263b73]">Business seller fees <ArrowRight className="h-4 w-4"/></button></div><span aria-hidden="true" className="absolute -bottom-5 -right-4 text-[125px] drop-shadow-2xl">🏬</span></div>
      </section>
      <section className="rounded-3xl border border-blue-500/25 bg-gradient-to-br from-[#062a55] to-[#071b3b] p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black sm:text-3xl">What You're Protected Against</h2><p className="mt-1 text-sm font-medium text-sky-200">For eligible purchases completed through Bazunk checkout, subject to the protection terms.</p></div><a href="/terms" target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-400 px-5 py-2 text-sm font-bold !text-white hover:bg-blue-800">Protection terms ↗</a></div><div className="grid gap-4 md:grid-cols-3">{coverage.map(c=><div key={c.title} className={`rounded-2xl border border-white/15 bg-gradient-to-br ${c.gradient} p-5`}><div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${c.iconBg}`}><c.icon className="h-8 w-8 text-white"/></div><h3 className="text-lg font-black">{c.title}</h3><p className="mt-2 text-sm font-medium leading-relaxed text-white">{c.text}</p></div>)}</div></section>
      <section className="rounded-3xl border border-blue-500/25 bg-gradient-to-br from-[#062a55] to-[#071b3b] p-5 sm:p-7"><h2 className="text-2xl font-black sm:text-3xl">How Protection Works</h2><p className="mb-5 mt-1 text-sm text-sky-200">A simple, fair process from purchase to resolution.</p><div className="grid gap-3 md:grid-cols-4">{steps.map((s,i)=><div key={s.title} className={`relative min-h-[210px] rounded-2xl border border-white/15 bg-gradient-to-br ${s.gradient} p-4`}><div className="flex items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.badge} text-xl font-black`}>{i+1}</span><h3 className="text-base font-black">{s.title}</h3></div><p className="mt-3 text-sm leading-relaxed text-white">{s.text}</p><span aria-hidden="true" className="absolute bottom-2 right-4 text-5xl">{s.emoji}</span></div>)}</div></section>
      <section className="rounded-3xl border border-blue-500/25 bg-gradient-to-br from-[#062a55] to-[#071b3b] p-5 sm:p-7"><h2 className="text-2xl font-black sm:text-3xl">Support Through the Process</h2><p className="mb-5 mt-1 text-sm text-sky-200">Clear guidance and evidence-based review at every step.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{support.map(s=><div key={s.title} className="flex items-center gap-3 rounded-xl border border-sky-300/20 bg-[#17355e] p-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.color}`}><s.icon className="h-6 w-6"/></span><div><h3 className="text-sm font-bold text-white">{s.title}</h3><p className="mt-1 text-xs text-sky-200">{s.subtitle}</p></div></div>)}</div><p className="mt-5 text-xs text-sky-200">Eligibility, outcomes and timing depend on the circumstances of the claim. <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold !text-cyan-200 underline">Read the protection terms ↗</a>.</p></section>
    </main>
    <section className="mt-5 overflow-hidden bg-gradient-to-r from-[#8bc9ff] via-[#f0e8ff] to-[#d2c3ff] text-[#081c40]"><div className="mx-auto grid max-w-7xl items-center gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[190px_1fr_250px]"><div aria-hidden="true" className="text-center text-[105px] leading-none">👩‍💻</div><div className="text-center"><h2 className="text-2xl font-black sm:text-3xl">Need Help With an Order?</h2><p className="mt-2 font-medium text-[#344b72]">Contact our support team for help with an order or an existing claim.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/dashboard?section=disputes" className="inline-flex items-center gap-2 rounded-full bg-[#ff671b] px-7 py-3 font-black text-white hover:bg-orange-600">Open a Dispute <ArrowRight className="h-4 w-4"/></Link><Link href="/support" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-black text-blue-700 hover:bg-blue-50"><Headphones className="h-4 w-4"/> Contact Support</Link></div></div><div className="rounded-2xl border border-sky-200 bg-[#102448] p-5 text-white shadow-lg">{["Friendly support team","Clear and honest guidance","Help with disputes and returns","Updates on your case"].map(t=><div key={t} className="mb-2 flex items-center gap-2 text-sm font-extrabold !text-white"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400"/>{t}</div>)}</div></div></section>
    {sellerInfo && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020b20]/85 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSellerInfo(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="seller-protection-title" className="buyer-protection-info-modal relative w-full max-w-xl overflow-hidden rounded-3xl border border-sky-300/50 bg-[#0d2345] !text-white shadow-[0_30px_100px_rgba(0,0,0,.65)]">
        <div className={`flex items-center justify-between gap-4 p-6 ${sellerInfo === "personal" ? "bg-gradient-to-r from-[#df207f] to-[#fb6842]" : "bg-gradient-to-r from-[#1158e9] to-[#8834df]"}`}>
          <div><span className="text-xs font-black uppercase tracking-wider text-white">Bazunk Buyer Protection</span><h2 id="seller-protection-title" className="mt-1 text-2xl font-black text-white">{sellerInfo === "personal" ? "Buying from a Personal Seller" : "Buying from a Business"}</h2></div>
          <button type="button" aria-label="Close information" onClick={() => setSellerInfo(null)} className="rounded-full border border-white/40 bg-[#13254c]/70 p-2 text-white hover:bg-[#273e73]"><X className="h-6 w-6"/></button>
        </div>
        <div className="buyer-protection-info-body max-h-[65vh] space-y-4 overflow-y-auto p-6 text-sm leading-relaxed !text-white">
          {sellerInfo === "personal" ? <>
            <p className="text-base font-bold text-white">Private sellers list and sell without a selling commission. An eligible buyer pays a separate Buyer Protection fee at checkout.</p>
            <div className="rounded-xl border border-emerald-400/40 bg-[#133d4b] p-4"><p className="font-black text-emerald-200">How the fee works</p><p className="mt-1 text-white">The default Buyer Protection fee is 6% of the eligible purchase amount plus {formatPrice(1.00)} in {currency.code}, charged once per checkout. The exact applicable amount is displayed before you pay; configured rates may differ.</p></div>
            <h3 className="text-base font-black text-white">What happens if something goes wrong?</h3><p>Report an item that does not arrive or significantly differs from its description through your Bazunk dashboard. Provide order details, photographs and other relevant evidence. Our team reviews eligibility and the information provided by both parties.</p>
            <p>Returns, refunds and claim decisions depend on the seller's policy, the transaction and Bazunk's protection terms. Protection is not a promise of an automatic refund.</p>
          </> : <>
            <p className="text-base font-bold text-white">Business purchases include Buyer Protection without a separate buyer protection charge by default.</p>
            <div className="rounded-xl border border-sky-400/40 bg-[#163a6b] p-4"><p className="font-black text-sky-200">Business seller fees</p><p className="mt-1 text-white">Business sellers pay a selling fee of 8% by default, which includes protection and support. Admin-configured category rates may differ. Buyers see the full payable total before checkout.</p></div>
            <h3 className="text-base font-black text-white">What protection is available?</h3><p>For eligible Bazunk checkout orders, buyers can report non-delivery, items materially different from their descriptions, and eligible returns. Submit evidence through the order dispute process for review.</p>
            <p>Applicable statutory consumer rights may also apply when buying from a business. Bazunk's Buyer Protection does not replace those rights.</p>
          </>}
          <p className="rounded-xl bg-[#172f54] p-3 text-slate-100">Only eligible purchases completed through Bazunk checkout qualify. Read the full terms for limitations, exclusions and dispute requirements.</p>
          <div className="flex flex-wrap gap-3"><a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#2469f4] px-5 py-3 font-black !text-white hover:bg-[#4484ff]">Read Buyer Protection Terms ↗</a><button type="button" onClick={() => setSellerInfo(null)} className="rounded-xl border border-sky-300/50 px-5 py-3 font-bold text-white hover:bg-[#234067]">Close</button></div>
        </div>
      </div>
    </div>}
  </div>;
}
