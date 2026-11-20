import { ArrowUpRight, Code2, Database, Store, Ticket, Headphones, ShieldCheck, Cookie, FileText, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const sites = [
  { name:"Bazunk", eyebrow:"BUY. SELL. TRADE. LIVE.", description:"The marketplace for a smarter, faster and more exciting way to shop.", url:"https://www.bazunk.com", Icon:Store, accent:"orange", mark:"B" },
  { name:"Digital Origin Studios", eyebrow:"DESIGN. DEVELOP. DELIVER.", description:"Creative websites, applications and software designed to make your business stand out.", url:"https://digital-origin-studios.onrender.com", Icon:Code2, accent:"purple", mark:"D" },
  { name:"MarketNexa", eyebrow:"COMMERCE. TECHNOLOGY. GROWTH.", description:"Digital commerce tools and marketplace technology.", url:"https://marketnexa-preview-gc9d.onrender.com", Icon:Store, accent:"cyan", mark:"M" },
  { name:"Nexvenue", eyebrow:"EVENTS. TICKETS. EXPERIENCES.", description:"Connecting event organisers, venues and audiences through modern technology.", url:"https://nexvenue.bazunk.com", Icon:Ticket, accent:"cyan", mark:"N" },
  { name:"Bazunk Data", eyebrow:"DATA. INSIGHTS. GROWTH.", description:"Product data and integration tools for a smarter e-commerce ecosystem.", url:"https://data.bazunk.com", Icon:Database, accent:"orange", mark:"D" },
];

export function OurSitesPage(){
  return <div className="bz-sites-mockup">
    <Navbar />
    <main className="bz-sites-stage">
      <div className="bz-sites-photo" aria-hidden="true"/>
      <div className="bz-sites-gradient" aria-hidden="true"/>
      <div className="bz-sites-inner">
        <header className="bz-sites-heading">
          <p className="bz-sites-kicker"><span/> DIGITAL PLATFORMS</p>
          <h1>Our <em>Sites</em></h1>
          <h2>A growing ecosystem of powerful platforms,<br/>built for buyers, sellers and creators.</h2>
          <p>Each site is part of our mission to create innovative, user-friendly marketplaces and digital tools that make life easier, more connected and more rewarding.</p>
        </header>
        <section className="bz-sites-cards" aria-label="Explore our digital platforms">
          {sites.map(({name,eyebrow,description,url,Icon,accent,mark})=><article className={`bz-sites-card bz-sites-card-${accent}`} key={name}>
            <div className="bz-sites-brand"><span className="bz-sites-logo"><Icon size={25}/></span><strong>{name}</strong></div>
            <h3>{eyebrow}</h3>
            <p>{description}</p>
            <span className="bz-sites-watermark" aria-hidden="true">{mark}</span>
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${name} (opens in new tab)`}><ArrowUpRight size={20}/></a>
          </article>)}
        </section>
      </div>
    </main>
    <Footer />
  </div>;
}
