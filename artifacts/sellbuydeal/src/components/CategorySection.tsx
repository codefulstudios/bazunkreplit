import { usePublicCategoryVisibility } from "@/hooks/usePublicCategoryVisibility";
import { Link } from "wouter";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { motion } from "framer-motion";
import { ArrowRight, Tag } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { ACTIVE_CATEGORIES } from "@/data/categories";

// Keep category identity tied to the canonical taxonomy slugs. Icons are Lucide
// components already bundled with Bazunk; the Tag fallback covers future entries.
const CATEGORY_LABELS: Record<string,string> = {
  "clothing-shoes-jewelry":"Fashion",
  "video-games":"Gaming",
  "home-kitchen":"Home & Garden",
  "sports-outdoors":"Sports",
  "arts-crafts-sewing":"Arts & Crafts",
  "health-household":"Health & Beauty",
  "beauty-personal-care":"Beauty & Care",
  "office-products":"Business & Office",
  "toys-games":"Toys & Hobbies",
};
const CATEGORY_ICON_OVERRIDES: Record<string,string> = {
  electronics:"Headphones",
  "clothing-shoes-jewelry":"Shirt",
  "video-games":"Gamepad2",
  "home-kitchen":"House",
  "sports-outdoors":"Trophy",
  "arts-crafts-sewing":"Palette",
  automotive:"CarFront",
  "health-household":"HeartPulse",
  "beauty-personal-care":"Watch",
  books:"BookOpen",
  "toys-games":"ToyBrick",
  "office-products":"BriefcaseBusiness",
};
const CATEGORY_IMAGES: Record<string,string> = {
  electronics:"https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80",
  "clothing-shoes-jewelry":"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80",
  "video-games":"https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=400&q=80",
  "home-kitchen":"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80",
  "sports-outdoors":"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80",
  "arts-crafts-sewing":"https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=80",
  automotive:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
  "health-household":"https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80",
  "beauty-personal-care":"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
  books:"https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80",
  "toys-games":"https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80",
  "office-products":"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400&q=80",
};
const themes = ["from-blue-500 to-blue-700","from-pink-500 to-fuchsia-700","from-violet-500 to-purple-800","from-emerald-400 to-teal-700","from-amber-300 to-orange-600","from-rose-400 to-rose-700","from-pink-400 to-fuchsia-700","from-sky-400 to-blue-700","from-fuchsia-400 to-pink-700"];
export function CategorySection() {
  const settings = useSiteSettings();
  const { isActive, ready } = usePublicCategoryVisibility();
  const categories = ACTIVE_CATEGORIES.filter(category => isActive(category.slug)).map(category => ({
    ...category,
    label: CATEGORY_LABELS[category.slug] || category.name,
    iconName: CATEGORY_ICON_OVERRIDES[category.slug] || category.icon,
    image: CATEGORY_IMAGES[category.slug],
  }));
  return <section className="bz-home-category-section bz-vibrant-categories bg-white dark:bg-slate-950 py-10 md:py-12 border-y border-slate-200 dark:border-slate-800">
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center gap-3 mb-6"><h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{settings.categories_title || "Categories"}</h2><Link href="/categories" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-200 hover:underline">View all categories <ArrowRight className="w-4 h-4"/></Link></div>
      {!ready ? <div className="min-h-24" aria-label="Loading categories" /> : <div className="bz-home-category-grid grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
        {categories.map((category,index) => {
          const Icon = ((LucideIcons as any)[category.iconName] || Tag) as React.ElementType;
          return <motion.div key={category.slug} initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:Math.min(index*.025,.2)}}>
            <Link href={"/browse?category="+encodeURIComponent(category.slug)} aria-label={"Shop "+category.label} className={"bz-category-card bz-pastel-category bz-vibrant-tile bz-vibrant-"+(index%9)+" group flex h-full min-h-[166px] flex-col items-center justify-center gap-3 rounded-[22px] border px-3 py-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"}>
              <span className="bz-pastel-icon flex h-[76px] w-[76px] items-center justify-center rounded-[22px] transition-transform duration-200 group-hover:scale-110"><Icon aria-hidden="true" className="h-10 w-10" strokeWidth={2.1}/></span>
              <span className="bz-vibrant-tile-footer"><span className="bz-category-label">{category.label}</span><span className="bz-vibrant-arrow" aria-hidden="true"><ArrowRight className="h-5 w-5"/></span></span>
            </Link>
          </motion.div>;
        })}
      </div>}
    </div>
  </section>;
}