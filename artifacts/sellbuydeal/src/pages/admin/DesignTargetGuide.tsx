import {ExternalLink, Info} from "lucide-react";
export type DesignTarget="sections"|"colours"|"branding"|"homepage"|"footer"|"advertising"|"assets";
const TARGETS:Record<DesignTarget,{title:string;description:string;url:string;link:string;coverage:string}>={
 sections:{title:"Homepage sections",description:"Change one homepage block at a time: hero, category tiles, Spotlight or promotional cards. Each saves separately for Light and Dark.",url:"/",link:"View homepage",coverage:"Only the chosen section; other pages and admin are unaffected."},
 colours:{title:"Shared colours",description:"Change reusable page, card, text, form and button colours. Choose Storefront, Admin or DealPilot and a theme.",url:"/",link:"View storefront",coverage:"Shared colour tokens used by compatible components. Some older components use separate styling."},
 branding:{title:"Branding and SEO",description:"Edit site name, tagline, brand colours and search-engine titles and descriptions.",url:"/",link:"View homepage",coverage:"Branding and metadata; search previews may take time to refresh."},
 homepage:{title:"Homepage content",description:"Edit homepage headings, announcements and section text without modifying their colours.",url:"/",link:"View homepage",coverage:"Homepage content in both UK and USA marketplaces."},
 footer:{title:"Footer and contact",description:"Edit footer copy, social links and contact details.",url:"/",link:"View footer",coverage:"Shared footer across the storefront."},
 advertising:{title:"Advertising locations",description:"Configure existing advert slots and visibility.",url:"/",link:"View homepage",coverage:"Only configured advert placements; other sections are unchanged."},
 assets:{title:"Icons and graphics",description:"Choose category symbols, customise their appearance, or add a hosted hero graphic.",url:"/",link:"View homepage icons",coverage:"Homepage category tiles and promotional cards. Uploading local files is not supported."}
};
export function DesignTargetGuide({target,override}:{target:DesignTarget;override?:{title:string;description:string;url:string;coverage:string}}){
 const base=TARGETS[target],data=override?{...base,...override}:base;
 return <aside className="rounded-xl border-2 border-sky-400 bg-sky-50 p-4 text-slate-950 dark:border-sky-500 dark:bg-[#19364e] dark:text-white" aria-label="What you are editing">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="max-w-2xl"><div className="flex items-center gap-2 text-sm font-extrabold"><Info className="h-5 w-5"/> YOU ARE EDITING</div><h2 className="mt-1 text-lg font-black">{data.title}</h2><p className="mt-1 text-sm font-semibold">{data.description}</p></div>
   <a href={data.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-800 bg-white px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-slate-100 focus-visible:outline-4 focus-visible:outline-blue-500">{base.link}<ExternalLink className="h-4 w-4"/></a>
  </div>
  <p className="mt-3 border-t border-sky-300 pt-3 text-sm font-bold dark:border-sky-600">Scope: {data.coverage}</p>
 </aside>;
}
