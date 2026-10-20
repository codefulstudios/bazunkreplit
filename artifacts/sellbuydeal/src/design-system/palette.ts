export type DesignArea = "storefront" | "admin" | "dealpilot";
export type DesignMode = "light" | "dark";
export type DesignPalette = { background:string; surface:string; text:string; secondaryText:string; field:string; action:string; actionText:string };
export const DESIGN_DEFAULTS: Record<DesignArea,Record<DesignMode,DesignPalette>>={
 dealpilot:{
  light:{background:"#1e2545",surface:"#ffffff",text:"#ffffff",secondaryText:"#e5e7eb",field:"#f1f5f9",action:"#fb923c",actionText:"#111827"},
  dark:{background:"#1e2545",surface:"#172541",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827"}
 },
 storefront:{
  light:{background:"#f8fafc",surface:"#ffffff",text:"#111827",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827"},
  dark:{background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827"}
 },
 admin:{
  light:{background:"#f3f6fc",surface:"#ffffff",text:"#152345",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827"},
  dark:{background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827"}
 }
};
export function designContrast(a:string,b:string){
 const l=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function isSafeDesignPalette(p:DesignPalette){
 if(!Object.values(p).every(x=>/^#[0-9a-fA-F]{6}$/.test(x)))return false;
 return [[p.text,p.background],[p.text,p.surface],[p.secondaryText,p.surface],[p.text,p.field],[p.actionText,p.action]].every(([a,b])=>designContrast(a,b)>=4.5);
}
export function parseDesignPalette(raw:string|undefined,area:DesignArea,mode:DesignMode):DesignPalette{
 if(!raw)return DESIGN_DEFAULTS[area][mode];
 try {const value=JSON.parse(raw);const p=Object.fromEntries(Object.keys(DESIGN_DEFAULTS[area][mode]).map(key=>[key,value[key]])) as DesignPalette;return isSafeDesignPalette(p)?p:DESIGN_DEFAULTS[area][mode]}catch{return DESIGN_DEFAULTS[area][mode]}
}
export const designSettingKey=(area:DesignArea,mode:DesignMode)=>"design_palette_"+area+"_"+mode;
