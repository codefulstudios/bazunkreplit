export const palette = {navy:'#102A56',blue:'#175CD3',orange:'#F26B21',ink:'#17253C',muted:'#5B6B84',paper:'#F4F7FC',line:'#DCE5F0'};
export const departments = [
 ['electronics','Electronics','📱','#DCEBFF'],['clothing-shoes-jewelry','Fashion','👕','#FFE3ED'],
 ['video-games','Gaming','🎮','#E9DFFF'],['home-kitchen','Home & Garden','🪴','#DDF5E7'],
 ['sports-outdoors','Sports','⚽','#FFEAD1'],['books','Books','📚','#FFF2BF'],
 ['computing','Computing','💻','#DDF3FF'],['toys-games','Toys & Hobbies','🧸','#FFE0D8'],
 ['beauty-personal-care','Beauty & Care','✨','#F5E0FF'],['automotive','Automotive','🚗','#DFE8FF'],
 ['arts-crafts-sewing','Arts & Crafts','🎨','#FFE9CC'],['office-products','Business & Office','💼','#DCF3F0'],
] as const;
export type Visibility={hidden:string[];display:Record<string,string>};
export function parseVisibility(value:unknown):Visibility {
 const v=value as Visibility;
 if(!v||!Array.isArray(v.hidden)||v.hidden.some(x=>typeof x!=='string')||!v.display||typeof v.display!=='object'||Array.isArray(v.display)||Object.values(v.display).some(x=>typeof x!=='string'))throw Error('Category settings unavailable.');
 return v;
}
export function activeCategory(v:Visibility,slug:string){return (v.display[slug]||(v.hidden.includes(slug)?'coming_soon':'active'))==='active'}
export function sectionEnabled(settings:Record<string,string>,id:string){
 try{const list=JSON.parse(settings.home_sections_layout||'[]');if(Array.isArray(list)){const item=list.find(x=>x?.id===id);if(item)return item.enabled===true;}}catch{}
 return true;
}
export function featureEnabled(settings:Record<string,string>|null,key?:string){return !key||!!settings&&settings[`feature_${key}`]!=='false'}
