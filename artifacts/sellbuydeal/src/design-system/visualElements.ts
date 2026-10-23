export const ELEMENT_KINDS=["heading","paragraph","image","button","banner","card"] as const;
export type ElementStyle={fontFamily?:string;fontSize?:number;fontWeight?:number;borderWidth?:number;borderRadius?:number;borderColor?:string;shadow?:string;padding?:number;gap?:number;width?:number;align?:string;columns?:number;sectionSpacing?:number;imageHeight?:number;imageFit?:"cover"|"contain"|"fill";imagePositionX?:number;imagePositionY?:number;buttonHoverBackground?:string;buttonHoverColor?:string;buttonVariant?:"solid"|"outline"|"ghost"};
export type VisualElement={style?:ElementStyle;responsive?:{tablet?:ElementStyle;mobile?:ElementStyle};hidden?:boolean;id:string;type:(typeof ELEMENT_KINDS)[number];text:string;url:string;image:string;background:string;color:string};
export function parseVisualElements(raw:unknown):VisualElement[]{
 try{
  const data=typeof raw==="string"?JSON.parse(raw):raw;
  if(!Array.isArray(data))return [];
  return data.filter((e:any)=>e&&typeof e.id==="string"&&ELEMENT_KINDS.includes(e.type)&&typeof e.text==="string").slice(0,24).map((e:any)=>({
   id:e.id,type:e.type,text:e.text,url:typeof e.url==="string"?e.url:"",image:typeof e.image==="string"?e.image:"",background:typeof e.background==="string"?e.background:"",color:typeof e.color==="string"?e.color:"",style:e.style&&typeof e.style==="object"&&!Array.isArray(e.style)?e.style:{},responsive:e.responsive&&typeof e.responsive==="object"&&!Array.isArray(e.responsive)?e.responsive:{},hidden:e.hidden===true
  }));
 }catch{return []}
}
