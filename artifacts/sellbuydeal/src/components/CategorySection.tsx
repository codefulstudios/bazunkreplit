import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Shirt, Gamepad2, Armchair, Dumbbell, BookOpen, Gem, CarFront, ToyBrick, HeartPulse, Watch, BriefcaseBusiness } from "lucide-react";

const categories = [
  {name:"Electronics",slug:"electronics",icon:Smartphone,emoji:"📱",gradient:"from-blue-600 to-sky-500"},
  {name:"Fashion",slug:"fashion",icon:Shirt,emoji:"🧥",gradient:"from-pink-600 to-fuchsia-500"},
  {name:"Gaming",slug:"gaming",icon:Gamepad2,emoji:"🎮",gradient:"from-violet-700 to-indigo-500"},
  {name:"Home & Garden",slug:"home",icon:Armchair,emoji:"🪴",gradient:"from-teal-600 to-emerald-500"},
  {name:"Sports",slug:"sports",icon:Dumbbell,emoji:"👟",gradient:"from-emerald-600 to-green-500"},
  {name:"Books",slug:"books",icon:BookOpen,emoji:"📚",gradient:"from-amber-600 to-yellow-500"},
  {name:"Collectibles",slug:"collectibles",icon:Gem,emoji:"🧸",gradient:"from-orange-600 to-rose-500"},
  {name:"Automotive",slug:"automotive",icon:CarFront,emoji:"🚙",gradient:"from-slate-600 to-blue-600"},
  {name:"Toys & Hobbies",slug:"toys-games",icon:ToyBrick,emoji:"🧩",gradient:"from-orange-500 to-amber-400"},
  {name:"Health & Beauty",slug:"health-household",icon:HeartPulse,emoji:"💄",gradient:"from-pink-600 to-red-400"},
  {name:"Jewellery & Watches",slug:"jewellery-watches",icon:Watch,emoji:"⌚",gradient:"from-amber-600 to-orange-400"},
  {name:"Business & Office",slug:"office-products",icon:BriefcaseBusiness,emoji:"📦",gradient:"from-slate-600 to-cyan-600"},
];
const bento = [
  {title:"Time for an upgrade?",subtitle:"Electronics · Gaming · Cameras · Tablets",emoji:"💻",gradient:"from-blue-700 to-indigo-500",href:"/browse?category=electronics"},
  {title:"Fresh style, better prices",subtitle:"Trainers · Denim · Accessories · Outerwear",emoji:"👟",gradient:"from-orange-600 to-amber-500",href:"/browse?category=fashion"},
  {title:"Home & Garden",subtitle:"Furniture · Lighting · Garden Tools · Décor",emoji:"🛋️",gradient:"from-teal-700 to-emerald-500",href:"/browse?category=home"},
];
export function CategorySection() {
 return <section className="bg-[#08182e] text-white py-10 border-y border-sky-400/10">
  <div className="max-w-6xl mx-auto px-4">
   <div className="flex justify-between items-center gap-3 mb-5"><h2 className="text-2xl font-black">Shop by Category</h2><Link href="/categories" className="text-xs sm:text-sm font-bold text-sky-100 border border-sky-300/30 rounded-xl px-4 py-2 hover:bg-sky-400/15">View All Categories →</Link></div>
   <div className="flex gap-2.5 overflow-x-auto pb-4 mb-7 [scrollbar-width:thin]">
    {categories.map(({name,slug,icon:Icon,emoji,gradient},i)=><motion.div key={slug} initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:Math.min(i*.035,.3)}} className="shrink-0">
      <Link href={`/browse?category=${slug}`} className="group flex w-[104px] h-[124px] flex-col items-center justify-between rounded-xl border border-sky-300/15 bg-[#132743] hover:border-sky-400/70 hover:-translate-y-1 transition-all overflow-hidden pb-3">
       <div className={`w-full h-[84px] flex items-center justify-center bg-gradient-to-br ${gradient} relative`}><span aria-hidden="true" className="text-5xl drop-shadow-xl group-hover:scale-110 transition-transform">{emoji}</span><Icon className="absolute bottom-1 left-2 w-4 h-4 text-white/80"/></div>
       <span className="text-[11px] text-center font-bold leading-tight px-1">{name}</span>
      </Link>
     </motion.div>)}
   </div>
   <div className="grid md:grid-cols-3 gap-4">
    {bento.map(({title,subtitle,emoji,gradient,href})=><Link key={title} href={href} className={`group relative min-h-[155px] overflow-hidden rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-br ${gradient} hover:brightness-110 transition-all`}>
      <div className="relative z-10 max-w-[75%]"><h3 className="font-black text-lg">{title}</h3><p className="mt-2 text-xs text-white/85 leading-relaxed">{subtitle}</p></div>
      <span className="relative z-10 font-bold text-xs">Shop Now <ArrowRight className="inline w-3 h-3"/></span>
      <span aria-hidden="true" className="absolute right-3 bottom-1 text-[92px] leading-none drop-shadow-2xl group-hover:scale-110 transition-transform">{emoji}</span>
     </Link>)}
   </div>
  </div>
 </section>;
}
