import "./BazunkLiveStudio.css";
import { useUser, useAuth } from "@clerk/react";
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio, Users, Clock, ExternalLink, ShoppingCart,
  ChevronLeft, Share2, CheckCircle2, Heart,
  ArrowRight, Bell, BellOff, Tag, MessageSquare, Zap, AlertTriangle, X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LiveCommerceDiscovery } from "@/components/LiveCommerceDiscovery";
import { Footer } from "@/components/Footer";
import { useLiveStream } from "@/context/LiveStreamContext";
import { PLATFORM_META, extractEmbedSrc } from "@/data/livestreams";
import { LiveKitViewer } from "@/components/LiveKitViewer";
import { useCart } from "@/context/CartContext";
import { LiveChat } from "@/components/LiveChat";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";

function timeOnAir(startedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m on air`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m on air`;
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    youtube: "YT", twitch: "TV", tiktok: "TT",
    zoom: "ZM", instagram: "IG", facebook: "FB",
  };
  const meta = PLATFORM_META[platform as keyof typeof PLATFORM_META];
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${meta?.bg ?? "bg-gray-400"} text-white text-[10px] font-black`}>
      {labels[platform] ?? "??"}
    </span>
  );
}

function LiveHubCreatorSection({live,upcoming}:{live:Array<{id:string;title:string;viewerCount?:number;productIds:string[]}>;upcoming:Array<{id:string;title:string}>}){
  const {user}=useUser();const {getToken}=useAuth();
  const [schedules,setSchedules]=useState<{id:number;title:string;scheduledAt:string;sellerEmail:string}[]>([]);
  const [notifications,setNotifications]=useState<{id:number;content:string;createdAt:string}[]>([]);
  const [title,setTitle]=useState("");const [date,setDate]=useState("");const [message,setMessage]=useState("");
  const [tab,setTab]=useState<"shop"|"auction"|"flash">("shop");
  useEffect(()=>{let active=true;const load=async()=>{
    try{
      const r=await fetch("/api/live/creator/schedules",{cache:"no-store"});
      if(r.ok&&active)setSchedules((await r.json()).schedules||[]);
      if(user){const token=await getToken();const n=await fetch("/api/live/creator/notifications",{headers:token?{Authorization:`Bearer ${token}`}:{}});
        if(n.ok&&active)setNotifications((await n.json()).notifications||[]);}
    }catch{}
  };void load();const timer=setInterval(()=>void load(),30000);return()=>{active=false;clearInterval(timer)};},[user?.id,getToken]);
  async function schedule(){
    setMessage("");
    try{
      if(!title.trim()||!date||!Number.isFinite(new Date(date).getTime()))throw Error("Enter a title and a valid date.");
      const token=await getToken();const r=await fetch("/api/live/creator/schedules",{
        method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({title,scheduledAt:new Date(date).toISOString()})});
      const d=await r.json();if(!r.ok)throw Error(d.error||"Could not schedule stream");
      setMessage("Stream scheduled. Your followers can see their in-app notification.");
      setTitle("");setDate("");
      const fresh=await fetch("/api/live/creator/schedules",{cache:"no-store"});
      if(fresh.ok)setSchedules((await fresh.json()).schedules||[]);
    }catch(e){setMessage(e instanceof Error?e.message:"Could not schedule stream");}
  }
  const featured=live[0];
  const studioRoom=featured ? `/live/${encodeURIComponent(featured.id)}#bz-creator-tools` : "/dashboard?section=go-live";
  const saleRoom=featured ? `/live/${encodeURIComponent(featured.id)}#bz-live-events` : "#bz-live-list";
  const nav=[
    ["Go Live Now","/dashboard?section=go-live","📹"],
    ["Schedule Stream","#bz-schedule","▦"],
    ["Live Streams","#bz-live-list","▶"],
    ["Follower Notifications",user?"#bz-notifications":"/sign-in","♟"],
    ["Moderation",studioRoom,"⬡"],
    ["Creator Analytics",studioRoom,"▥"],
    ["Bazunk Credits","/credits","◉"],
    ["Live Channels","#bz-external-discovery","↗"],
  ];
  const featureCards=[
    ["Schedule Stream","#bz-schedule","▦","Plan and promote your next live"],
    ["Live Auctions",saleRoom,"⚒","Explore live auction events"],
    ["Flash Deals",saleRoom,"ϟ","Discover live flash promotions"],
    ["Shop the Stream","#bz-live-list","♧","Buy products while watching"],
    ["Replays",studioRoom,"▷","View seller-provided replay links"],
    ["Analytics",studioRoom,"▥","Creator-only stream analytics"],
  ];

  return <section className="bz-studio-mock mt-4 mb-8 text-white">
    <div className="bz-studio-heading"><div className="flex items-center gap-3"><span className="bz-studio-broadcast"><Radio size={29}/></span><div><h1 className="text-3xl font-black">Bazunk <span className="text-[#ff7300]">Live</span></h1><p className="text-slate-300 text-sm">Live shopping, auctions, flash deals and creator streams</p></div></div><div className="bz-studio-numbers"><span><Radio size={17}/> <b>{live.length}</b> Live Now</span><span><Users size={17}/> <b>{live.reduce((n,s)=>n+(Number(s.viewerCount)||0),0).toLocaleString()}</b> Watching</span><span><Tag size={17}/> <b>{live.reduce((n,s)=>n+s.productIds.length,0)}</b> Live Items</span></div></div>
    <div className="bz-studio-main">
      <aside className="bz-studio-side"><h2 className="font-black text-lg mb-3 text-white">♛ Creator Studio</h2>{nav.map(([label,url,ico],i)=><a key={label} href={url} className={i===0?"bz-studio-nav active":"bz-studio-nav"}><span>{ico}</span>{label}</a>)}<div className="bz-studio-go"><strong>Go Live Now</strong><p>Start a live shopping stream with products, auctions and flash deals.</p><Link href="/dashboard?section=go-live" className="bz-studio-btn-orange">Go Live</Link></div></aside>
      <div className="bz-studio-preview">{featured?<Link href={`/live/${featured.id}`} className="bz-studio-preview-inner bz-studio-visual"><div className="bz-studio-live-pill">● LIVE</div><Radio size={70} className="text-[#ff7300]"/><h2 className="text-2xl font-black">{featured.title}</h2><p>{Number(featured.viewerCount)||0} viewers · Open broadcast to watch and shop</p><span className="bz-studio-btn-orange">Watch live stream →</span></Link>:<div className="bz-studio-preview-inner bz-studio-visual"><Radio size={70} className="text-[#ff7300]"/><h2 className="text-2xl font-black">Your next live show starts here</h2><p>No broadcasts are live at the moment. Start streaming to appear here.</p><Link href="/dashboard?section=go-live" className="bz-studio-btn-orange">Go Live Now</Link></div>}</div>
      <div className="bz-studio-shop"><div className="bz-studio-tabs">{([["shop","Shop the Stream"],["auction","Auction"],["flash","Flash Deal"]] as const).map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={tab===key?"selected":""}>{label}</button>)}</div><div className="bz-studio-shop-content"><span className="text-4xl">{tab==="shop"?"🛍":tab==="auction"?"⚒":"⚡"}</span><h3>{tab==="shop"?"Shop the Stream":tab==="auction"?"Live Auctions":"Flash Deals"}</h3><p>{tab==="shop"?"Open an active stream to see the seller's products, live stock and checkout.":tab==="auction"?"Open a live stream to view timed auctions and place bids.":"Open a live stream to discover active time-limited discounts."}</p>{featured?<Link href={`/live/${featured.id}`} className="bz-studio-btn-blue">Explore live products</Link>:<a href="#bz-live-list" className="bz-studio-btn-blue">Browse streams</a>}</div></div>
      <div className="bz-studio-chat"><h3 className="font-bold">◉ Live Chat</h3><div className="bz-studio-chat-content"><MessageSquare size={34} className="text-[#009dff]"/><p>Chat opens when you enter an active livestream.</p>{featured?<Link href={`/live/${featured.id}`} className="bz-studio-btn-blue">Join chat</Link>:<p className="text-xs text-slate-400">Waiting for a live broadcast</p>}</div></div>
    </div>
    <div className="bz-studio-features"><Link href="/dashboard?section=go-live" className="bz-studio-feature primary"><Radio size={24}/><span><b>Go Live Now</b><small>Start your live shopping stream</small></span></Link>{featureCards.map(([label,url,ico,desc])=><a href={url} key={label} className="bz-studio-feature"><span className="text-2xl text-[#ff7900]">{ico}</span><span><b>{label}</b><small>{desc}</small></span></a>)}</div>
    <div className="bz-studio-bottom">
      <div id="bz-schedule" className="bz-studio-panel"><h2>▦ Scheduled Live Streams</h2>{schedules.length?schedules.slice(0,4).map(s=><div className="bz-studio-schedule" key={s.id}><span className="text-[#ff7900]">▦</span><span><b>{s.title}</b><small>{new Date(s.scheduledAt).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</small></span></div>):<p className="text-slate-400 text-sm py-3">No upcoming broadcasts scheduled yet.</p>}{user?<div className="space-y-2 mt-3"><input className="bz-studio-input" aria-label="Stream title" placeholder="Stream title" value={title} onChange={e=>setTitle(e.target.value)}/><input className="bz-studio-input" aria-label="Stream date and time" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/><button className="bz-studio-btn-blue w-full" disabled={!title||!date} onClick={()=>void schedule()}>+ Schedule a Live Stream</button>{message&&<p role="status" className="text-xs text-orange-300">{message}</p>}</div>:<Link href="/sign-in" className="bz-studio-btn-blue mt-3">Sign in to schedule</Link>}</div>
      <div id="bz-external-live" className="bz-studio-panel"><h2>↗ External Platform Discovery</h2><p className="text-slate-300 text-sm mb-4">Explore approved creators and streams from other platforms.</p><div className="bz-studio-platforms"><a href="#bz-external-discovery">TikTok</a><a href="#bz-external-discovery">eBay</a><a href="#bz-external-discovery">YouTube</a><a href="#bz-external-discovery">Twitch</a></div><a href="#bz-external-discovery" className="bz-studio-btn-blue mt-5">View external channels →</a></div>
      <div className="bz-studio-panel"><h2>◉ Monetisation & Promotions</h2>{[["Creator Analytics","View your stream performance",studioRoom],["Live Auctions","Manage active stream events",saleRoom],["Bazunk Credits","View available promotional credits","/credits"],["External Channels","Browse approved external live listings","#bz-external-discovery"]].map(([label,desc,url])=><a key={label} href={url} className="bz-studio-money"><span><b>{label}</b><small>{desc}</small></span><ArrowRight size={17}/></a>)}</div>
    </div>
    {user&&<div id="bz-notifications" className="bz-studio-panel mt-4"><h2><Bell size={18}/> Follower notifications</h2>{notifications.length?notifications.slice(0,4).map(n=><p key={n.id} className="text-sm text-slate-300 py-2 border-b border-white/10">{n.content}</p>):<p className="text-sm text-slate-400">No new notifications.</p>}</div>}
  </section>;
}

/* ─── Live Hub — /live ─── */
export function LiveHubPage() {
  const { sessions } = useLiveStream();
  const live = sessions.filter((s) => s.isLive);
  const upcoming = sessions.filter((s) => !s.isLive);

  return (
    <div className="bz-live-page min-h-screen flex flex-col bg-[#06172b]">
      <div className="bz-live-header">
        <Navbar />
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <LiveHubCreatorSection live={live} upcoming={upcoming} />
        <div id="bz-live-list" className="flex items-center justify-between gap-3 mb-5 mt-7">
          <h2 className="text-xl font-black text-white">Live broadcasts <span className="text-[#ff7900]">({live.length})</span></h2>
          <a href="#bz-external-discovery" className="text-sm font-semibold text-[#5cb5ff] hover:underline">Explore external channels</a>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-[180px] xl:w-[220px] lg:sticky lg:top-24 order-2 lg:order-1 empty:hidden">
            <AdSlot slotKey="live_left" />
          </aside>
          <div className="flex-1 min-w-0 order-1 lg:order-2">
        {/* Live streams */}
        {live.length === 0 ? (
          <p className="text-slate-300 text-sm py-5">No broadcasts are live right now. You can schedule a show above or explore approved external channels below.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {live.map((session) => {
              const meta = PLATFORM_META[session.platform as keyof typeof PLATFORM_META];
              return (
                <Link key={session.id} href={`/live/${session.id}`}>
                  <div className="bz-live-stream-card bz-market-item-card rounded-2xl overflow-hidden transition-all group cursor-pointer">
                    {/* Thumbnail placeholder */}
                    <div className={`h-40 ${meta.bg} flex items-center justify-center relative`}>
                      <span className="text-white text-4xl font-black opacity-20">{session.sellerInitials}</span>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">
                        <span className="flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        LIVE
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                        <Users className="w-3 h-3" /> {session.viewerCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#F26B21] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {session.sellerInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{session.sellerName}</p>
                          <p className="text-gray-500 text-xs">{meta.label}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm font-medium line-clamp-2 mb-3">{session.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{session.productIds.length} items for sale</span>
                        <span className="text-xs font-bold text-[#F26B21] group-hover:underline">Watch & Shop →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div id="bz-upcoming" />
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-white mb-4">Upcoming Streams</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((session) => {
                const meta = PLATFORM_META[session.platform as keyof typeof PLATFORM_META];
                return (
                  <div key={session.id} className="bz-live-upcoming-card bz-market-item-card rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                      {session.sellerInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{session.sellerName}</p>
                      <p className="text-gray-400 text-xs line-clamp-1">{session.title}</p>
                      {session.scheduledAt && (
                        <p className="text-gray-600 text-[10px] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(session.scheduledAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-full flex-shrink-0">Soon</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
          </div>
        </div>

        <div id="bz-external-discovery"><LiveCommerceDiscovery /></div>
        <AdSlot slotKey="live_bottom" className="mt-8" />
      </main>
    </div>
  );
}

type LiveProduct = { id: number; title: string; price: number | string; images: string[]; condition?: string; public_id?: string };

/* ─── Live Room — /live/:id ─── */
type LiveSaleEvent={id:number;productId:number;kind:"auction"|"flash";startingPrice:string;currentBid:string|null;discountPercent:number|null;endsAt:string;cancelled:boolean;status:string};
function LiveSalePanel({sessionId,sellerEmail,productIds}:{sessionId:string;sellerEmail:string;productIds:number[]}){
  const {user}=useUser();const {getToken}=useAuth();
  const email=user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isSeller=!!email&&email===sellerEmail?.toLowerCase();
  const [events,setEvents]=useState<LiveSaleEvent[]>([]);
  const [productId,setProductId]=useState("");
  const [kind,setKind]=useState<"auction"|"flash">("auction");
  const [value,setValue]=useState("10");
  const [minutes,setMinutes]=useState("10");
  const [bids,setBids]=useState<Record<number,string>>({});
  const [error,setError]=useState("");
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{
    let cancelled=false;
    const refresh=async()=>{
      try{const r=await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/events`,{cache:"no-store"});
        if(!r.ok)return;const d=await r.json();if(!cancelled)setEvents(d.events||[]);
      }catch{}
    };
    void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh();},2000);
    return ()=>{cancelled=true;clearInterval(timer);};
  },[sessionId]);
  async function action(url:string,body?:object){
    setError("");
    try{
      const token=await getToken();
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body||{})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Request failed");
      const refresh=await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/events`,{cache:"no-store"});
      if(refresh.ok)setEvents((await refresh.json()).events||[]);
    }catch(e){setError(e instanceof Error?e.message:"Could not complete request");}
  }
  return <section className="rounded-2xl border border-gray-700 bg-gray-900 p-4 space-y-3">
    <h2 className="font-bold text-white">Live Auctions & Flash Deals</h2>
    <p className="text-xs text-amber-300">Bids and promotions are previews. Payments, auction winner checkout and discounted checkout are not yet enabled.</p>
    {error&&<p role="alert" className="text-red-300 text-xs">{error}</p>}
    {isSeller&&<div className="grid grid-cols-2 gap-2">
      <select aria-label="Product" value={productId} onChange={e=>setProductId(e.target.value)} className="bg-gray-800 text-white rounded p-2"><option value="">Select product</option>{productIds.map(id=><option key={id} value={id}>Product #{id}</option>)}</select>
      <select aria-label="Event type" value={kind} onChange={e=>setKind(e.target.value as "auction"|"flash")} className="bg-gray-800 text-white rounded p-2"><option value="auction">Auction</option><option value="flash">Flash deal</option></select>
      <input aria-label={kind==="auction"?"Starting price":"Discount percent"} type="number" min="1" max={kind==="flash"?70:undefined} step={kind==="auction"?"0.01":"1"} value={value} onChange={e=>setValue(e.target.value)} className="bg-gray-800 text-white rounded p-2"/>
      <select aria-label="Duration" value={minutes} onChange={e=>setMinutes(e.target.value)} className="bg-gray-800 text-white rounded p-2"><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select>
      <button disabled={!productId} className="col-span-2 rounded bg-orange-500 text-black font-bold p-2 disabled:opacity-50" onClick={()=>void action(`/api/live/session/${encodeURIComponent(sessionId)}/events`,{productId:Number(productId),kind,minutes:Number(minutes),...(kind==="auction"?{startingPrice:Number(value)}:{discountPercent:Number(value)})})}>Start {kind==="auction"?"auction":"flash deal"}</button>
    </div>}
    {events.filter(e=>!e.cancelled).slice(0,8).map(e=>{
      const seconds=Math.max(0,Math.ceil((new Date(e.endsAt).getTime()-now)/1000));
      return <div key={e.id} className="border border-gray-700 rounded-xl p-3 text-white text-sm space-y-2">
        <div className="flex justify-between"><strong>{e.kind==="auction"?"Live auction":"Flash deal"} · Product #{e.productId}</strong><span className="text-orange-300">{seconds?Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0"):"Ended"}</span></div>
        <p>{e.kind==="auction"?`Current bid: £${Number(e.currentBid??e.startingPrice).toFixed(2)}`:`${e.discountPercent}% promotional discount (not applied at checkout)`}</p>
        {e.kind==="auction"&&seconds>0&&!isSeller&&<div className="flex gap-2"><input aria-label="Bid amount" type="number" min="0.01" step="0.01" value={bids[e.id]??""} onChange={ev=>setBids(v=>({...v,[e.id]:ev.target.value}))} placeholder="Your bid £" className="min-w-0 flex-1 rounded bg-gray-800 text-white p-2"/><button className="rounded bg-orange-500 px-3 font-bold text-black" onClick={()=>void action(`/api/live/session/${encodeURIComponent(sessionId)}/events/${e.id}/bids`,{amount:Number(bids[e.id])})}>Bid</button></div>}
        {isSeller&&seconds>0&&<button className="text-red-300 underline text-xs" onClick={()=>void action(`/api/live/session/${encodeURIComponent(sessionId)}/events/${e.id}/cancel`)}>Cancel event</button>}
      </div>;
    })}
  </section>;
}

function CreatorTools({sessionId,sellerEmail}:{sessionId:string;sellerEmail:string}){
  const {user}=useUser();const {getToken}=useAuth();
  const own=!!user?.primaryEmailAddress?.emailAddress&&user.primaryEmailAddress.emailAddress.toLowerCase()===sellerEmail.toLowerCase();
  const [title,setTitle]=useState("");const [date,setDate]=useState("");
  const [replay,setReplay]=useState("");const [blocked,setBlocked]=useState("");
  const [analytics,setAnalytics]=useState<Record<string,number>|null>(null);
  const [replays,setReplays]=useState<{id:number;title:string;url:string}[]>([]);
  const [schedules,setSchedules]=useState<{id:number;title:string;scheduledAt:string;sellerEmail:string}[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{let active=true;const load=async()=>{
    try{
      const [r,s]=await Promise.all([fetch(`/api/live/session/${encodeURIComponent(sessionId)}/replays`),fetch("/api/live/creator/schedules")]);
      if(active&&r.ok)setReplays((await r.json()).replays||[]);
      if(active&&s.ok)setSchedules((await s.json()).schedules||[]);
      if(own){const token=await getToken();const a=await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/creator-analytics`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
        if(active&&a.ok)setAnalytics((await a.json()).analytics);}
    }catch{}
  };void load();const timer=setInterval(()=>void load(),15000);return()=>{active=false;clearInterval(timer)};},[sessionId,own,getToken]);
  async function submit(url:string,body:object){
    setMessage("");
    try{const token=await getToken();const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
      const d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");setMessage("Saved successfully.");
    }catch(e){setMessage(e instanceof Error?e.message:"Request failed");}
  }
  return <section className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3 text-white">
    <h2 className="font-bold">Creator tools</h2>
    {message&&<p role="status" className="text-sm text-orange-300">{message}</p>}
    {!own&&<button className="rounded-lg bg-orange-500 text-black font-bold px-3 py-2 text-sm" onClick={()=>void submit(`/api/live/creator/${encodeURIComponent(sellerEmail)}/follow`,{})}>Follow creator</button>}
    {own&&<>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Scheduled stream title" placeholder="Upcoming stream title" value={title} onChange={e=>setTitle(e.target.value)} className="bg-gray-800 rounded p-2 text-sm"/>
        <input aria-label="Stream date and time" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="bg-gray-800 rounded p-2 text-sm"/>
        <button className="col-span-2 bg-orange-500 text-black rounded p-2 font-bold" onClick={()=>void submit("/api/live/creator/schedules",{title,scheduledAt:new Date(date).toISOString()})} disabled={!title||!date}>Schedule stream & notify followers in-app</button>
      </div>
      <div className="flex gap-2"><input aria-label="Replay URL" placeholder="HTTPS replay URL" value={replay} onChange={e=>setReplay(e.target.value)} className="bg-gray-800 rounded p-2 min-w-0 flex-1 text-sm"/><button className="bg-gray-700 rounded px-3" onClick={()=>void submit(`/api/live/session/${encodeURIComponent(sessionId)}/replays`,{title:"Stream replay",url:replay})}>Add replay</button></div>
      <div className="flex gap-2"><input aria-label="Block chat participant email" placeholder="Chat participant email" value={blocked} onChange={e=>setBlocked(e.target.value)} className="bg-gray-800 rounded p-2 min-w-0 flex-1 text-sm"/><button className="bg-red-900 rounded px-3" onClick={()=>void submit(`/api/live/session/${encodeURIComponent(sessionId)}/moderation/block`,{email:blocked})}>Block chat</button></div>
      <button className="text-orange-300 underline text-xs" disabled={!blocked} onClick={()=>void submit(`/api/live/session/${encodeURIComponent(sessionId)}/moderation/unblock`,{email:blocked})}>Unblock participant</button>
      {analytics&&<p className="text-xs text-gray-300">Viewers: {analytics.viewerCount??0} · Chat messages: {analytics.chatMessages??0} · Bids: {analytics.bids??0} · Followers: {analytics.followers??0}</p>}
    </>}
    {schedules.filter(s=>s.sellerEmail?.toLowerCase()===sellerEmail.toLowerCase()).slice(0,3).map(s=><p key={s.id} className="text-xs text-gray-300">Upcoming: {s.title} — {new Date(s.scheduledAt).toLocaleString()}</p>)}
    {replays.map(r=><a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-orange-300 text-sm underline">{r.title} (external replay)</a>)}
    <p className="text-xs text-gray-400">Notifications are currently in-app records, not email or push. Replays are seller-provided links, not automatic recordings.</p>
  </section>;
}

export function LivePage() {
  const { formatPrice, currency } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const { sessions, getFeatured } = useLiveStream();
  const { addToCart: addItem, openCart } = useCart();

  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [liveQuotes, setLiveQuotes] = useState<Record<number,{price:number;quantity:number;available:boolean}>>({});
  const [shoppingError,setShoppingError] = useState<string | null>(null);
  const [checkingProduct,setCheckingProduct] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [offerProduct, setOfferProduct] = useState<LiveProduct | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSent, setOfferSent] = useState(false);
  const prevFeaturedAtRef = useRef<number | null>(null);
  const [spotlightKey, setSpotlightKey] = useState(0);
  const [liveListings, setLiveListings] = useState<LiveProduct[]>([]);

  const localSession = sessions.find((s) => s.id === id);
  const [remoteSession, setRemoteSession] = useState<typeof localSession>(undefined);
  const [remoteLoading, setRemoteLoading] = useState(!localSession);
  useEffect(() => {
    if (localSession) { setRemoteLoading(false); return; }
    fetch(`/api/live/session/${encodeURIComponent(id)}`)
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setRemoteSession).catch(() => {}).finally(() => setRemoteLoading(false));
  }, [id, localSession]);
  const session = localSession ?? remoteSession;

  const [viewerCount, setViewerCount] = useState(1);
  useEffect(() => { if (session) setViewerCount(Math.max(1, session.viewerCount ?? 0)); }, [session?.id]);



  useEffect(() => {
    if (!session || session.productIds.length === 0) { setLiveListings([]); return; }
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/listings?ids=${session.productIds.join(",")}`, {cache:"no-store"});
        if (!response.ok) return;
        const data = await response.json();
        const items:LiveProduct[] = Array.isArray(data) ? data : (data.listings ?? []);
        if (!cancelled) setLiveListings(items.filter(p => session.productIds.some(id=>Number(id)===Number(p.id))));
      } catch { /* Keep last known listing data until next refresh. */ }
    };
    void refresh();
    const timer = setInterval(()=>void refresh(),10000);
    return ()=>{cancelled=true;clearInterval(timer);};
  }, [session?.id, session?.productIds.join(",")]);

  useEffect(() => {
    if (!session?.isLive || !session.productIds.length) {setLiveQuotes({});return;}
    let cancelled=false;
    const refresh=async()=>{
      const quotes=await Promise.all(session.productIds.slice(0,50).map(async rawId=>{
        const productId=Number(rawId);
        try {
          const r=await fetch(`/api/live/session/${encodeURIComponent(session.id)}/product/${productId}/quote`,{cache:"no-store"});
          if(!r.ok)return [productId,{price:0,quantity:0,available:false}] as const;
          const q=await r.json();
          return [productId,{price:Number(q.price),quantity:Number(q.quantity),available:q.available===true}] as const;
        }catch{return [productId,{price:0,quantity:0,available:false}] as const;}
      }));
      if(!cancelled)setLiveQuotes(Object.fromEntries(quotes));
    };
    void refresh();const timer=setInterval(()=>void refresh(),10000);
    return ()=>{cancelled=true;clearInterval(timer);};
  },[session?.id,session?.isLive,session?.productIds.join(",")]);

  const featuredItem = session ? getFeatured(session.id) : null;
  const featuredProduct = featuredItem
    ? (liveListings.find((p) => p.id === featuredItem.productId) ?? null)
    : null;

  useEffect(() => {
    if (featuredItem && featuredItem.featuredAt !== prevFeaturedAtRef.current) {
      prevFeaturedAtRef.current = featuredItem.featuredAt;
      setSpotlightKey((k) => k + 1);
    }
  }, [featuredItem?.featuredAt]);

  if (!session && remoteLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading live room…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <Radio className="w-10 h-10 text-red-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Stream not found</h1>
          <p className="text-gray-400 text-sm">This stream may have ended or the link is invalid.</p>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-[#4A5CE8] hover:underline">
            <ChevronLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const meta = PLATFORM_META[session.platform];
  const embedSrc = meta.canEmbed
    ? extractEmbedSrc(session.platform, session.streamUrl, window.location.hostname)
    : null;

  const products = liveListings;
  const nonFeaturedProducts = products.filter((p) => p.id !== featuredProduct?.id);

  function discountedPrice(price: number | string, discount?: number) {
    const n = Number(price);
    return discount ? n * (1 - discount / 100) : n;
  }

  async function handleAddToCart(product: LiveProduct) {
    if(!session)return;
    setShoppingError(null);setCheckingProduct(product.id);
    try {
      const r=await fetch(`/api/live/session/${encodeURIComponent(session.id)}/product/${product.id}/quote`,{cache:"no-store"});
      const quote=await r.json();
      if(!r.ok || !quote.available || Number(quote.quantity)<1 || !Number.isFinite(Number(quote.price)) || Number(quote.price)<=0)
        throw new Error(quote.error || "This item is sold out or unavailable.");
      addItem({ id: product.id, title: product.title, price: Number(quote.price), image: product.images?.[0] ?? "" } as never, 1);
      setAddedIds(prev=>new Set(prev).add(product.id));
      openCart();
    }catch(err){setShoppingError(err instanceof Error?err.message:"Could not verify current price or stock.");}
    finally{setCheckingProduct(null);}
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendOffer() {
    if (!offerAmount.trim() || !offerProduct) return;
    setOfferSent(true);
    setTimeout(() => {
      setOfferSent(false);
      setOfferProduct(null);
      setOfferAmount("");
    }, 2500);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-950 border-b border-gray-800">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: stream ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Title bar */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#F26B21] flex items-center justify-center text-white font-bold text-sm">
                  {session.sellerInitials}
                </div>
                {session.isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-gray-950">
                    <Radio className="w-2 h-2 text-white" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{session.sellerName}</p>
                  <PlatformBadge platform={session.platform} />
                  {session.isLive && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {viewerCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400 hidden sm:flex">
                <Clock className="w-3.5 h-3.5" />
                {timeOnAir(session.startedAt)}
              </span>
              <button
                onClick={() => setFollowing((f) => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  following
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {following ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                {following ? "Following" : "Follow"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>

          {/* Stream embed / link-out */}
          {session.platform === "livekit" ? (
            <div className="w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800" style={{ aspectRatio: "16/9" }}>
              <LiveKitViewer
                roomName={session.streamUrl}
                viewerIdentity={`viewer_${Math.random().toString(36).slice(2, 9)}`}
              />
            </div>
          ) : embedSrc ? (
            <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedSrc}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={session.title}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-gray-900 border border-gray-800 flex flex-col items-center justify-center text-center gap-6 py-20 px-8"
              style={{ minHeight: 320 }}
            >
              <div className={`w-20 h-20 rounded-2xl ${meta.bg} flex items-center justify-center`}>
                <span className="text-white text-2xl font-black">
                  {session.platform.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-bold text-lg mb-2">
                  {session.sellerName} is live on {meta.label}
                </p>
                <p className="text-gray-400 text-sm max-w-sm">
                  {meta.label} doesn't support in-page embedding. Open the stream in a new tab, then come back here to browse and buy the items below.
                </p>
              </div>
              <a
                href={session.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity ${meta.bg}`}
              >
                <ExternalLink className="w-4 h-4" />
                Watch on {meta.label}
              </a>
            </motion.div>
          )}

          {/* Stream info + chat CTA */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-sm mb-1">{session.title}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${meta.bg}`}>
                  {meta.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {viewerCount.toLocaleString()} watching
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {timeOnAir(session.startedAt)}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold whitespace-nowrap flex-shrink-0"><MessageSquare className="w-4 h-4" /> Chat on Bazunk</span>
          </div>

          <LiveChat sessionId={session.id} />
        </div>

        {/* ── Right column: featured spotlight + products ── */}
        <div className="flex flex-col gap-4">

          {shoppingError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950 p-3 text-sm text-red-200">{shoppingError}</p>}
          {session.isLive && <div id="bz-live-events"><LiveSalePanel sessionId={session.id} sellerEmail={session.sellerId} productIds={session.productIds} /></div>}
          {session.isLive && <div id="bz-creator-tools"><CreatorTools sessionId={session.id} sellerEmail={session.sellerId} /></div>}
          {/* Featured Product Spotlight */}
          <AnimatePresence mode="wait">
            {featuredProduct && featuredItem && (
              <motion.div
                key={spotlightKey}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-gray-900 shadow-lg shadow-amber-500/10"
              >
                <div className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-white text-xs font-black uppercase tracking-widest flex-1">
                    Now Featured
                  </span>
                  {false && featuredItem.flashDeal && (
                    <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      FLASH DEAL
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div
                    className="relative rounded-xl overflow-hidden bg-gray-800 mb-3"
                    style={{ aspectRatio: "1/1" }}
                  >
                    <img
                      src={featuredProduct.images?.[0] ?? ""}
                      alt={featuredProduct.title}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {false && featuredItem.discount && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg">
                        -{featuredItem.discount}% OFF
                      </div>
                    )}
                  </div>

                  <p className="font-bold text-white text-sm mb-2 line-clamp-2">
                    {featuredProduct.title}
                  </p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-amber-400 font-black text-2xl">
                      {formatPrice(liveQuotes[featuredProduct.id]?.price ?? Number(featuredProduct.price))}
                    </p>
                    {featuredItem.discount && (
                      <p className="text-gray-500 text-sm line-through">
                        {formatPrice(Number(featuredProduct.price))}
                      </p>
                    )}
                  </div>

                  {liveQuotes[featuredProduct.id]?.available && liveQuotes[featuredProduct.id]?.quantity > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="text-orange-400 text-xs font-bold">
                        {liveQuotes[featuredProduct.id].quantity} in stock
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleAddToCart(featuredProduct)}
                      disabled={!liveQuotes[featuredProduct.id]?.available || checkingProduct===featuredProduct.id}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all ${
                        addedIds.has(featuredProduct.id)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      }`}
                    >
                      {addedIds.has(featuredProduct.id) ? (
                        <><CheckCircle2 className="w-4 h-4" /> Added!</>
                      ) : (
                        <><ShoppingCart className="w-4 h-4" /> Buy Now</>
                      )}
                    </button>
                    <button
                      onClick={() => setOfferProduct(featuredProduct)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-amber-500/40 text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-colors"
                    >
                      <Tag className="w-4 h-4" /> Offer
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products panel */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white text-sm">Items for Sale</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {products.length} listing{products.length !== 1 ? "s" : ""} in this stream
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F26B21] text-white">
                Buy Now
              </span>
            </div>

            <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Heart className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-gray-500 text-sm">No products listed yet</p>
                  <p className="text-gray-600 text-xs mt-1">The seller will add items during the stream</p>
                </div>
              ) : nonFeaturedProducts.length === 0 && featuredProduct ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-gray-500 text-sm">All items are featured above</p>
                </div>
              ) : (
                nonFeaturedProducts.map((product) => {
                  const added = addedIds.has(product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
                    >
                      <img
                        src={product.images?.[0] ?? ""}
                        alt={product.title}
                        className="w-14 h-14 rounded-xl object-cover bg-gray-800 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/listing/${product.id}`}
                          className="font-semibold text-white text-xs line-clamp-2 hover:text-[#F26B21] transition-colors"
                        >
                          {product.title}
                        </Link>
                        <p className="font-black text-[#F26B21] text-sm mt-0.5">
                          {formatPrice(liveQuotes[product.id]?.price ?? Number(product.price))}
                        </p>
                        <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                          {product.condition}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => void handleAddToCart(product)}
                          disabled={added || !liveQuotes[product.id]?.available || checkingProduct===product.id}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            added
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-[#F26B21] text-white hover:opacity-80"
                          }`}
                          title="Add to cart"
                        >
                          {added ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setOfferProduct(product)}
                          className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 transition-colors"
                          title="Make offer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <Link
                href="/browse"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                Browse all listings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Make Offer Modal */}
      <AnimatePresence>
        {offerProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => { setOfferProduct(null); setOfferSent(false); }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="font-black text-white text-lg">Make an Offer</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{offerProduct.title}</p>
                </div>
                <button
                  onClick={() => { setOfferProduct(null); setOfferSent(false); }}
                  className="text-gray-500 hover:text-gray-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {offerSent ? (
                <div className="px-6 py-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="font-black text-white text-xl mb-2">Offer Sent!</h4>
                  <p className="text-sm text-gray-400">
                    The seller will respond during or after the stream.
                  </p>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                    <img
                      src={offerProduct.images?.[0] ?? ""}
                      alt={offerProduct.title}
                      className="w-12 h-12 rounded-lg object-contain bg-gray-700 p-1 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-1">{offerProduct.title}</p>
                      <p className="text-xs text-[#F26B21] font-bold">
                        Listed at {formatPrice(Number(offerProduct.price))}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">
                      Your offer ({currency.symbol})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{currency.symbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={`${(Number(offerProduct.price) * 0.85).toFixed(2)}`}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Suggested: {formatPrice(Number(offerProduct.price) * 0.7)} – {formatPrice(Number(offerProduct.price) * 0.95)}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setOfferProduct(null); setOfferAmount(""); }}
                      className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendOffer}
                      disabled={!offerAmount.trim()}
                      className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" /> Send Offer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-gray-950 border-t border-gray-800">
        <Footer />
      </div>
    </div>
  );
}
