import { ShoppingBag, Rocket, Tag, ShoppingCart, Sparkles, Package } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
export const LOADER_VARIANTS = [
 {id:"logo",label:"Spinning Bazunk B"},
 {id:"rocket",label:"Rocket Orbit"},
 {id:"bag",label:"Shopping Bag"},
 {id:"tag",label:"Price Tag Pulse"},
 {id:"cart",label:"Cart Glow"},
 {id:"mark",label:"Minimal Mark"},
] as const;
export const LOADER_AREAS = [
 {id:"homepage",label:"Homepage listings"},
 {id:"browse",label:"Browse/search results"},
 {id:"categories",label:"Categories"},
 {id:"listing",label:"Listing details"},
 {id:"auctions",label:"Auction listings"},
 {id:"flash",label:"Flash sale listings"},
 {id:"seller",label:"Seller profiles"},
] as const;
export function MarketplaceLoader({area="homepage",label="Loading listings…",variantOverride}:{area?:string;label?:string;variantOverride?:string}) {
 const config=useRawSettings();
 const variant=LOADER_VARIANTS.find(v=>v.id===(variantOverride||config.marketplace_loader_variant))?.id||"logo";
 const enabled=config[`marketplace_loader_area_${area}`]!=="false";
 if(!enabled)return <div role="status" className="py-8 text-center text-base text-slate-700 dark:text-slate-200">{label}</div>;
 const Icon=({rocket:Rocket,bag:ShoppingBag,tag:Tag,cart:ShoppingCart,mark:Sparkles,logo:Package} as const)[variant];
 return <div role="status" aria-label={label} className="flex flex-col items-center justify-center gap-3 py-8">
   <div className={`bz-loader bz-loader--${variant}`} aria-hidden="true">
     <span className="bz-loader-ring"/>
     <span className="bz-loader-inner">{variant==="logo"?<b className="text-4xl font-bold">B</b>:<Icon size={36} strokeWidth={2.4}/>}</span>
     {variant==="rocket"&&<i className="bz-loader-orbit"/>}
   </div>
   <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
 </div>;
}
