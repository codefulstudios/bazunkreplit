import { useEffect, useRef, useState } from "react";
import { Film, Play, Clapperboard, X, Volume2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./VideoPage.css";

const videos = [
  { title: "Bazunk Promo", file: "bazunk-promo", description: "Discover buying, selling and rewards on Bazunk." },
  { title: "Bazunk, RIP Fluffy Advert", file: "bazunk-fluffy-advert", description: "Our first advert: a very special send-off for Fluffy." },
  { title: "The Bazunk Chainsaw", file: "bazunk-chainsaw", description: "One branch. One chainsaw. Several extremely expensive consequences." },
  { title: "Bazunk Desert Island", file: "bazunk-desertislandadvert", poster: "bazunk-desertislandposter.png", description: "Two castaways. Five hundred iPhones. Absolutely nowhere sensible to sell them." },
];
const posterFor = (video: typeof videos[number]) => "poster" in video && video.poster ? video.poster : `${video.file}-poster.${video.file === "bazunk-chainsaw" ? "png" : "jpg"}`;
  { title: "Bazunk Promo", file: "bazunk-promo", description: "Discover buying, selling and rewards on Bazunk.", category: "Platform Updates" },
  { title: "Bazunk, RIP Fluffy Advert", file: "bazunk-fluffy-advert", description: "Our first advert: a very special send-off for Fluffy.", category: "Announcements" },
  { title: "The Bazunk Chainsaw", file: "bazunk-chainsaw", description: "One branch. One chainsaw. Several extremely expensive consequences.", category: "Buying & Selling" },
  { title: "Bazunk Desert Island", file: "bazunk-desertislandadvert", poster: "bazunk-desertislandposter.png", description: "Two castaways. Five hundred iPhones. Absolutely nowhere sensible to sell them.", category: "Buying & Selling" },
] as const;
type Video = (typeof videos)[number];
const categories = ["All Videos", "Platform Updates", "Buying & Selling", "Tips & Guides", "Announcements"] as const;
const posterFor = (video: Video) => "poster" in video ? video.poster : `${video.file}-poster.${video.file === "bazunk-chainsaw" ? "png" : "jpg"}`;
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

export default function VideoPage() {
  const [selected, setSelected] = useState<Video | null>(null);
  const [category, setCategory] = useState<string>("All Videos");
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const visible = category === "All Videos" ? videos : videos.filter(video => video.category === category);
  function open(video: Video) {
    previousFocus.current = document.activeElement as HTMLElement;
    setFailed(false); setPlaying(false); setSelected(video);
  }
  function close() { player.current?.pause(); setSelected(null); setPlaying(false); previousFocus.current?.focus(); }
  useEffect(() => {
    if (!selected) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const modal = document.querySelector<HTMLElement>(".bz-video-dialog");
        const controls = modal?.querySelectorAll<HTMLElement>('button:not([disabled]),video[controls],a[href]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", keydown); };
  }, [selected]);
  return (
    <div className="bz-video-page min-h-screen flex flex-col">
      <Navbar />
      <header className="bz-video-hero">
        <div className="bz-video-hero-inner">
          <div>
            <span className="bz-video-eyebrow"><span className="bz-video-eyebrow-icon"><Play size={17} fill="currentColor" /></span> Promotional Videos</span>
            <h1>Bazunk Promotional Videos</h1>
            <p>Watch the latest videos, discover new features, and see what's happening on Bazunk.</p>
          </div>
          <div className="bz-video-hero-art" aria-hidden="true"><Clapperboard size={148} strokeWidth={1.35}/><span><Play size={54} fill="currentColor"/></span></div>
        </div>
      </header>
      <main className="bz-video-main">
        <nav className="bz-video-filters" aria-label="Video categories">
          {categories.map(item => <button key={item} type="button" aria-pressed={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </nav>
        {visible.length ? <div className="bz-video-grid">
          {visible.map(video => <article key={video.file} className="bz-video-card">
            <button className="bz-video-thumb" type="button" onClick={() => open(video)} aria-label={`Play ${video.title}`}>
              <img src={asset(posterFor(video))} alt={`Preview of ${video.title}`} loading="lazy" />
              <span className="bz-video-play"><Play size={28} fill="currentColor"/></span>
              <span className="bz-video-duration"><Film size={13}/> Video</span>
            </button>
            <div className="bz-video-card-body">
              <h2>{video.title}</h2>
              <p>{video.description}</p>
              <span className="bz-video-category">{video.category}</span>
            </div>
          </article>)}
        </div> : <div className="bz-video-empty"><Film size={32}/><h2>More videos coming soon</h2><p>There aren't any videos in this category yet.</p><button type="button" onClick={() => setCategory("All Videos")}>View all videos</button></div>}
      </main>
      <Footer />
      {selected && <div className="bz-video-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
        <section className="bz-video-dialog" role="dialog" aria-modal="true" aria-labelledby="bz-video-dialog-title" aria-describedby="bz-video-dialog-description">
          <div className="bz-video-dialog-header"><div><span className="bz-video-dialog-kicker"><ShieldCheck size={14}/> Bazunk Originals</span><h2 id="bz-video-dialog-title">{selected.title}</h2></div><button ref={closeButton} className="bz-video-close" type="button" onClick={close} aria-label="Close video player"><X size={27}/></button></div>
          <p id="bz-video-dialog-description" className="sr-only">Video player with native playback, sound, captions where available and fullscreen controls.</p>
          <div className="bz-video-player-wrap">
            <video ref={player} key={selected.file} src={asset(`${selected.file}.mp4`)} poster={asset(posterFor(selected))} controls autoPlay playsInline preload="metadata" aria-label={selected.title} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}>Your browser does not support video playback.</video>
            {!failed && !playing && <button type="button" className="bz-video-center-play" aria-label="Play video" onClick={() => player.current?.play().catch(() => setFailed(true))}><Play size={36} fill="currentColor"/></button>}
          </div>
          {failed && <p className="bz-video-error" role="alert">This video couldn't load. Please try again later.</p>}
          <div className="bz-video-dialog-footer"><span><Volume2 size={16}/> Use the player controls for sound and fullscreen.</span><button type="button" onClick={close}>Close player</button></div>
        </section>
      </div>}
    </div>
  );
}
