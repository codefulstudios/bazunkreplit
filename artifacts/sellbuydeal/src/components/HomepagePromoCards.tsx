import { Link } from "wouter";
import { Zap, ShoppingBag, Handshake, Gamepad2, ArrowRight } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import {useTheme} from "next-themes";
import {readSection,sectionStyle} from "@/design-system/sectionAppearance";
import {readIconAppearance,iconStyle} from "@/design-system/iconAppearance";
import {parseSectionContent} from "@/design-system/homepageSections";
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
  const customCards=parseSectionContent(settings.home_sections_content).promos.cards;
  const media=(path?:string)=>path&&/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(path)?(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"")+path:"";
  const configured=promotions.map((item,index)=>({...item,title:customCards?.[index]?.title||item.title,description:customCards?.[index]?.description||item.description,image:media(customCards?.[index]?.image),background:customCards?.[index]?.background||"",textColor:customCards?.[index]?.textColor||"",href:customCards?.[index]?.url?.startsWith("/")&&!customCards[index].url.startsWith("//")?customCards[index].url:item.href}));
  const order = (settings.homepage_promotion_order || "shop,flash,offer,rewards").split(",");
  const keys = ["shop","flash","offer","rewards"];
  const visible = configured.filter((item,i) => (!item.flag || isFeatureEnabled(settings,item.flag)) && settings[`homepage_promotion_${keys[i]}_visible`] !== "false").sort((x,y) => order.indexOf(keys[configured.indexOf(x)]) - order.indexOf(keys[configured.indexOf(y)]));
  const primary=visible[0];
  const secondary=visible.slice(1);
  if (!primary) return null;
  return <section data-design-home-promos={design?"true":"false"} data-design-icons={icons?"true":"false"} style={{...sectionStyle(design),...iconStyle(icons)}} className="bz-design-home-promos bz-premium-promos" aria-label="Explore Bazunk">
    <div className="bz-premium-promo-grid">
      <Link href={primary.href} className="bz-premium-promo bz-premium-promo-featured group">
        <div className="bz-premium-promo-content">
          <span className="bz-premium-feature-label"><ShoppingBag size={17}/> Featured</span>
          <h2 data-theme-section="promos" data-theme-card={configured.indexOf(primary)} data-theme-card-field="title">{primary.title}</h2>
          <p data-theme-section="promos" data-theme-card={configured.indexOf(primary)} data-theme-card-field="description">{primary.description}</p>
          <span className="bz-premium-cta">Start shopping <ArrowRight size={18}/></span>
        </div>
        {primary.image?<img src={primary.image} alt="" className="bz-premium-promo-photo"/>:<div className="bz-premium-bag-art" aria-hidden="true"><span className="bz-premium-bag-handles"/><ShoppingBag/><span>B</span></div>}
      </Link>
      {secondary.map((item,index)=><Link key={item.title} href={item.href} className={"bz-premium-promo bz-premium-promo-secondary bz-premium-promo-"+index+" group"}>
        {item.image?<img src={item.image} alt="" className="bz-premium-promo-photo"/>:<div className="bz-premium-promo-decor" aria-hidden="true"><item.icon/></div><div className="bz-premium-promo-orb" aria-hidden="true"><item.icon/></div>}
        <div className="bz-premium-promo-content">
          <span className="bz-premium-promo-icon"><item.icon size={27}/></span>
          <h3 data-theme-section="promos" data-theme-card={configured.indexOf(item)} data-theme-card-field="title">{item.title}</h3>
          <p data-theme-section="promos" data-theme-card={configured.indexOf(item)} data-theme-card-field="description">{item.description}</p>
          <span className="bz-premium-cta">Explore <ArrowRight size={17}/></span>
        </div>
      </Link>)}
    </div>
  </section>;
}
