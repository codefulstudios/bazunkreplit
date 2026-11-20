import {Home,Search,ShoppingCart,User,Heart,Package,Store,Menu,Star,Bell,MessageCircle,Mail,Globe,Grid2X2,Facebook,Instagram,Youtube,Twitter,ShieldCheck} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {HOME_SECTIONS_DEFAULT_JSON,SECTION_CONTENT_DEFAULT_JSON} from "./homepageSections";

export const ICON_CHOICES={
 home:Home,search:Search,cart:ShoppingCart,account:User,heart:Heart,
 package:Package,store:Store,menu:Menu,star:Star,bell:Bell,
 message:MessageCircle,mail:Mail,globe:Globe,categories:Grid2X2,
 facebook:Facebook,instagram:Instagram,youtube:Youtube,twitter:Twitter,shield:ShieldCheck
} satisfies Record<string,LucideIcon>;
export type IconChoice=keyof typeof ICON_CHOICES;
export const ICON_PLACEMENTS=[
 {key:"header_home",label:"Header home",area:"Header",default:"home"},
 {key:"header_search",label:"Header search",area:"Header",default:"search"},
 {key:"header_cart",label:"Header basket",area:"Header",default:"cart"},
 {key:"header_account",label:"Account icon",area:"Header",default:"account"},
 {key:"footer_facebook",label:"Facebook icon",area:"Footer",default:"facebook"},
 {key:"footer_twitter",label:"X / Twitter icon",area:"Footer",default:"twitter"},
 {key:"footer_instagram",label:"Instagram icon",area:"Footer",default:"instagram"},
 {key:"footer_youtube",label:"YouTube icon",area:"Footer",default:"youtube"},
] as const;
export type IconPlacement=(typeof ICON_PLACEMENTS)[number]["key"];
export type IconOverrides=Record<IconPlacement,IconChoice>;
export const DEFAULT_ICON_OVERRIDES=Object.fromEntries(ICON_PLACEMENTS.map(x=>[x.key,x.default])) as IconOverrides;
export function parseIconOverrides(source:unknown):IconOverrides{
 try{
  const value=typeof source==="string"?JSON.parse(source):source;
  if(!value||typeof value!=="object"||Array.isArray(value))return {...DEFAULT_ICON_OVERRIDES};
  const keys=Object.keys(DEFAULT_ICON_OVERRIDES);
  if(keys.some(key=>!Object.hasOwn(value,key)||!(value[key] in ICON_CHOICES)))return {...DEFAULT_ICON_OVERRIDES};
  return Object.fromEntries(keys.map(key=>[key,value[key]])) as IconOverrides;
 }catch{return {...DEFAULT_ICON_OVERRIDES}}
}
export function iconForPlacement(config:IconOverrides,placement:IconPlacement):LucideIcon{
 return ICON_CHOICES[config[placement]]||ICON_CHOICES[DEFAULT_ICON_OVERRIDES[placement]];
}
export const THEME_CENTER_DEFAULTS={
 site_name:"Bazunk",site_tagline:"Buy and sell anything, locally.",
 site_logo_url:"",site_favicon_url:"",hero_image_url:"",seo_og_image_url:"",
 visual_elements_v1:"[]",home_sections_layout:HOME_SECTIONS_DEFAULT_JSON,home_sections_content:SECTION_CONTENT_DEFAULT_JSON,
 hero_title:"Buy, Make an Offer & List for Free!",
 hero_subtitle:"The smarter way to buy and sell — fixed prices, open offers, and free listings.",
 hero_cta_primary:"Start Shopping",hero_cta_secondary:"Become a Seller",
 footer_about:"Buy, Sell, and Save More.",footer_copyright:"Bazunk Marketplace",
 footer_facebook:"#",footer_twitter:"#",footer_instagram:"#",footer_youtube:"#",
 announcement_enabled:"false",announcement_text:"Welcome to Bazunk — buy and sell anything locally!",
 announcement_color:"#1769ff",
 categories_title:"Shop by Category",categories_subtitle:"Browse categories across Bazunk",
 features_title:"Why Bazunk?",features_subtitle:"A marketplace built around trust",
 header_search_placeholder:"Search listings...",
 seo_title:"Bazunk - Buy & Sell Anything Locally",
 seo_description:"The smarter way to buy and sell locally. Free listings, secure checkout, real reviews.",
 icon_overrides:JSON.stringify(DEFAULT_ICON_OVERRIDES),
} as const;
export type DesignFields=Record<keyof typeof THEME_CENTER_DEFAULTS,string>;
export const DESIGN_FIELDS=Object.keys(THEME_CENTER_DEFAULTS) as (keyof DesignFields)[];
