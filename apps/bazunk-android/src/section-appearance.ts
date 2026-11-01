/** Only explicitly supported components consume these section-level settings. */
export const DESIGN_SECTIONS = ["home_hero","home_categories","home_spotlight","home_promos"] as const;
export type DesignSection = typeof DESIGN_SECTIONS[number];
export type SectionAppearance = { background:string; text:string; accent:string; accentText:string };
export const SECTION_DEFAULTS: Record<DesignSection, SectionAppearance> = {
 home_hero:{background:"#1a1d2e",text:"#ffffff",accent:"#fb923c",accentText:"#111827"},
 home_categories:{background:"#27364d",text:"#ffffff",accent:"#334155",accentText:"#ffffff"},
 home_spotlight:{background:"#ffffff",text:"#111827",accent:"#c2410c",accentText:"#ffffff"},
 home_promos:{background:"#17253c",text:"#ffffff",accent:"#fb923c",accentText:"#111827"}
};
const luminance=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
export const sectionContrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
export function isValidSection(p:SectionAppearance){return Object.keys(SECTION_DEFAULTS.home_hero).every(k=>typeof p?.[k as keyof SectionAppearance]==="string"&&/^#[0-9a-fA-F]{6}$/.test(p[k as keyof SectionAppearance]))&&sectionContrast(p.text,p.background)>=4.5&&sectionContrast(p.accentText,p.accent)>=4.5}
export const sectionKey=(section:DesignSection,mode:"light"|"dark")=>"design_section_"+section+"_"+mode;
export function readSection(raw:Record<string,string>,section:DesignSection,mode:"light"|"dark"):SectionAppearance|null {
 const value=raw[sectionKey(section,mode)];
 if(!value)return null;
 try{const p=JSON.parse(value);return isValidSection(p)?p:null}catch{return null}
}


