import { Link } from "wouter";
import type { ReactNode } from "react";

type Props={eyebrow:string;title:string;description:string;kind:"support"|"categories"|"rewards"|"article";art:string;children?:ReactNode;aside?:ReactNode};
export function CompactPageHero({eyebrow,title,description,kind,art,children,aside}:Props){
 return <section className={`bz-compact-hero bz-compact-hero-${kind}`}>
  <div className="bz-compact-hero-inner">
   <div className="bz-compact-hero-copy">
    <nav aria-label="Breadcrumb" className="bz-compact-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">›</span><span>{eyebrow}</span></nav>
    <h1>{title}</h1><p>{description}</p>
    {children&&<div className="bz-compact-hero-actions">{children}</div>}
   </div>
   <div className="bz-compact-hero-visual" aria-hidden="true"><div className="bz-compact-hero-art">{art}</div>{aside&&<div className="bz-compact-hero-info">{aside}</div>}</div>
  </div>
 </section>;
}
