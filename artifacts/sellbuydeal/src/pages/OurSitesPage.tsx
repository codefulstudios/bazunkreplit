import { ArrowUpRight, Code2, Database, Store, Ticket } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const sites = [
  { name: "Data Platform", description: "Product data, search, and marketplace import tools for connected commerce.", url: "https://data.bazunk.com", Icon: Database },
  { name: "Nexvenue", description: "Event and venue technology, bringing experiences and audiences together.", url: "https://nexvenue.bazunk.com", Icon: Ticket },
  { name: "MarketNexa", description: "Modern marketplace and commerce solutions for growing businesses.", url: "https://marketnexa.bazunk.com", Icon: Store },
  { name: "Codeful Studios", description: "Digital design and development for websites, applications, and software.", url: "https://codefulstudio.co.uk", Icon: Code2 },
];

export function OurSitesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D1425] text-white">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">The Bazunk network</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-white">Our Sites</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">Explore our connected platforms, products and digital services.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {sites.map(({name, description, url, Icon}) => (
            <article key={name} className="group rounded-2xl border border-white/15 bg-[#18243A] p-6 sm:p-8 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-orange-400/70 hover:shadow-orange-950/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/15 text-orange-300">
                <Icon size={29} aria-hidden="true" />
              </div>
              <h2 className="mt-6 text-2xl font-extrabold text-white">{name}</h2>
              <p className="mt-3 min-h-14 leading-relaxed text-slate-200">{description}</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 font-bold text-[#111827] transition-colors hover:bg-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400" aria-label={`Visit ${name} (opens in a new tab)`}>
                Visit website <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
