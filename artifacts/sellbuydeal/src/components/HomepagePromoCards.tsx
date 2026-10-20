import { Link } from "wouter";
import { Zap, ShoppingBag, Handshake, Gamepad2, ArrowRight } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import {useTheme} from "next-themes";
import {readSection,sectionStyle} from "@/design-system/sectionAppearance";
import {readIconAppearance,iconStyle} from "@/design-system/iconAppearance";
import { isFeatureEnabled } from "@/components/FeatureGate";

const promotions = [
  {title:"Shop the marketplace",description:"Discover great finds from independent sellers.",icon:ShoppingBag,href:"/browse",flag:""},
  {title:"Flash Sales",description:"Explore limited-time deals.",icon:Zap,href:"/flash-sales",flag:"flash_sales"},
  {title:"Make an Offer",description:"Find something you love and negotiate.",icon:Handshake,href:"/browse",flag:"offers"},
  {title:"Rewards Arcade",description:"Play daily games and earn credits.",icon:Gamepad2,href:"/rewards",flag:"games"},
];
export function HomepagePromoCards() {
  const settings=useRawSettings();
  const {resolvedTheme}=useTheme();
  const design=readSection(settings,"home_promos",resolvedTheme==="dark"?"dark":"light");
  const icons=readIconAppearance(settings,"promos",resolvedTheme==="dark"?"dark":"light");
  const order = (settings.homepage_promotion_order || "shop,flash,offer,rewards").split(",");
  const keys = ["shop","flash","offer","rewards"];
  const visible = promotions.filter((item,i) => (!item.flag || isFeatureEnabled(settings,item.flag)) && settings[`homepage_promotion_${keys[i]}_visible`] !== "false").sort((x,y) => order.indexOf(keys[promotions.indexOf(x)]) - order.indexOf(keys[promotions.indexOf(y)]));
  const primary=visible[0];
  const secondary=visible.slice(1);
  if (!primary) return null;
  return <section data-design-home-promos={design?"true":"false"} data-design-icons={icons?"true":"false"} style={{...sectionStyle(design),...iconStyle(icons)}} className="bz-design-home-promos bg-slate-50 dark:bg-slate-950 py-7 border-b border-slate-200 dark:border-slate-800" aria-label="Explore Bazunk">
    <div className="max-w-6xl mx-auto px-4 grid gap-3 lg:grid-cols-[1.35fr_2fr]">
      <Link href={primary.href} className="bz-design-promo-card group flex flex-col justify-between gap-5 rounded-2xl p-6 min-h-[180px] transition-all hover:shadow-lg" style={{backgroundColor:"#17253C",color:"#FFFFFF"}}>
        <div><div className="flex items-center gap-2 text-sm font-semibold" style={{color:"#FDBA74"}}><primary.icon className="w-5 h-5"/> Featured</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight" style={{color:"#FFFFFF"}}>{primary.title}</h2>
          <p className="mt-2 text-base leading-relaxed" style={{color:"#E2E8F0"}}>{primary.description}</p></div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{color:"#FFFFFF"}}>Start shopping <ArrowRight className="w-4 h-4"/></span>
      </Link>
      <div className="grid gap-3 sm:grid-cols-3">
        {secondary.map(({title,description,icon:Icon,href})=><Link key={title} href={href} className="bz-design-promo-card group flex min-h-[160px] flex-col rounded-2xl border p-5 hover:shadow-md hover:border-orange-400 transition-all" style={{backgroundColor:"#1D2C44",borderColor:"#64748B",color:"#FFFFFF"}}>
          <div className="bz-design-promo-icon mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{backgroundColor:"#35445B",color:"#FDBA74"}}><Icon className="h-5 w-5"/></div>
          <h3 className="text-lg font-semibold" style={{color:"#FFFFFF"}}>{title}</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{color:"#E2E8F0"}}>{description}</p>
          <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{color:"#FDBA74"}}>Explore <ArrowRight className="h-4 w-4"/></span>
        </Link>)}
      </div>
    </div>
  </section>;
}
