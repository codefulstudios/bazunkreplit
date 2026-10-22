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
