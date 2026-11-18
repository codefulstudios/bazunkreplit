import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Boxes, ChevronRight, CircleHelp, Coins, Film, Database, Flame, Gavel, Gift, Grid2X2, Handshake, Heart, Layers, LifeBuoy, Package, Radio, Rocket, Search, ShieldCheck, ShoppingCart, Sparkles, Store, Tag, TrendingUp, Truck, Users, Wrench, X, Zap } from "lucide-react";

type ModalKind = "more" | "sell";
type Tile = { title:string; subtitle:string; href:string; icon:typeof Tag; tone:string };
const moreTiles:Tile[] = [
 {title:"Deals",subtitle:"Today's top offers",href:"/deals",icon:TrendingUp,tone:"pink"},
 {title:"Rewards",subtitle:"Earn credits & perks",href:"/rewards",icon:Gift,tone:"gold"},
 {title:"My Store",subtitle:"Manage your listings",href:"/dashboard?section=listings",icon:Store,tone:"blue"},
 {title:"Live Shopping",subtitle:"Watch, shop & interact",href:"/live",icon:Radio,tone:"purple"},
 {title:"Bundle Deals",subtitle:"Save when you buy multiple items",href:"/bundle",icon:Tag,tone:"peach"},
 {title:"Import Listings",subtitle:"Bring products from other marketplaces",href:"/importers",icon:Package,tone:"cyan"},
 {title:"Support",subtitle:"FAQs, guides & contact",href:"/support",icon:LifeBuoy,tone:"blue"},
 {title:"Promotional Videos",subtitle:"Explore Bazunk video promotions",href:"/videos",icon:Film,tone:"purple"},
 {title:"Data Platform",subtitle:"Product data, search & import tools",href:"https://data.bazunk.com",icon:Database,tone:"cyan"}
];
const sellTiles:Tile[] = [
 {title:"Quick Sell",subtitle:"List it now and sell at a fixed price",href:"/sell/quick",icon:Tag,tone:"gold"},
 {title:"Auction",subtitle:"Let buyers bid for the best price",href:"/auctions",icon:Gavel,tone:"purple"},
 {title:"Flash Sale",subtitle:"Get fast visibility and quick sales",href:"/flash-sales",icon:Zap,tone:"blue"},
 {title:"Live Selling",subtitle:"Sell in real time with live video",href:"/live",icon:Radio,tone:"green"}
];
const sellTools:Tile[] = [
 {title:"Create a Store",subtitle:"Build your own Bazunk shop",href:"/dashboard?section=store",icon:ShoppingCart,tone:"purple"},
 {title:"Sell in Bulk",subtitle:"List multiple items at once",href:"/importers",icon:Boxes,tone:"peach"},
 {title:"Promote Items",subtitle:"Boost visibility and get more views",href:"/promotions",icon:Rocket,tone:"gold"},
 {title:"Earn Credits",subtitle:"Use credits for boosts and features",href:"/rewards",icon:Coins,tone:"blue"}
];
const sellSide:Tile[] = [
 {title:"Start Selling",subtitle:"",href:"/sell",icon:Store,tone:"peach"},
 {title:"Selling Options",subtitle:"",href:"/sell",icon:Tag,tone:"blue"},
 {title:"Manage Listings",subtitle:"",href:"/dashboard?section=listings",icon:Grid2X2,tone:"blue"},
 {title:"Seller Tools",subtitle:"",href:"/promotions",icon:Wrench,tone:"gold"},
 {title:"Seller Support",subtitle:"",href:"/support",icon:CircleHelp,tone:"purple"}
];
export function HeaderMegaModals({kind,onClose}:{kind:ModalKind|null;onClose:()=>void}) {
 const [section,setSection]=useState("Start Selling");
 useEffect(()=>{if(!kind)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};document.addEventListener("keydown",onKey);const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=old}},[kind,onClose]);
 if(!kind)return null;
 const TileLink=({item,small=false}:{item:Tile;small?:boolean})=>{const Icon=item.icon;const content=<><Icon className="bz-mega-tile-icon"/><span className="bz-mega-tile-copy"><strong>{item.title}</strong>{item.subtitle&&<small>{item.subtitle}</small>}</span><ChevronRight className="bz-mega-chevron"/></>;const className=`bz-mega-tile bz-mega-${item.tone} ${small?"bz-mega-small":""}`;return item.href.startsWith("https://")?<a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={className}>{content}</a>:<Link href={item.href} onClick={onClose} className={className}>{content}</Link>};
 return <div className="bz-mega-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section role="dialog" aria-modal="true" aria-label={kind==="more"?"More on Bazunk":"Sell on Bazunk"} className={`bz-mega-panel ${kind==="sell"?"bz-mega-sell":""}`}>
   <button type="button" className="bz-mega-close" onClick={onClose} aria-label="Close menu"><X/></button>
   {kind==="more"?<>
    <header className="bz-mega-more-head"><Grid2X2 className="bz-mega-head-icon"/><div><h2>More on Bazunk</h2><p>Discover more ways to buy, sell and get rewarded</p></div></header>
    <div className="bz-mega-more-grid">{moreTiles.map(item=><TileLink key={item.title} item={item}/>)}</div>
   </>:<>
    <header className="bz-mega-sell-head"><div className="bz-mega-sell-art" aria-hidden="true"><Store/><Package/><TrendingUp/></div><div><h2>Sell on Bazunk</h2><p>Turn your items into cash, reach more buyers and grow your business with a marketplace that's fair, flexible and full of opportunities.</p><div className="bz-mega-checks">{["List for free","Reach thousands of buyers","Sell new or used","Get paid securely"].map(x=><span key={x}><BadgeCheck/>{x}</span>)}</div></div></header>
    <div className="bz-mega-sell-body"><aside className="bz-mega-sidebar">{sellSide.map(item=>{const Icon=item.icon;return <Link key={item.title} href={item.href} onClick={onClose} className={item.title===section?"selected":""}><Icon/>{item.title}<ChevronRight/></Link>})}<div className="bz-mega-verified"><BadgeCheck/><strong>Become a Verified Seller</strong><small>Build trust, get a badge and more exposure.</small><Link href="/dashboard?section=verification" onClick={onClose}>Get Verified <ArrowRight size={16}/></Link></div></aside>
    <div className="bz-mega-sell-main"><h3>Choose how you want to sell</h3><div className="bz-mega-sell-grid">{sellTiles.map(item=><TileLink key={item.title} item={item}/>)}</div><div className="bz-mega-tools-head"><h3>More selling options &amp; tools</h3><Link href="/sell" onClick={onClose}>View all seller tools <ArrowRight size={16}/></Link></div><div className="bz-mega-tools-grid">{sellTools.map(item=><TileLink key={item.title} item={item}/>)}</div></div></div>
   </>}
  </section>
 </div>;
}
