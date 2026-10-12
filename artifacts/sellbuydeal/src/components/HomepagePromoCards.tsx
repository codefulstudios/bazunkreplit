import { Link } from "wouter";
import { Zap, ShoppingBag, Handshake, Gamepad2, ArrowRight } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled } from "@/components/FeatureGate";

const promotions = [
 {title:"Flash Sales",description:"Limited-time deals. Grab them before they're gone.",icon:Zap,emoji:"⚡",gradient:"from-[#a41148] via-[#ca174e] to-[#ed5322]",href:"/flash-sales",flag:"flash_sales"},
 {title:"Direct Sale",description:"Shop thousands of items at a fixed price.",icon:ShoppingBag,emoji:"🛍️",gradient:"from-[#1242b0] via-[#155fc7] to-[#087bb7]",href:"/browse",flag:""},
 {title:"Make an Offer",description:"Negotiate directly with sellers.",icon:Handshake,emoji:"🤝",gradient:"from-[#075e70] via-[#087b8c] to-[#099da2]",href:"/browse",flag:"offers"},
 {title:"Rewards Arcade",description:"Play daily games and earn Bazunk credits.",icon:Gamepad2,emoji:"🎮",gradient:"from-[#6120a4] via-[#8228bb] to-[#a52cba]",href:"/rewards",flag:"games"},
];
export function HomepagePromoCards() {
 const settings=useRawSettings();
 return <section className="bg-[#08182e] py-4"><div className="max-w-6xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
 {promotions.filter(p=>!p.flag || isFeatureEnabled(settings,p.flag)).map(({title,description,icon:Icon,emoji,gradient,href})=><Link key={title} href={href} className={`group relative min-h-[152px] overflow-hidden rounded-2xl border border-white/30 shadow-lg shadow-black/25 bg-gradient-to-br ${gradient} p-5 text-white hover:brightness-110 transition-all`}>
 <div className="relative z-10 max-w-[82%]"><h3 className="font-black text-base sm:text-lg flex items-center gap-1.5"><Icon className="w-4 h-4 shrink-0"/>{title}</h3><p className="text-[13px] mt-2 font-semibold text-white leading-snug">{description}</p><span className="relative z-20 inline-flex gap-2 items-center text-sm font-black mt-4 !bg-white !text-[#0f172a] border-2 border-white px-4 py-2.5 rounded-xl shadow-lg group-hover:!bg-yellow-300 group-hover:!text-[#0f172a] group-focus-visible:ring-4 group-focus-visible:ring-yellow-300 transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>Explore <ArrowRight className="w-3 h-3"/></span></div>
 <span aria-hidden="true" className="absolute right-2 bottom-3 text-5xl sm:text-6xl drop-shadow-xl group-hover:scale-110 transition-transform">{emoji}</span>
 </Link>)}
 </div></section>;
}
