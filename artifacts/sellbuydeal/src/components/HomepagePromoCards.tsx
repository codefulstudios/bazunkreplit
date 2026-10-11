import { Link } from "wouter";
import { Zap, Gavel, Handshake, Gamepad2, ArrowRight } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled } from "@/components/FeatureGate";

const promotions = [
 {title:"Flash Sales",description:"Time-limited deals. Grab them before they're gone.",icon:Zap,emoji:"💥",gradient:"from-fuchsia-800 via-rose-700 to-orange-600",href:"/flash-sales",flag:"flash_sales"},
 {title:"Live Auctions",description:"Bid on real items in real time.",icon:Gavel,emoji:"🔨",gradient:"from-blue-900 via-indigo-700 to-blue-500",href:"/auctions",flag:"auctions"},
 {title:"Make an Offer",description:"Negotiate directly with sellers.",icon:Handshake,emoji:"🤝",gradient:"from-blue-800 via-cyan-700 to-sky-500",href:"/browse",flag:"offers"},
 {title:"Rewards Arcade",description:"Play daily games and earn Bazunk credits.",icon:Gamepad2,emoji:"🎮",gradient:"from-violet-900 via-purple-700 to-fuchsia-600",href:"/rewards",flag:"rewards"},
];
export function HomepagePromoCards() {
 const settings=useRawSettings();
 return <section className="bg-[#08182e] py-4"><div className="max-w-6xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
 {promotions.filter(p=>isFeatureEnabled(settings,p.flag)).map(({title,description,icon:Icon,emoji,gradient,href})=><Link key={title} href={href} className={`group relative min-h-[130px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-4 text-white hover:brightness-110 transition-all`}>
 <div className="relative z-10 max-w-[77%]"><h3 className="font-black text-sm sm:text-base flex items-center gap-1.5"><Icon className="w-4 h-4 shrink-0"/>{title}</h3><p className="text-xs mt-1 text-white/85 leading-snug">{description}</p><span className="inline-flex gap-1 items-center text-xs font-black mt-3 bg-white/20 px-3 py-1.5 rounded-lg">Explore <ArrowRight className="w-3 h-3"/></span></div>
 <span aria-hidden="true" className="absolute right-1 bottom-2 text-5xl sm:text-6xl drop-shadow-xl group-hover:scale-110 transition-transform">{emoji}</span>
 </Link>)}
 </div></section>;
}
