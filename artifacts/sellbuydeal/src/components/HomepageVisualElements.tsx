import {useRawSettings} from "@/context/SiteSettingsContext";
import {parseVisualElements} from "@/design-system/visualElements";
const media=(value:string)=>/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(value)?(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"")+value:"";
export function HomepageVisualElements(){
 const elements=parseVisualElements(useRawSettings().visual_elements_v1);
 if(!elements.length)return null;
 return <section aria-label="Custom homepage content" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white py-6"><div className="mx-auto max-w-6xl px-4 grid gap-4">
 {elements.map(element=>{
  const style={backgroundColor:element.background||undefined,color:element.color||undefined};
  const marker={"data-theme-element":element.id,"data-theme-section":"visual-elements"};
  const content=element.type==="heading"?<h2 {...marker} className="text-3xl font-black">{element.text}</h2>:
   element.type==="paragraph"?<p {...marker} className="text-base leading-relaxed">{element.text}</p>:
   element.type==="image"?<div {...marker}>{media(element.image)?<img src={media(element.image)} alt={element.text||"Homepage image"} className="max-h-96 w-full object-contain"/>:<div className="border border-dashed rounded-xl p-6">Choose an image in Elements</div>}</div>:
   element.type==="button"?<a {...marker} href={element.url.startsWith("/")&&!element.url.startsWith("//")?element.url:"#"} className="inline-block rounded-lg bg-orange-600 px-5 py-3 font-bold text-white">{element.text}</a>:
   element.type==="banner"?<div {...marker} className="rounded-xl p-8 font-bold text-xl bg-blue-900 text-white" style={style}>{element.text}</div>:
   <div {...marker} className="rounded-xl border border-slate-400 p-6 shadow-sm" style={style}>{media(element.image)&&<img src={media(element.image)} alt="" className="mb-3 max-h-48 w-full object-cover rounded"/>}<h3 className="text-xl font-bold">{element.text}</h3>{element.url.startsWith("/")&&!element.url.startsWith("//")&&<a href={element.url} className="underline">Explore</a>}</div>;
  return <div key={element.id} style={element.type==="heading"||element.type==="paragraph"?style:undefined}>{content}</div>;
 })}</div></section>;
}
