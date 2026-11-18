import { useMemo, useState } from "react";
import { openChatwootSupport } from "@/components/ChatwootWidget";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ChevronDown, HelpCircle, ShoppingBag, Package, CreditCard,
  Shield, MessageSquare, RotateCcw, ArrowRight, Gavel, Zap,
  Radio, Layers, Tag, Search, Headphones, Mail, BookOpen, List, ChevronsDownUp, ChevronsUpDown, Truck, Store, LockKeyhole, Sparkles, LifeBuoy, Coins, Gift, Megaphone, MapPin,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CompactPageHero } from "@/components/CompactPageHero";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled, useFeature } from "@/components/FeatureGate";

const CATEGORIES = [
  {
    icon: ShoppingBag,
    label: "Buying",
    color: "bg-blue-100 text-blue-600",
    faqs: [
      { q: "How do I make an offer on an item?", a: "Visit any listing and click 'Make an Offer'. Enter your price and a message to the seller. They can accept, decline, or counter within 48 hours. You'll be notified by email either way." },
      { q: "Is it safe to buy on Bazunk?", a: "Yes. All payments go through Bazunk — you never send money directly to a seller. Every order is covered by our Buyer Protection policy. If something goes wrong you can open a dispute from your Dashboard." },
      { q: "Can I track my order?", a: "Once an item ships you'll receive a tracking number by email and inside Dashboard → Orders. Click the order to see live tracking steps from dispatch to delivery." },
      { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), PayPal, and Apple Pay. All transactions are processed over encrypted, PCI-compliant connections." },
      { q: "Can I buy from multiple sellers at once?", a: "Yes — add items from different sellers to your cart and check out together. Each seller's items are grouped and shipped separately, and fees are calculated per seller." },
      { q: "What is Buyer Protection?", a: "Buyer Protection is added automatically to purchases made through Bazunk. It helps protect eligible purchases if an item doesn't arrive, arrives damaged, or is significantly not as described. For eligible purchases from all seller types the default UK fee is 6% of the item price + £1, charged once per checkout. Business-seller items include Buyer Protection with no additional buyer fee. Checkout shows the current admin-configured amount. See the Buyer Protection page for claim and dispute details." },
    ],
  },
  {
    icon: Package,
    label: "Selling",
    color: "bg-orange-100 text-orange-600",
    faqs: [
      { q: "How do I list an item for sale?", a: "Click Sell in the top navigation and choose Direct Sale. Fill in the title, description, price, photos, and condition, then publish. Your listing goes live immediately and is visible to all buyers." },
      { q: "What are the selling fees?", a: "For private sellers: none. It is free to list and free to sell, so you keep 100% of your item price. Registered businesses and sole traders pay an admin-configured selling fee (5% by default), including protection and support. Buyers pay no additional Buyer Protection fee on business purchases." },
      { q: "How do I get paid?", a: "Funds are released to your Bazunk balance 2 business days after the buyer confirms receipt. You can withdraw to your UK bank account or spend your balance on future purchases and promotions." },
      { q: "Can I pause or end a listing early?", a: "Yes. Go to Dashboard → My Listings, find the item, and click the menu icon. You can pause, edit, relist, or permanently remove any listing at any time." },
      { q: "How do I set auto-accept on offers?", a: "Go to Dashboard → Auto-Accept Offers and set a minimum threshold per listing or store-wide. Any offer at or above that price accepts automatically — no manual action needed." },
      { q: "Can I sell internationally?", a: "Currently Bazunk ships within the UK. International selling is planned for a future update. You can indicate your shipping regions on each listing." },
    ],
  },
  {
    icon: Gavel,
    feature: "auctions",
    label: "Auctions",
    color: "bg-violet-100 text-violet-600",
    faqs: [
      { q: "How do auctions work on Bazunk?", a: "Sellers set a starting price and an optional reserve. Buyers place bids and the highest bidder when the timer hits zero wins. You'll receive an email if you're outbid." },
      { q: "What is a reserve price?", a: "A reserve is the minimum amount the seller is willing to accept. If bids don't reach the reserve, the item won't sell. Reserve prices are hidden from buyers during the auction." },
      { q: "Can I set a Buy It Now price on an auction?", a: "Yes. Sellers can add a Buy It Now price alongside the auction. Any buyer can pay that price immediately to end the auction early and secure the item." },
      { q: "What happens if I win an auction?", a: "You'll be notified by email. Payment is taken automatically from your saved payment method. If payment fails you'll have 24 hours to complete it before the item is offered to the next highest bidder." },
      { q: "Can I retract a bid?", a: "Bids are binding on Bazunk. You can only retract a bid if the listing contained a significant error — contact support immediately and we'll review the case." },
      { q: "How do I create an auction listing?", a: "Go to Sell → Auction Listing. Set your starting price, optional reserve, optional Buy It Now price, and duration (1, 3, 5, 7, or 10 days). You can add up to 12 photos." },
    ],
  },
  {
    icon: Zap,
    feature: "flash_sales",
    label: "Flash Sales",
    color: "bg-amber-100 text-amber-600",
    faqs: [
      { q: "What is a Flash Sale?", a: "A Flash Sale lets you discount one or more items for a short, limited window (1–24 hours). Flash Sales appear in the dedicated Flash Sales section and are highlighted across the platform to drive urgency." },
      { q: "How do I create a Flash Sale?", a: "Go to Dashboard → My Flash Sales and click New Flash Sale. Choose items from your active listings, set a discount percentage, and pick a duration. The sale goes live immediately." },
      { q: "Can I run multiple Flash Sales at once?", a: "You can have one active Flash Sale per listing at a time, but you can create Flash Sales across multiple listings simultaneously. Each sale has its own timer and discount." },
      { q: "What discounts can I offer?", a: "You can offer any discount between 5% and 90% off your listed price. The discounted price and a countdown timer are shown prominently on the listing." },
      { q: "What happens when a Flash Sale ends?", a: "The item automatically reverts to its original price. If the item didn't sell, it remains listed normally. You can create another Flash Sale at any time." },
      { q: "Do Flash Sales affect my listing visibility?", a: "Yes — active Flash Sales get a promotional boost across browse, search results, and the homepage Flash Sales carousel, giving your items extra exposure during the sale window." },
    ],
  },
  {
    icon: Radio,
    feature: "live",
    label: "Live Shopping",
    color: "bg-red-100 text-red-600",
    faqs: [
      { q: "What is Live Shopping on Bazunk?", a: "Live Shopping lets sellers broadcast live video while showcasing items for sale. Viewers can buy directly from the stream. Live streams appear on the Live tab and can also be shared to external platforms." },
      { q: "How do I start a live stream?", a: "Go to Dashboard → Go Live and connect a streaming platform (Twitch, YouTube, or use Bazunk's built-in broadcaster). Set up your listing carousel, then go live. Viewers can tap items to purchase instantly." },
      { q: "Can viewers make offers during a live stream?", a: "Yes. Viewers can click any pinned listing and make an offer. You can accept, decline, or counter in real time while continuing to broadcast." },
      { q: "Is there a fee for going live?", a: "Going live is free. Private sellers pay no selling commission on items sold during a stream. Business seller fees may apply to registered businesses and sole traders. Boosting your stream for extra homepage visibility uses Bazunk Credits." },
      { q: "How long can I stream for?", a: "There's no hard limit on stream duration. We recommend sessions of 30–90 minutes for the best engagement. Streams are automatically saved as replays after they end." },
      { q: "What equipment do I need?", a: "A smartphone with a stable internet connection is enough to get started. For better quality, use a ring light and external microphone. The Bazunk broadcaster works in any modern browser." },
    ],
  },
  {
    icon: Layers,
    label: "Bundles & Deals",
    color: "bg-indigo-100 text-indigo-600",
    faqs: [
      { q: "What is a Bundle Deal?", a: "Bundle Deals let you group multiple listings together and offer buyers a tiered discount. The more items in the bundle, the bigger the discount: 2 items = 5% off, 3 = 10%, 4 = 15%, 5+ = 20% off." },
      { q: "How do I create a Bundle Deal?", a: "Go to Sell → Create Bundle (or Dashboard → Bundle Builder). Select at least 2 of your active listings, review the auto-calculated discounts, and publish. Buyers can then buy the bundle in one checkout." },
      { q: "Can I include auction items in a bundle?", a: "No. Bundles are for fixed-price listings only. Auction and Flash Sale items cannot be added to a bundle while they're in those states." },
      { q: "What are Classifieds?", a: "Classifieds are free text-based ads for items and services that don't require the full checkout flow — useful for local collections, large items, or services. Buyers contact you directly to arrange the transaction." },
      { q: "Are Classifieds covered by Buyer Protection?", a: "No. Classified ads are contact-only listings and are outside Bazunk's payment and protection systems. We recommend meeting in a safe public place for in-person exchanges." },
      { q: "Can I feature my Bundle or Classified on the homepage?", a: "Yes — use Credits to purchase a Homepage Spotlight or Featured Badge for any listing type. Go to Dashboard → Promotions to choose a boost package." },
    ],
  },
  {
    icon: RotateCcw,
    label: "Returns & Refunds",
    color: "bg-emerald-100 text-emerald-600",
    faqs: [
      { q: "What is your returns policy?", a: "Buyers have 30 days from delivery to request a return if the item is not as described, is damaged, or doesn't arrive. Items must be returned unused and in original packaging where possible." },
      { q: "How long do refunds take?", a: "Once we approve a return, refunds are processed within 3–5 business days back to your original payment method." },
      { q: "What if the seller refuses a return?", a: "If a seller won't accept a valid return, open a dispute in Dashboard → Disputes. Our team reviews all disputes within 24 hours and will issue a refund where applicable." },
      { q: "Can I exchange an item instead of returning?", a: "Exchanges are arranged directly between buyer and seller. Message the seller first to agree terms, then initiate a return for the original item while completing a new purchase." },
      { q: "Who pays for return shipping?", a: "If the item is not as described or is faulty, the seller covers return postage. For change-of-mind returns, the buyer is responsible for return shipping costs." },
      { q: "How do I open a return request?", a: "Go to Dashboard → Returns and click New Return Request. Select your order, choose a reason, upload photos if the item is damaged, and submit. The seller has 48 hours to respond before we step in." },
    ],
  },
  {
    icon: CreditCard,
    label: "Credits & Payments",
    color: "bg-purple-100 text-purple-600",
    faqs: [
      { q: "What are Bazunk Credits?", a: "Credits are Bazunk's platform currency used to promote your listings. 100 Credits = £1. You earn Credits through milestones and rewards, or purchase them directly in Dashboard → Credits." },
      { q: "What can I spend Credits on?", a: "Credits can be used for: Move to Top (re-list to top of search), Featured Badge (highlighted listing), Homepage Spotlight, live stream boosts, and priority support." },
      { q: "How do I buy Credits?", a: "Go to Dashboard → Credits and choose a bundle. Credits are added instantly and never expire." },
      { q: "Can I earn Credits for free?", a: "Yes. Complete milestones in Dashboard → Credits → Earn Rewards to claim free Credits. Examples: posting your first listing, going live, making your first sale, and more." },
      { q: "Can I get a refund on unused Credits?", a: "Credits are non-refundable once purchased, but they never expire and can be used on any listing at any time." },
      { q: "Is my payment information secure?", a: "Yes. We use SSL encryption and never store raw card details. All transactions are processed through a PCI-compliant payment processor. Your data is never shared with sellers." },
    ],
  },
  {
    icon: Shield,
    label: "Account & Security",
    color: "bg-red-100 text-red-600",
    faqs: [
      { q: "How do I reset my password?", a: "On the login page click 'Forgot password?' and enter your email address. We'll send a reset link valid for 24 hours." },
      { q: "How do I update my email or display name?", a: "Go to Dashboard → Profile and click Edit Profile. You can update your name, email, username, and avatar at any time." },
      { q: "How do I close my account?", a: "Open a support ticket from your Dashboard and choose 'Account Closure' as the category. We'll process your request and delete all personal data within 30 days per our Privacy Policy." },
      { q: "What do I do if I suspect fraud?", a: "Use the flag icon on any listing or seller profile to report suspicious activity. Our Trust & Safety team reviews all reports within 24 hours. If you've been scammed, open a dispute immediately." },
      { q: "How do I enable two-factor authentication?", a: "Go to Dashboard → Security. Two-factor authentication (2FA) can be enabled via an authenticator app or SMS. We strongly recommend enabling 2FA on your account." },
      { q: "My account has been restricted — what do I do?", a: "Account restrictions are applied when our systems detect unusual activity. Open a support ticket from your Dashboard with the subject 'Account Restriction' and our team will review your case within 24 hours." },
    ],
  },
  {
    icon: MessageSquare,
    label: "Messages & Offers",
    color: "bg-sky-100 text-sky-600",
    faqs: [
      { q: "How do I message a seller?", a: "Open any listing and click 'Message Seller'. You can also message from a seller's profile page. All conversations appear in Dashboard → Messages." },
      { q: "What is Auto-Accept Offers?", a: "In Dashboard → Auto-Accept Offers, set a minimum threshold per listing. Any offer at or above that amount is automatically accepted without you needing to respond." },
      { q: "How long do offers last?", a: "Offers expire after 48 hours if the seller doesn't respond. You'll receive an email notification when an offer is accepted, declined, or expires." },
      { q: "Can a seller counter my offer?", a: "Yes. Sellers can send a counter-offer with a different price. You'll be notified and can accept or decline the counter. Counter-offers also expire after 48 hours." },
      { q: "Is there a limit on how many offers I can have open?", a: "No. You can have unlimited open offers across different listings and sellers at any time." },
      { q: "Can I report a message that breaks the rules?", a: "Yes. In any conversation, tap the three-dot menu and select 'Report'. Our moderation team reviews flagged messages and acts within 24 hours." },
    ],
  },
];


const EXTRA_FAQS: Record<string, {q:string;a:string}[]> = {
  Buying: [
    {q:"How do I buy an item on Bazunk?",a:"Browse or search for an item, check the description and seller details, choose Buy Now (or make an offer where available), then review the total and payment options at checkout. Track any completed order from your dashboard."},
    {q:"What should I check before buying?",a:"Review all photos, condition notes, delivery or collection terms, seller information and the final checkout total. Ask the seller a question through Bazunk messages if anything is unclear."},
    {q:"What should I do if my parcel does not arrive?",a:"Check your order status and tracking details first. Contact the seller through your order and, if unresolved, use the dispute or support options available in your dashboard. Keep your order reference and correspondence."}
  ],
  Selling: [
    {q:"How do I choose between direct sale, auction and classifieds?",a:"Use Direct Sale for a fixed price, Auctions for competitive timed bids, and Classifieds for contact-based local advertisements. Classified transactions arranged outside Bazunk checkout do not receive checkout-based Buyer Protection."},
    {q:"How do I create a storefront?",a:"Open Dashboard → Store → My Store. Add your store name, description and branding, then save your settings. Manage eligible listings through the seller tools in your dashboard."},
    {q:"How do I add good listing photos?",a:"Use bright, clear images of the actual item, show all sides and any defects, and avoid misleading stock photos. Check the upload limits shown on the listing form."}
  ],
  Auctions: [
    {q:"What happens when an auction ends?",a:"The auction closes when its timer expires. Check the auction details and your notifications for the outcome, any reserve requirements and the next payment or fulfilment steps."},
    {q:"Can I change an auction after bids are placed?",a:"Editing may be restricted once bidding starts. Review the available controls on your auction and contact support before making changes that could affect bidders."}
  ],
  "Returns & Refunds": [
    {q:"How do I report an item that arrived damaged?",a:"Photograph the packaging and damage, retain the item and contact the seller through your order. If needed, open a return or dispute through your dashboard and provide the evidence requested."},
    {q:"Does a change-of-mind return have the same rules as a faulty item?",a:"Not necessarily. Your rights and return options depend on the seller type, the item, applicable law and the reason for return. Review the listing terms and the returns policy before sending anything back."}
  ],
  "Account & Security": [
    {q:"How do I spot a scam or suspicious message?",a:"Be wary of requests to pay outside Bazunk, share one-time security codes or follow unusual links. Keep messages on the platform, report suspicious activity and contact support if you think your account is at risk."},
    {q:"How do I contact Bazunk about my personal data?",a:"Use the contact or support options and describe your privacy request. You can also review the Privacy Policy for information about your data rights and how requests are handled."}
  ],
  "Messages & Offers": [
    {q:"Where can I see my conversations?",a:"Open your dashboard and go to Messages. Select a conversation to review its history and reply."},
    {q:"What if a seller asks me to pay outside Bazunk?",a:"Do not send payment outside the supported checkout flow for a marketplace order. Report the request and contact support if you need help."}
  ],
  "Credits & Payments": [
    {q:"Where can I see my credits and transactions?",a:"Open Dashboard → Credits to view your current balance and the available credit or promotional features. Check the applicable terms before buying or spending credits."},
    {q:"Why is my payment not going through?",a:"Check your payment details and any bank authentication request, then retry if appropriate. If the problem persists, contact support with the order reference, but never send full card details."}
  ],
  "Bundles & Deals": [
    {q:"How do I post a classified ad?",a:"Open Sell → Classified Ads and select the appropriate category. Add an accurate description, location and photos, then submit your advert. Arrange contact and collection safely."},
    {q:"How do I stay safe when collecting a classified item?",a:"Agree on the details in advance, meet in a safe public place where practical, inspect the item before paying and avoid sending deposits to unknown people."}
  ],
  "Flash Sales": [{q:"How can I find active Flash Sales?",a:"Open Flash Sales from the main navigation. Check the displayed price, end time and item terms before purchasing."}],
  "Live Shopping": [{q:"How do I find a live selling event?",a:"Open Live from the navigation to see available streams or events. Features and availability can vary by seller and marketplace settings."}]
};
const ICONS: Record<string, typeof ShoppingBag> = {
  Buying: ShoppingBag, Selling: Tag, Auctions: Gavel, "Flash Sales": Zap,
  "Live Shopping": Radio, "Bundles & Deals": Layers, "Returns & Refunds": RotateCcw,
  "Credits & Payments": CreditCard, "Account & Security": Shield, "Messages & Offers": MessageSquare
};
const POPULAR = [
  {label:"Track my order",category:"Buying",query:"Can I track my order?",icon:Truck},
  {label:"Request a return or refund",category:"Returns & Refunds",query:"How do I open a return request?",icon:RotateCcw},
  {label:"Payment methods",category:"Buying",query:"What payment methods are accepted?",icon:CreditCard},
  {label:"Boost my listings",category:"Credits & Payments",query:"What can I spend Credits on?",icon:Sparkles},
  {label:"Open a store",category:"Selling",query:"How do I create a storefront?",icon:Store},
  {label:"Earn and use credits",category:"Credits & Payments",query:"What are Bazunk Credits?",icon:Coins}
];
export function SupportPage() {
  const settings = useRawSettings();
  const chatEnabled = useFeature("chatwoot_support");
  const categories = CATEGORIES.filter((c:any) => !c.feature || isFeatureEnabled(settings,c.feature));
  const [category,setCategory] = useState("Buying");
  const [search,setSearch] = useState("");
  const [expanded,setExpanded] = useState<string[]>([]);
  const [searched,setSearched] = useState(false);
  const faqVisible = (faq:{q:string;a:string}) => {
    const t=(faq.q+" "+faq.a).toLowerCase();
    const refs:[string,string[]][]=[
      ["live",["live shopping","live stream","going live","go live"]],
      ["auctions",["auction","bid"]],
      ["flash_sales",["flash sale"]],
      ["classifieds",["classified"]],
      ["offers",["make an offer","offers","auto-accept"]],
      ["buyer_protection",["buyer protection"]],
      ["credits",["bazunk credits","credits"]]
    ];
    return refs.every(([feature,words])=>isFeatureEnabled(settings,feature)||!words.some(w=>t.includes(w)));
  };
  const all = useMemo(()=>categories.flatMap(c=>[...c.faqs,...(EXTRA_FAQS[c.label]||[])].filter(faqVisible).map(f=>({...f,category:c.label}))),[categories.map(c=>c.label).join("|"),settings]);
  const active = categories.some(c=>c.label===category)?category:(categories[0]?.label||"Buying");
  const results = all.filter(f=>search.trim()?((f.q+" "+f.a+" "+f.category).toLowerCase().includes(search.trim().toLowerCase())):f.category===active);
    const toggle=(id:string)=>setExpanded(prev=>prev.includes(id)?[]:[id]);
  const choose=(cat:string,q?:string)=>{setCategory(cat);setSearch("");setSearched(false);setExpanded(q?[cat+":"+q]:[]);document.getElementById("support-faq")?.scrollIntoView({behavior:"smooth",block:"start"});};
  return <div className="bazunk-support-page min-h-screen bg-[#f1f5ff] text-[#102447] flex flex-col">
    <Navbar/>
    <main className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-5 flex-1">
      <div className="text-xs font-semibold text-[#45607e] mb-3"><Link href="/">Home</Link><span className="mx-2">›</span>Support Centre</div>
      <section className="relative overflow-hidden rounded-[24px] border border-[#d6dff7] bg-gradient-to-r from-[#e0ebff] via-[#f1edff] to-[#ffe3d7] p-6 sm:p-9 shadow-sm">
        <div className="relative z-10 max-w-[800px]">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0d2448]">Support <span className="text-[#f36b13]">Centre</span></h1>
          <p className="mt-2 mb-5 text-sm sm:text-base text-[#344969]">Find answers, get help and manage support requests for buying, selling and your account.</p>
          <form onSubmit={e=>{e.preventDefault();setSearched(true);document.getElementById("support-faq")?.scrollIntoView({behavior:"smooth"});}} className="flex items-center rounded-2xl bg-white border border-[#b8c9e5] p-1.5 shadow-md gap-2">
            <Search size={21} className="ml-3 shrink-0 text-[#24486e]"/>
            <input aria-label="Search help articles" value={search} onChange={e=>{setSearch(e.target.value);setSearched(false);setExpanded([])}} placeholder='Search help (e.g. "refunds", "list an item", "payments")' className="min-w-0 flex-1 py-2 px-1 text-sm bg-transparent text-[#102447] placeholder:text-[#61718b] outline-none"/>
            <button type="submit" className="rounded-xl bg-gradient-to-r from-[#ff9900] to-[#ff6100] px-5 sm:px-7 py-2.5 text-sm font-bold text-white hover:brightness-105">Search</button>
          </form>
        </div>
        <div aria-hidden="true" className="hidden lg:flex absolute right-12 top-5 items-center justify-center w-44 h-36 text-7xl drop-shadow-lg">🎧💬</div>
      </section>
      <div id="support-topics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2 mt-3 mb-4">
        {categories.map(cat=>{const Icon=ICONS[cat.label]||HelpCircle;const selected=!search&&active===cat.label;return <button key={cat.label} type="button" onClick={()=>choose(cat.label)} className={`min-h-[78px] rounded-xl border p-2 flex flex-col justify-center items-center gap-1.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected?"border-[#ff7700] bg-[#fff3e9] ring-1 ring-[#ff7700]":"border-[#c8d6ee] bg-white hover:border-[#ff9900]"}`}>
          <Icon size={24} strokeWidth={2.4} className={selected?"text-[#f36b13]":"text-[#365cce]"}/><span className="text-xs font-extrabold text-[#11264b]">{cat.label}</span><span className="text-[11px] text-[#5a6d8b]">{[...cat.faqs,...(EXTRA_FAQS[cat.label]||[])].filter(faqVisible).length} articles</span>
        </button>})}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_315px] gap-4 items-start">
        <section id="support-faq" className="bg-white border border-[#cbd9ee] shadow-sm rounded-2xl overflow-hidden scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#dbe5f5] bg-[#f7faff]">
            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-black text-[#102447]"><span className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center"><HelpCircle size={23}/></span>{search?"Search Results":"Frequently Asked Questions"}</h2>
            <div className="flex gap-3 text-xs font-bold">
              <button type="button" onClick={()=>setExpanded(results.map(f=>f.category+":"+f.q))} className="inline-flex items-center gap-1 text-[#27476d] hover:text-[#ea580c]"><ChevronsUpDown size={16}/> Expand All</button>
              <button type="button" onClick={()=>setExpanded([])} className="inline-flex items-center gap-1 text-[#27476d] hover:text-[#ea580c]"><ChevronsDownUp size={16}/> Collapse All</button>
            </div>
          </div>
          {search&&<p className="px-4 pt-3 text-xs text-[#506681]">{results.length} matching {results.length===1?"answer":"answers"} for “{search}” <button onClick={()=>{setSearch("");setSearched(false)}} className="ml-2 font-bold text-[#e45b0b] underline">Clear search</button></p>}
          {results.length===0?<div className="p-10 text-center"><Search size={32} className="mx-auto text-[#8295b0]"/><p className="font-bold mt-3">No matching answers found</p><p className="text-sm mt-2 text-[#536987]">Try another keyword or contact our support team.</p></div>:<div className="p-2 sm:p-3 space-y-1.5">
            {results.map((faq,i)=>{const id=faq.category+":"+faq.q;const open=expanded.includes(id);const Icon=ICONS[faq.category]||HelpCircle;return <div key={id} className={`border rounded-lg overflow-hidden ${open?"border-[#ff8c31] bg-[#fffaf5]":"border-[#cbd9ee] bg-[#f9fbff]"}`}>
              <button type="button" aria-expanded={open} onClick={()=>toggle(id)} className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 hover:bg-[#f0f5ff]">
                <span className="h-8 w-8 rounded-lg bg-[#eaf0ff] flex items-center justify-center shrink-0"><Icon size={18} className="text-[#365cce]"/></span><span className="font-bold text-[13px] sm:text-sm text-[#12264b] flex-1">{faq.q}</span><ChevronDown size={17} className={`text-[#284a71] shrink-0 transition-transform ${open?"rotate-180":""}`}/>
              </button>
              {open&&<div className="px-3 pb-3 pt-1 sm:pl-[54px] text-[13px] text-[#334763] leading-relaxed border-t border-[#e1e8f4]">{faq.a}{faq.q==="How do I buy an item on Bazunk?"&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">{[{icon:Search,title:"Find an item",desc:"Search or browse"},{icon:ShoppingBag,title:"Choose an option",desc:"Buy, offer or bid"},{icon:CreditCard,title:"Pay securely",desc:"Review checkout"},{icon:Truck,title:"Track your order",desc:"Follow order updates"}].map((step,j)=>{const S=step.icon;return <div key={j} className="rounded-xl border border-[#f8c7a4] bg-white p-3 text-center"><S size={24} className="mx-auto text-[#ff7300]"/><div className="font-extrabold text-xs mt-2">{j+1}. {step.title}</div><div className="text-[11px] mt-1">{step.desc}</div></div>})}</div>}</div>}
            </div>})}
          </div>}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white border border-[#cbd9ee] shadow-sm p-4">
            <div className="flex gap-3 items-start"><Headphones size={36} className="text-[#f97316] shrink-0"/><div><h3 className="font-black text-lg text-[#102447]">Need more help?</h3><p className="text-xs text-[#465c7a] mt-1">Get help with orders, listings, payments and more.</p></div></div>
            <Link href="/dashboard?section=support-tickets" className="mt-4 flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff9900] to-[#ff6200] text-white font-bold py-3 text-sm"><MessageSquare size={17}/> Open a Support Ticket <ArrowRight size={17}/></Link>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {chatEnabled?<button type="button" onClick={openChatwootSupport} className="rounded-xl border border-[#c5d5eb] bg-[#f5f8ff] text-[#183458] py-2.5 text-xs font-bold flex items-center justify-center gap-1"><MessageSquare size={16}/> Live Chat</button>:<Link href="/dashboard?section=support-tickets" className="rounded-xl border border-[#c5d5eb] bg-[#f5f8ff] text-[#183458] py-2.5 text-xs font-bold flex items-center justify-center gap-1"><MessageSquare size={16}/> Tickets</Link>}
              <Link href="/contact" className="rounded-xl border border-[#c5d5eb] bg-[#f5f8ff] text-[#183458] py-2.5 text-xs font-bold flex items-center justify-center gap-1"><Mail size={16}/> Contact</Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-[#cbd9ee] shadow-sm p-4">
            <h3 className="font-black text-[#102447] flex items-center gap-2 mb-3"><Zap size={20} className="text-[#ff7300]"/> Popular Help Topics</h3>
            {POPULAR.filter(p=>categories.some(c=>c.label===p.category)&&all.some(f=>f.q===p.query&&f.category===p.category)).map(p=>{const Icon=p.icon;return <button key={p.label} type="button" onClick={()=>choose(p.category,p.query)} className="w-full flex gap-2 items-center border-t border-[#e1e8f4] py-2.5 text-left text-xs font-semibold text-[#223b5e] hover:text-[#e85c00]"><Icon size={17}/><span className="flex-1">{p.label}</span><ArrowRight size={15}/></button>})}
          </div>
          <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-[#2f61e6] via-[#7145dc] to-[#fa7b67] shadow-sm">
            <h3 className="text-xl font-black flex items-center gap-2"><Sparkles size={23}/> New to Bazunk?</h3>
            <p className="text-sm mt-2 text-white">Start with the essentials for buyers and sellers.</p>
            <button type="button" onClick={()=>choose("Buying","How do I buy an item on Bazunk?")} className="mt-4 w-full rounded-full bg-white text-[#233c77] font-extrabold py-2.5 text-sm">View Getting Started Guide →</button>
          </div>
        </aside>
      </div>
      <AdSlot slotKey="support_mid"/>
    </main>
    <Footer/>
  </div>;
}
