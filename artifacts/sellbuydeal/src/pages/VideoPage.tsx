import { useState } from "react";
import { Film, Play, Clapperboard, Sparkles, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const videos = [
  { title: "Bazunk Promo", file: "bazunk-promo", description: "Discover buying, selling and rewards on Bazunk." },
  { title: "Bazunk, RIP Fluffy Advert", file: "bazunk-fluffy-advert", description: "Our first advert: a very special send-off for Fluffy." },
  { title: "The Bazunk Chainsaw", file: "bazunk-chainsaw", description: "One branch. One chainsaw. Several extremely expensive consequences." },
  { title: "Bazunk Desert Island", file: "bazunk-desertislandadvert", poster: "bazunk-desertislandposter.png", description: "Two castaways. Five hundred iPhones. Absolutely nowhere sensible to sell them." },
];
const posterFor = (video: typeof videos[number]) => "poster" in video && video.poster ? video.poster : `${video.file}-poster.${video.file === "bazunk-chainsaw" ? "png" : "jpg"}`;
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

export default function VideoPage() {
  const [selected, setSelected] = useState<typeof videos[number] | null>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-[#06162d] text-white">
      <Navbar />
      <header className="bz-market-hero relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-[-8%] h-[260px] w-[380px] rounded-full bg-[#fb29c8]/35 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-[25%] h-[240px] w-[350px] rounded-full bg-[#00b9ff]/35 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 py-8 sm:px-8 md:grid-cols-[1.4fr_.6fr] md:py-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#ff315f] px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg"><Clapperboard className="h-5 w-5" /> Promotional Videos</span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">Bazunk <span className="text-[#ffab36]">on Screen</span><span className="block text-[.55em] tracking-normal text-white">Big ideas. Brilliantly ridiculous adverts.</span></h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-100 sm:text-base">Discover Bazunk through our original promotional videos. Pick an advert, press play and enjoy the show.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#4779b7] bg-[#103b70] px-4 py-2.5 text-sm font-bold text-white"><Film className="h-4 w-4 text-[#ffce51]" /> {videos.length} original videos to watch</div>
          </div>
          <div aria-hidden="true" className="hidden items-center justify-center md:flex"><div className="relative flex h-44 w-44 rotate-[-8deg] items-center justify-center rounded-[2rem] border-[5px] border-[#ff80ac] bg-gradient-to-br from-[#ffdf43] to-[#ff792e] text-[#102047] shadow-[0_22px_50px_rgba(0,0,0,.4)]"><Play className="h-20 w-20 fill-current" /><Sparkles className="absolute -right-7 -top-5 h-12 w-12 text-white" /></div></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl font-black text-white">Watch the adverts</h2><p className="mt-1 text-sm font-medium text-slate-200">A little marketplace magic, with a healthy dose of mischief.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2c639e] bg-[#0b2d58] px-4 py-2 text-xs font-bold text-white"><Film className="h-4 w-4 text-[#ffbd41]" /> Bazunk Originals</span>
        </div>
        <div className="bz-market-product-grid grid gap-5 md:grid-cols-2">
          {videos.map((video, index) => (
            <article key={video.file} className="bz-market-item-card group flex flex-col overflow-hidden rounded-2xl border border-[#285b91] bg-[#0b2b54] shadow-lg transition-transform hover:-translate-y-1">
              <button type="button" aria-label={`Play ${video.title}`} onClick={() => { setFailed(false); setSelected(video); }} className="relative block w-full aspect-video overflow-hidden bg-[#102348] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ffb340]">
                <img src={asset(posterFor(video))} alt={`Preview of ${video.title}`} width={960} height={540} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                  <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/80 bg-[#ff741e] text-white shadow-xl transition-transform group-hover:scale-110"><Play className="h-7 w-7 fill-current" aria-hidden="true" /></span>
                </span>
                <span className="absolute left-3 top-3 rounded-lg bg-[#ff315f] px-3 py-1 text-xs font-black text-white">VIDEO {String(index + 1).padStart(2, "0")}</span>
              </button>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-xl font-black text-white">{video.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-200">{video.description}</p>
                <button type="button" onClick={() => { setFailed(false); setSelected(video); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff711f] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#ff8b42] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Play className="h-4 w-4 fill-current" /> Watch video <ArrowUpRight className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="w-[calc(100%_-_2rem)] max-w-5xl bg-slate-950 border-slate-700 text-white p-4 sm:p-6 rounded-2xl max-h-[90dvh] overflow-y-auto">
          <DialogTitle className="pr-8">{selected?.title}</DialogTitle>
          <DialogDescription className="sr-only">Video player with playback, volume and fullscreen controls. Close with the close button or Escape.</DialogDescription>
          {selected && <video key={selected.file} src={asset(`${selected.file}.mp4`)} poster={asset(posterFor(selected))} controls autoPlay playsInline preload="metadata" aria-label={selected.title} onError={() => setFailed(true)} className="w-full max-h-[70dvh] aspect-video object-contain bg-black rounded-lg">Your browser does not support video playback.</video>}
          {failed && <p role="alert" className="text-red-300">The video could not load. Please close the player and try again.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
