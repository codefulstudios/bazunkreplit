import { Link } from "wouter";
import { Zap, ShoppingBag, Handshake, Gamepad2, ArrowRight } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled } from "@/components/FeatureGate";

const promotions = [
  {title:"Shop the marketplace",description:"Discover great finds from independent sellers.",icon:ShoppingBag,href:"/browse",flag:""},
  {title:"Flash Sales",description:"Explore limited-time deals.",icon:Zap,href:"/flash-sales",flag:"flash_sales"},
  {title:"Make an Offer",description:"Find something you love and negotiate.",icon:Handshake,href:"/browse",flag:"offers"},
  {title:"Rewards Arcade",description:"Play daily games and earn credits.",icon:Gamepad2,href:"/rewards",flag:"games"},
];
export function HomepagePromoCards() {
  const settings=useRawSettings();
  const visible=promotions.filter(p=>!p.flag || isFeatureEnabled(settings,p.flag));
  const primary=visible[0];
  const secondary=visible.slice(1);
  return <section className="bg-slate-50 dark:bg-slate-950 py-7 border-b border-slate-200 dark:border-slate-800" aria-label="Explore Bazunk">
    <div className="max-w-6xl mx-auto px-4 grid gap-3 lg:grid-cols-[1.35fr_2fr]">
      <Link href={primary.href} className="group flex flex-col justify-between gap-5 rounded-2xl bg-[#17253C] p-6 text-white min-h-[180px] hover:bg-[#203653] transition-colors">
        <div><div className="flex items-center gap-2 text-sm font-semibold text-orange-300"><primary.icon className="w-5 h-5"/> Featured</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{primary.title}</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-200">{primary.description}</p></div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">Start shopping <ArrowRight className="w-4 h-4"/></span>
      </Link>
      <div className="grid gap-3 sm:grid-cols-3">
        {secondary.map(({title,description,icon:Icon,href})=><Link key={title} href={href} className="group flex min-h-[160px] flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-sm transition-all">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-slate-800 text-orange-700 dark:text-orange-300"><Icon className="h-5 w-5"/></div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
          <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-700 dark:text-orange-300">Explore <ArrowRight className="h-4 w-4"/></span>
        </Link>)}
      </div>
    </div>
  </section>;
}
