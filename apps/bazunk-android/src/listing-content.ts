import type { Listing } from './api';
export function plainDescription(value:string=''){
 const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(match,key)=>{if(entities[key])return entities[key];const n=key.startsWith('#x')?parseInt(key.slice(2),16):key.startsWith('#')?Number(key.slice(1)):NaN;return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):match}).trim();
}
export function listingContent(item:Listing){
 let specs:Record<string,unknown>|unknown[]={};try{const raw=typeof item.specifications==='string'?JSON.parse(item.specifications):item.specifications;if(raw&&typeof raw==='object')specs=raw}catch{}
 const obj=specs as Record<string,unknown>;
 const gallery=Array.isArray(obj.admin_gallery_images)?obj.admin_gallery_images:Array.isArray(obj.photos)?obj.photos:[];
 const images=[...new Set([item.image,...gallery].filter((x):x is string=>typeof x==='string'&&/^https:\/\//i.test(x)))].slice(0,12);
 const details=(Array.isArray(specs)?specs:Array.isArray(obj.details)?obj.details:[]).filter(x=>x&&typeof x==='object'&&typeof x.name==='string'&&['string','number'].includes(typeof x.value)).map(x=>({name:String(x.name),value:String(x.value)}));
 const variants=item.variants||obj.variants||obj.variations||obj.admin_variations;
 const hasVariations=Array.isArray(variants)?variants.length>0:!!variants&&typeof variants==='object'&&Object.keys(variants).length>0;
 return {images,details,hasVariations,description:plainDescription(item.description)};
}
