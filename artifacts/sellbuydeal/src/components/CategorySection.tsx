import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Shirt, Gamepad2, Armchair, Dumbbell, BookOpen, Gem, CarFront, ToyBrick, HeartPulse, Watch, BriefcaseBusiness } from "lucide-react";

const categories = [
  {name:"Electronics",slug:"electronics",icon:Smartphone,image:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80"},
  {name:"Fashion",slug:"fashion",icon:Shirt,image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80"},
  {name:"Gaming",slug:"gaming",icon:Gamepad2,image:"https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=400&q=80"},
  {name:"Home & Garden",slug:"home",icon:Armchair,image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80"},
  {name:"Sports",slug:"sports",icon:Dumbbell,image:"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80"},
  {name:"Books",slug:"books",icon:BookOpen,image:"https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80"},
  {name:"Collectibles",slug:"collectibles",icon:Gem,image:"https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=80"},
  {name:"Automotive",slug:"automotive",icon:CarFront,image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80"},
  {name:"Toys & Hobbies",slug:"toys-games",icon:ToyBrick,image:"https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80"},
  {name:"Health & Beauty",slug:"health-household",icon:HeartPulse,image:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80"},
  {name:"Jewellery & Watches",slug:"jewellery-watches",icon:Watch,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80"},
  {name:"Business & Office",slug:"office-products",icon:BriefcaseBusiness,image:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400&q=80"},
];
const bento = [
  {title:"Explore technology",subtitle:"Electronics, cameras and everyday tech",image:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80",href:"/browse?category=electronics"},
  {title:"Find your next style",subtitle:"Clothing, trainers and accessories",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",href:"/browse?category=fashion"},
  {title:"Refresh your space",subtitle:"Furniture, homewares and garden",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",href:"/browse?category=home"},
];
export function CategorySection() {
 return <section className="bg-white dark:bg-slate-950 py-12 border-y border-slate-200 dark:border-slate-800">
  <div className="max-w-6xl mx-auto px-4">
   <div className="flex justify-between items-center gap-3 mb-6"><h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Shop by Category</h2><Link href="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300 hover:underline">All categories <ArrowRight className="w-4 h-4"/></Link></div>
   <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
    {categories.map(({name,slug,icon:Icon,image},i)=><motion.div key={slug} initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:Math.min(i*.025,.2)}}>
      <Link href={`/browse?category=${slug}`} className="group block h-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-orange-400 dark:hover:border-orange-400 hover:shadow-md focus-visible:ring-2 focus-visible:ring-orange-500 transition-all">
       <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden"><img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={e=>{e.currentTarget.style.display="none";}}/><Icon aria-hidden="true" className="absolute bottom-2 right-2 h-6 w-6 rounded-md bg-white/95 p-1 text-slate-700 shadow-sm"/></div>
       <div className="min-h-[58px] flex items-center justify-center px-2 py-3"><span className="text-center text-sm font-semibold leading-snug !text-slate-900 dark:!text-white">{name}</span></div>
      </Link>
     </motion.div>)}
   </div>
   <div className="grid md:grid-cols-3 gap-4 mt-8">
    {bento.map(({title,subtitle,image,href})=><Link key={title} href={href} className="group relative min-h-[160px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 p-5 flex flex-col justify-between">
      <img src={image} loading="lazy" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-300"/>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 to-slate-950/20"/>
      <div className="relative z-10 max-w-[88%]"><h3 className="font-bold text-lg !text-white">{title}</h3><p className="mt-2 text-sm !text-white leading-relaxed">{subtitle}</p></div>
      <span className="relative z-10 font-semibold text-sm !text-white">Shop now <ArrowRight className="inline w-4 h-4"/></span>
     </Link>)}
   </div>
  </div>
 </section>;
}
