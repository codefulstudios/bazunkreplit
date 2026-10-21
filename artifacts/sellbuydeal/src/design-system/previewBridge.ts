import type {DesignPalette} from "./palette";
type PreviewMessage={type:"bazunk:design-preview";palette:DesignPalette;mode:"light"|"dark";select:boolean};
const KEYS:Record<keyof DesignPalette,string>={background:"--bz-protected-page",surface:"--bz-protected-card",text:"--bz-protected-text",secondaryText:"--bz-protected-secondary",field:"--bz-protected-field",action:"--bz-protected-button",actionText:"--bz-protected-button-text"};
export function installDesignPreviewBridge(){
 const params=new URLSearchParams(window.location.search);
 if(params.get("bzDesignPreview")!=="1"||window.parent===window)return()=>{};
 try{if(window.parent.location.origin!==window.location.origin)return()=>{}}catch{return()=>{}}
 const root=document.documentElement;
 const previous:Record<string,string>={};
 let selected=false;
 const onMessage=(event:MessageEvent<PreviewMessage>)=>{
  if(event.origin!==location.origin||event.source!==window.parent)return;
  if((event.data as any)?.type==="bazunk:section-preview"){
   const detail=event.data as any;
   const targets:Record<string,string>={home_hero:".bz-design-home-hero",home_categories:".bz-design-home-categories",home_spotlight:".bz-design-spotlight",home_promos:".bz-design-home-promos"};
   const selector=targets[detail.section];const d=detail.draft;
   if(!selector||!d||!["background","text","accent","accentText"].every(k=>typeof d[k]==="string"&&/^#[0-9a-f]{6}$/i.test(d[k])))return;
   for(const element of document.querySelectorAll<HTMLElement>(selector)){
    element.style.setProperty("--bz-section-bg",d.background);
    element.style.setProperty("--bz-section-text",d.text);
    element.style.setProperty("--bz-section-accent",d.accent);
    element.style.setProperty("--bz-section-accent-text",d.accentText);
    element.setAttribute("data-design-"+(detail.section==="home_hero"?"home-hero":detail.section==="home_categories"?"home-categories":detail.section==="home_spotlight"?"spotlight":"home-promos"),"true");
   }
   return;
  }
  if(event.data?.type!=="bazunk:design-preview")return;
  const {palette,mode,select}=event.data;
  if(!palette||!Object.values(palette).every(x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x)))return;
  selected=select;
  root.classList.toggle("dark",mode==="dark");
  for(const [key,token] of Object.entries(KEYS) as [keyof DesignPalette,string][]){
   if(!(token in previous))previous[token]=root.style.getPropertyValue(token);
   root.style.setProperty(token,palette[key]);
  }
  const map:Record<string,string>={"--bz-surface-page":palette.background,"--bz-surface-card":palette.surface,"--bz-text-primary":palette.text,"--bz-text-secondary":palette.secondaryText,"--bz-action-primary":palette.action,"--bz-action-primary-text":palette.actionText};
  for(const [token,val] of Object.entries(map)){if(!(token in previous))previous[token]=root.style.getPropertyValue(token);root.style.setProperty(token,val);}
  let style=document.getElementById("bz-design-preview-only") as HTMLStyleElement|null;
  if(!style){style=document.createElement("style");style.id="bz-design-preview-only";document.head.appendChild(style)}
  style.textContent=`[data-bz-design-area] .bz-protected-panel{background:var(--bz-protected-card)!important;color:var(--bz-protected-text)!important;}[data-bz-design-area] .bz-protected-action{background:var(--bz-protected-button)!important;color:var(--bz-protected-button-text)!important;}`;
 };
 const onClick=(event:MouseEvent)=>{
  if(!selected)return;
  const node=event.target as Element|null;
  const element=node?.closest(".bz-design-category-tile,.bz-design-spotlight,.bz-design-promo-card,.bz-design-home-hero,.bz-dp-hero,.bz-dp-mission,button,a,input,select");
  if(!element)return;
  event.preventDefault();event.stopPropagation();
  const component=element.closest(".bz-design-category-tile,.bz-design-spotlight,.bz-design-promo-card,.bz-design-home-hero,.bz-dp-hero,.bz-dp-mission");
  const label=component?.classList.contains("bz-design-category-tile")?"Category tiles":component?.classList.contains("bz-design-spotlight")?"Spotlight":component?.classList.contains("bz-design-promo-card")?"Promotions":component?.classList.contains("bz-design-home-hero")?"Homepage hero":component?.classList.contains("bz-dp-hero")?"DealPilot hero":component?.classList.contains("bz-dp-mission")?"DealPilot form":element.tagName.toLowerCase();
  window.parent.postMessage({type:"bazunk:design-selected",label},location.origin);
 };
 window.addEventListener("message",onMessage);
 document.addEventListener("click",onClick,true);
 window.parent.postMessage({type:"bazunk:design-ready"},location.origin);
 return()=>{window.removeEventListener("message",onMessage);document.removeEventListener("click",onClick,true);Object.entries(previous).forEach(([token,v])=>v?root.style.setProperty(token,v):root.style.removeProperty(token));document.getElementById("bz-design-preview-only")?.remove()};
}
