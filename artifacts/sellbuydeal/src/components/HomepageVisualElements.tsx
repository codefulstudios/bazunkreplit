import "./homepage-visual-elements.css";
import {useRawSettings} from "@/context/SiteSettingsContext";
import {parseVisualElements} from "@/design-system/visualElements";
const media=(value:string)=>/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(value)?(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"")+value:"";
export function HomepageVisualElements(){
 const elements=parseVisualElements(useRawSettings().visual_elements_v1);
 if(!elements.length)return null;
 return <section aria-label="Custom homepage content" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white py-6"><div className="mx-auto max-w-6xl px-4 grid gap-4">
 {elements.map(element=>{
  const opts=element.style||{};
  const style:import("react").CSSProperties={
   backgroundColor:element.background||undefined,color:element.color||undefined,
   fontFamily:opts.fontFamily||undefined,fontSize:opts.fontSize?opts.fontSize+"px":undefined,
   fontWeight:opts.fontWeight||undefined,borderWidth:opts.borderWidth??undefined,
   borderStyle:opts.borderWidth?"solid":undefined,borderColor:opts.borderColor||undefined,
   borderRadius:opts.borderRadius===undefined?undefined:opts.borderRadius+"px",
   boxShadow:opts.shadow==="small"?"0 2px 6px #0002":opts.shadow==="medium"?"0 8px 22px #0003":opts.shadow==="large"?"0 16px 32px #0004":undefined,
   padding:opts.padding===undefined?undefined:opts.padding+"px",width:opts.width?Math.min(opts.width,100)+"%":undefined,
   textAlign:opts.align==="center"?"center":opts.align==="right"?"right":"left",marginBlock:opts.sectionSpacing===undefined?undefined:opts.sectionSpacing+"px",
  };
  const marker={"data-theme-element":element.id,"data-theme-section":"visual-elements"};
  const imageStyle:import("react").CSSProperties={height:(opts.imageHeight??240)+"px",width:"100%",objectFit:opts.imageFit||"cover",objectPosition:(opts.imagePositionX??50)+"% "+(opts.imagePositionY??50)+"%"};
  const hoverCss={"--bzve-hover-bg":opts.buttonHoverBackground||"#c2410c","--bzve-hover-color":opts.buttonHoverColor||"#ffffff"} as import("react").CSSProperties;
  const content=element.type==="heading"?<h2 {...marker} className="text-3xl font-black">{element.text}</h2>:
   element.type==="paragraph"?<p {...marker} className="text-base leading-relaxed">{element.text}</p>:
   element.type==="image"?<div {...marker}>{media(element.image)?<img src={media(element.image)} alt={element.text||"Homepage image"} style={imageStyle}/>:<div className="border border-dashed rounded-xl p-6">Choose an image in Elements</div>}</div>:
   element.type==="button"?<a {...marker} href={element.url.startsWith("/")&&!element.url.startsWith("//")?element.url:"#"} style={hoverCss} className={"bzve-button inline-block rounded-lg px-5 py-3 font-bold transition-colors "+(opts.buttonVariant==="outline"?"border-2 border-current bg-transparent":opts.buttonVariant==="ghost"?"bg-transparent":"bg-orange-600 text-white")}>{element.text}</a>:
   element.type==="banner"?<div {...marker} className="rounded-xl p-8 font-bold text-xl bg-blue-900 text-white">{element.text}</div>:
   <div {...marker} className="rounded-xl border border-slate-400 p-6 shadow-sm">{media(element.image)&&<img src={media(element.image)} alt="" className="mb-3 rounded" style={imageStyle}/>}<h3 className="text-xl font-bold">{element.text}</h3>{element.url.startsWith("/")&&!element.url.startsWith("//")&&<a href={element.url} className="underline">Explore</a>}</div>;
  return <div key={element.id} style={{...style,display:element.type==="card"?"grid":undefined,gridTemplateColumns:element.type==="card"&&opts.columns&&opts.columns>1?`repeat(${opts.columns},minmax(0,1fr))`:undefined,gap:opts.gap===undefined?undefined:opts.gap+"px"}}>{content}</div>;
 })}</div></section>;
}
