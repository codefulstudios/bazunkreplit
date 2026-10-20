import type {CSSProperties} from "react";
export type IconArea="categories"|"promos";
export type IconMode="light"|"dark";
export type IconAppearance={iconColor:string;tileColor:string;tileText:string;tileBorder:string;badgeColor:string;badgeBorder:string;size:number;badgeSize:number;radius:number;gap:number};
export const ICON_DEFAULTS:Record<IconArea,IconAppearance>={
 categories:{iconColor:"#fff7ed",tileColor:"#27364d",tileText:"#ffffff",tileBorder:"#64748b",badgeColor:"#334155",badgeBorder:"#94a3b8",size:24,badgeSize:48,radius:12,gap:8},
 promos:{iconColor:"#111827",tileColor:"#17253c",tileText:"#ffffff",tileBorder:"#64748b",badgeColor:"#fb923c",badgeBorder:"#fb923c",size:20,badgeSize:40,radius:12,gap:8}
};
const contrast=(a:string,b:string)=>{const lum=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};return (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)};
export const iconKey=(area:IconArea,mode:IconMode)=>`design_icon_style_${area}_${mode}`;
export function isValidIconAppearance(v:unknown):v is IconAppearance{
 if(!v||typeof v!=="object")return false;
 const p=v as Record<string,unknown>,colors=["iconColor","tileColor","tileText","tileBorder","badgeColor","badgeBorder"];
 if(Object.keys(p).sort().join(",")!==[...colors,"size","badgeSize","radius","gap"].sort().join(","))return false;
 if(!colors.every(k=>typeof p[k]==="string"&&/^#[0-9a-f]{6}$/i.test(p[k] as string)))return false;
 if(!([["size",16,44],["badgeSize",36,84],["radius",0,28],["gap",4,20]] as const).every(([k,min,max])=>typeof p[k]==="number"&&Number.isInteger(p[k])&&(p[k] as number)>=min&&(p[k] as number)<=max))return false;
 return (p.size as number)<=(p.badgeSize as number)-8&&contrast(p.iconColor as string,p.badgeColor as string)>=4.5&&contrast(p.tileText as string,p.tileColor as string)>=4.5;
}
export function readIconAppearance(raw:Record<string,string>,area:IconArea,mode:IconMode):IconAppearance|null{
 try{const v=JSON.parse(raw[iconKey(area,mode)]||"null");return isValidIconAppearance(v)?v:null}catch{return null}
}
export function iconStyle(p:IconAppearance|null):CSSProperties|undefined{
 return p?{"--bz-icon-color":p.iconColor,"--bz-icon-tile":p.tileColor,"--bz-icon-text":p.tileText,"--bz-icon-border":p.tileBorder,"--bz-icon-badge":p.badgeColor,"--bz-icon-badge-border":p.badgeBorder,"--bz-icon-size":p.size+"px","--bz-icon-badge-size":p.badgeSize+"px","--bz-icon-radius":p.radius+"px","--bz-icon-gap":p.gap+"px"} as CSSProperties:undefined;
}
