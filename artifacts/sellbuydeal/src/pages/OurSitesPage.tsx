import { ArrowUpRight, Code2, Database, Store, Ticket, Layers3, Sparkles, Globe2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const sites = [
  { name: "Data Platform", eyebrow: "DATA & INTELLIGENCE", description: "Product data, intelligent search and powerful import tools built for connected commerce.", url: "https://data.bazunk.com", Icon: Database, accent: "blue", number: "01" },
  { name: "Nexvenue", eyebrow: "EVENT TECHNOLOGY", description: "Digital experiences that connect venues, events and audiences in one seamless ecosystem.", url: "https://nexvenue.bazunk.com", Icon: Ticket, accent: "violet", number: "02" },
  { name: "MarketNexa", eyebrow: "COMMERCE TECHNOLOGY", description: "Modern marketplace technology and commerce solutions designed to grow with businesses.", url: "https://marketnexa.bazunk.com", Icon: Store, accent: "cyan", number: "03" },
  { name: "Digital Origin Studios", eyebrow: "DESIGN & DEVELOPMENT", description: "Distinctive websites, applications and software crafted with creativity and technical precision.", url: "https://digitaloriginstudios.bazunk.com", Icon: Code2, accent: "orange", number: "04" },
];

export function OurSitesPage() {
  return (
    <div className="dos-network-page min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="dos-network-hero" aria-labelledby="network-title">
          <div className="dos-network-hero-image" aria-hidden="true" />
          <div className="dos-network-hero-shade" aria-hidden="true" />
          <div className="dos-network-hero-inner">
            <div className="dos-network-eyebrow"><Sparkles size={17}/> DIGITAL ORIGIN STUDIOS <span className="dos-network-eyebrow-line"/></div>
            <h1 id="network-title">Different ideas.<br/><em>One digital universe.</em></h1>
            <p>Explore the platforms, products and digital experiences shaping our connected network. Thoughtful design meets ambitious technology.</p>
            <a href="#explore-network" className="dos-network-primary">Explore our platforms <ArrowUpRight size={19}/></a>
            <div className="dos-network-hero-foot"><span><Globe2 size={16}/> Connected digital ventures</span><span><ShieldCheck size={16}/> Built for what's next</span></div>
          </div>
        </section>

        <section className="dos-network-work" id="explore-network" aria-labelledby="network-work-title">
          <div className="dos-network-work-inner">
            <div className="dos-network-section-heading">
              <div><p className="dos-network-kicker"><span/> OUR ECOSYSTEM</p><h2 id="network-work-title">Explore the <em>network.</em></h2></div>
              <p>Four distinct ventures. One commitment to creating better digital experiences.</p>
            </div>
            <div className="dos-network-grid">
              {sites.map(({name,eyebrow,description,url,Icon,accent,number})=>(
                <article key={name} className={`dos-network-card dos-network-card-${accent}`}>
                  <div className="dos-network-card-top"><span className="dos-network-card-number">{number} / 04</span><span className="dos-network-card-mark"><Icon size={27} strokeWidth={1.8}/></span></div>
                  <div className="dos-network-card-content">
                    <p className="dos-network-card-eyebrow">{eyebrow}</p>
                    <h3>{name}</h3>
                    <p className="dos-network-card-description">{description}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${name} (opens in a new tab)`}>Explore platform <span><ArrowUpRight size={19}/></span></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="dos-network-outro">
          <div><Layers3 size={28}/><div><h2>Built with purpose. Designed to stand apart.</h2><p>Discover what's possible across the Bazunk digital ecosystem.</p></div></div>
          <a href="https://digitaloriginstudios.bazunk.com" target="_blank" rel="noopener noreferrer">Discover Digital Origin Studios <ArrowUpRight size={19}/></a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
