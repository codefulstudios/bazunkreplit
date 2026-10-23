/**
 * Homepage content order is saved as site_settings.home_sections_layout.
 * Core shopping sections stay visible at the top. Optional blocks can be
 * reordered and hidden without editing or disabling marketplace features.
 */
export const OPTIONAL_HOME_SECTIONS = [
  {id:"promoted",label:"Promoted listings",description:"Featured paid or highlighted products"},
  {id:"live",label:"Live selling",description:"Active live-selling sessions"},
  {id:"promos",label:"Promotional cards",description:"Marketplace offers and promotions"},
  {id:"perks",label:"Marketplace benefits",description:"Shopping and selling benefits"},
  {id:"features",label:"Feature highlights",description:"How Bazunk works"},
  {id:"rewards",label:"Rewards arcade",description:"Rewards programme teaser"},
  {id:"announcement",label:"Announcement banner",description:"Promotional announcements"},
  {id:"ads",label:"Bottom advertising",description:"Configured advertising slot"},
] as const;
export type HomeSectionId=(typeof OPTIONAL_HOME_SECTIONS)[number]["id"];
export type HomeSectionEntry={id:HomeSectionId;enabled:boolean};
export const DEFAULT_HOME_SECTIONS:HomeSectionEntry[]=OPTIONAL_HOME_SECTIONS.map(x=>({id:x.id,enabled:true}));
export const HOME_SECTIONS_DEFAULT_JSON=JSON.stringify(DEFAULT_HOME_SECTIONS);
export function parseHomeSections(raw:unknown):HomeSectionEntry[]{
 try{
  const value=typeof raw==="string"?JSON.parse(raw):raw;
  if(!Array.isArray(value)||value.length!==OPTIONAL_HOME_SECTIONS.length)return DEFAULT_HOME_SECTIONS.map(x=>({...x}));
  const ids=new Set(OPTIONAL_HOME_SECTIONS.map(x=>x.id));
  if(new Set(value.map((x:any)=>x?.id)).size!==ids.size||!value.every((x:any)=>x&&typeof x==="object"&&Object.keys(x).sort().join(",")==="enabled,id"&&ids.has(x.id)&&typeof x.enabled==="boolean"))return DEFAULT_HOME_SECTIONS.map(x=>({...x}));
  return value.map((x:HomeSectionEntry)=>({id:x.id,enabled:x.enabled}));
 }catch{return DEFAULT_HOME_SECTIONS.map(x=>({...x}))}
}

export const SECTION_CONTENT_DEFAULTS:Record<HomeSectionId,{title:string;description:string;button:string;url:string}> = {
 promoted:{title:"Promoted listings",description:"Featured finds from Bazunk sellers",button:"Browse listings",url:"/browse"},
 live:{title:"Live selling",description:"Discover live marketplace streams",button:"Explore live",url:"/live"},
 promos:{title:"Discover more on Bazunk",description:"Shop, save and explore",button:"Explore",url:"/browse"},
 perks:{title:"Marketplace benefits",description:"Good reasons to shop and sell on Bazunk",button:"",url:""},
 features:{title:"Why Bazunk?",description:"A marketplace built around trust",button:"",url:""},
 rewards:{title:"Bazunk Rewards Arcade",description:"Play daily games and earn credits",button:"Play now",url:"/rewards"},
 announcement:{title:"Announcements",description:"Marketplace news and updates",button:"",url:""},
 ads:{title:"From our partners",description:"",button:"",url:""},
};
export type SectionContent=typeof SECTION_CONTENT_DEFAULTS;
export const SECTION_CONTENT_DEFAULT_JSON=JSON.stringify(SECTION_CONTENT_DEFAULTS);
export function parseSectionContent(raw:unknown):SectionContent {
 try{
  const parsed=typeof raw==="string"?JSON.parse(raw):raw;
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return structuredClone(SECTION_CONTENT_DEFAULTS);
  const output=structuredClone(SECTION_CONTENT_DEFAULTS);
  for(const id of Object.keys(output) as HomeSectionId[]){
   const entry=parsed[id];
   if(!entry||typeof entry!=="object")continue;
   for(const field of ["title","description","button","url"] as const){
    if(typeof entry[field]==="string")output[id][field]=entry[field].slice(0,field==="description"?500:field==="url"?200:140);
   }
  }
  return output;
 }catch{return structuredClone(SECTION_CONTENT_DEFAULTS)}
}
