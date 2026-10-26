import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { useAuth as useClerkAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, RotateCcw, HelpCircle, Gift, Type,
  Coins, Trophy, Crown, ChevronRight, Loader2,
  CheckCircle2, XCircle, Zap, Star, Lock,
  CalendarCheck, Brain, Ticket, PackageOpen, Dices, Volume2, VolumeX, Flame,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AdSlot } from "@/components/AdSlot";
import { CompactPageHero } from "@/components/CompactPageHero";
import { MemoryMatchGame, TreasureTapGame, ParcelDashGame } from "@/components/RewardsArcadeGames";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  creditsMin: number;
  creditsMax: number;
  dailyPlaysPerUser: number;
  todayPlays: number;
  playsRemaining: number;
}

interface LeaderboardEntry {
  user_email: string;
  total_credits: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  calendar: CalendarCheck,
  loader: RotateCcw,
  "help-circle": Brain,
  gift: PackageOpen,
  type: Ticket,
  "daily-checkin": CalendarCheck,
  "spin-wheel": RotateCcw,
  "daily-quiz": Brain,
  "scratch-card": Ticket,
  "mystery-box": PackageOpen,
  "lucky-number": Dices,
  "memory-match": Brain,
  "treasure-tap": Gift,
  "parcel-dash": PackageOpen,
};

const ICON_BG: Record<string, string> = {
  "daily-checkin":  "bg-emerald-50",
  "spin-wheel":     "bg-purple-50",
  "daily-quiz":     "bg-blue-50",
  "scratch-card":   "bg-orange-50",
  "mystery-box":    "bg-pink-50",
  "lucky-number":   "bg-amber-50",
  "memory-match": "bg-blue-50", "treasure-tap": "bg-orange-50", "parcel-dash": "bg-sky-50",
};

const ICON_COLOR: Record<string, string> = {
  "daily-checkin":  "text-emerald-500",
  "spin-wheel":     "text-purple-500",
  "daily-quiz":     "text-blue-500",
  "scratch-card":   "text-orange-500",
  "mystery-box":    "text-pink-500",
  "lucky-number":   "text-amber-500",
  "memory-match": "text-blue-600", "treasure-tap": "text-orange-600", "parcel-dash": "text-sky-600",
};

// ── Spin Wheel ────────────────────────────────────────────────────────────────
function SpinWheelGame({ game, onPlay }: { game: Game; onPlay: (answer?: unknown) => Promise<void> }) {
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const segments = Array.from({ length: 8 }, (_, i) => Math.round(game.creditsMin + (game.creditsMax - game.creditsMin) * i / 7));
  const colors = ["#5546e8","#fa742e","#0cae89","#f5a623","#8749df","#f04458","#00a9c8","#df3d94"];
  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setAngle(a => a + 1800 + Math.random() * 360);
    await new Promise(r => setTimeout(r, 3400));
    try { await onPlay(); } finally { setSpinning(false); }
  }
  return (
    <div className="arcade-wheel-experience flex flex-col items-center gap-5 py-4">
      <div className="arcade-stage-heading"><span>✨</span> LUCKY SPIN <span>✨</span></div>
      <p className="text-center text-sm font-semibold text-blue-100">Spin the illuminated wheel and reveal your daily surprise!</p>
      <div className="arcade-wheel-stage">
        <div className="arcade-wheel-pointer" aria-hidden="true">🔻</div>
        <div className="arcade-wheel-lights">
          <motion.div className="arcade-wheel-disc" animate={{rotate:angle}} transition={{duration:3.4,ease:[0.12,0.75,0.12,1]}}
            style={{background:`conic-gradient(from -22.5deg, ${colors.map((c,i)=>`${c} ${i*45}deg ${(i+1)*45}deg`).join(", ")})`}}>
            {segments.map((val,i)=><div key={i} className="arcade-wheel-segment" style={{transform:`rotate(${i*45}deg)`}}>
              <span>🪙</span><strong>{val}</strong><small>credits</small>
            </div>)}
          </motion.div>
          <div className="arcade-wheel-hub">B</div>
        </div>
        <div className="arcade-wheel-base">⭐ SPIN · EARN · WIN ⭐</div>
      </div>
      <button onClick={spin} disabled={spinning} className="arcade-orange-button">
        {spinning ? "✨ Spinning…" : "🎡 SPIN NOW"}
      </button>
      <div className="arcade-reward-chips">{[5,10,25,50,100].map(n=><div key={n}><span>🪙</span><strong>{n}</strong><small>credits</small></div>)}</div>
      <p className="text-xs text-blue-100 text-center">Prize values shown are illustrative. Your actual reward is determined by the server when the spin completes.</p>
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function QuizGame({ game, onPlay }: { game: Game; onPlay: (answer?: unknown) => Promise<void> }) {
  const [question, setQuestion] = useState<{ question: string; options: string[] } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/rewards/quiz-today").then(r => r.ok ? r.json() : null).then(setQuestion).catch(() => {});
  }, []);

  async function submit() {
    if (selected === null) return;
    setSubmitting(true);
    await onPlay(selected);
    setSubmitting(false);
  }

  if (!question) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

  return (
    <div className="bz-quiz-game space-y-4">
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="bz-quiz-question rounded-2xl border p-4"><Brain className="w-7 h-7 text-blue-600 mb-2"/><p className="font-bold text-lg text-[#142b50]">{question.question}</p></motion.div>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <motion.button
            key={i}
            initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.09}} whileHover={{scale:1.015}} whileTap={{scale:.98}}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i} disabled={submitting} className={`bz-quiz-option w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${selected === i ? "is-selected" : ""}`}
          >
            <span className="bz-quiz-letter font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
          </motion.button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={selected === null || submitting}
        className="bz-quiz-submit w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Submit Answer"}
      </button>
      <p className="bz-quiz-help text-xs text-center">+{game.creditsMax} credits for a correct answer</p>
    </div>
  );
}

// ── Scratch Card ──────────────────────────────────────────────────────────────
function ScratchCardGame({ onPlay }: { onPlay: (answer?: unknown) => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const last = useRef<{x:number;y:number}|null>(null);
  const [progress,setProgress] = useState(0);
  const [revealing,setRevealing] = useState(false);
  const [revealed,setRevealed] = useState(false);
  useEffect(() => {
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    if(!ctx) return;
    const w=320,h=190;
    ctx.globalCompositeOperation="source-over";
    const gradient=ctx.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,"#d9dde7");gradient.addColorStop(.5,"#8e9aad");gradient.addColorStop(1,"#e6e9f1");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#283248";ctx.textAlign="center";ctx.font="bold 23px sans-serif";
    ctx.fillText("✦ SCRATCH HERE ✦",w/2,86);
    ctx.font="14px sans-serif";ctx.fillText("Swipe or drag to reveal",w/2,113);
  },[]);
  function scratchAt(e:React.PointerEvent<HTMLCanvasElement>) {
    if(revealing||revealed||!dragging.current)return;
    const canvas=canvasRef.current;const ctx=canvas?.getContext("2d");
    if(!canvas||!ctx)return;
    const rect=canvas.getBoundingClientRect();
    const point={x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};
    ctx.globalCompositeOperation="destination-out";ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=38;
    ctx.beginPath();if(last.current){ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(point.x,point.y);}else{ctx.moveTo(point.x,point.y);ctx.lineTo(point.x+.1,point.y+.1);}ctx.stroke();
    last.current=point;
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let clear=0;for(let i=3;i<pixels.length;i+=64)if(pixels[i]<100)clear++;
    const pct=Math.min(100,Math.round(clear/(pixels.length/64)*100));
    setProgress(pct);
    if(pct>=48)finish();
  }
  async function finish(){
    if(revealing||revealed)return;
    dragging.current=false;setRevealing(true);
    try { await onPlay();setRevealed(true); } finally {setRevealing(false);}
  }
  return <div className="arcade-scratch-experience flex flex-col items-center gap-4 py-5">
    <h3 className="arcade-stage-heading">🎟️ SCRATCH <span>& WIN</span> ✨</h3>
    <p className="font-semibold text-white text-center">Rub away the silver foil to reveal your surprise!</p>
    <div className="arcade-scratch-frame">
      <div className="arcade-scratch-marquee" aria-hidden="true">✦ ✨ ✦ ✨ ✦ ✨ ✦ ✨</div>
      <div className="relative w-full aspect-[320/190] rounded-2xl overflow-hidden border-[5px] border-amber-300 shadow-[0_12px_30px_rgba(245,158,11,.3)] select-none" style={{background:"radial-gradient(circle at 50% 45%,#f9d959,#fa9c1e 45%,#842dda 100%)"}}>
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white gap-2">
          <motion.div animate={{rotate:[-8,8,-8],scale:[1,1.15,1]}} transition={{duration:1.6,repeat:Infinity}}><Gift className="w-14 h-14 text-yellow-100"/></motion.div>
          <span className="font-black text-2xl drop-shadow-lg">🎁 MYSTERY PRIZE!</span>
          <span className="text-sm font-bold">The server reveals your actual reward</span>
        </div>
        {!revealed&&<canvas ref={canvasRef} width={320} height={190} aria-label="Scratch ticket coating. Drag or swipe to reveal." onPointerDown={e=>{dragging.current=true;last.current=null;e.currentTarget.setPointerCapture(e.pointerId);scratchAt(e);}} onPointerMove={scratchAt} onPointerUp={()=>{dragging.current=false;last.current=null;}} onPointerCancel={()=>{dragging.current=false;last.current=null;}} className="absolute inset-0 w-full h-full cursor-crosshair touch-none"/>}
      </div>
      <div className="arcade-scratch-marquee" aria-hidden="true">✦ ✨ ✦ ✨ ✦ ✨ ✦ ✨</div>
    </div>
    <div className="w-full max-w-[420px] h-3 rounded-full bg-blue-950 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all" style={{width:`${progress}%`}}/></div>
    <p className="text-sm font-bold text-white">{revealing?"Checking your prize…":revealed?"Ticket revealed!":`${progress}% scratched · Reveal at 48%`}</p>
    <button type="button" disabled={revealing||revealed} onClick={finish} className="arcade-orange-button disabled:opacity-50">🎁 Reveal my reward</button>
    <p className="text-xs text-blue-100">One play is recorded when the server processes your reveal.</p>
  </div>;
}

// ── Word Scramble ─────────────────────────────────────────────────────────────
function WordScrambleGame({ game, onPlay }: { game: Game; onPlay: (answer?: unknown) => Promise<void> }) {
  const [scramble, setScramble] = useState<{ scrambled: string; category: string } | null>(null);
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/rewards/scramble-today").then(r => r.ok ? r.json() : null).then(setScramble).catch(() => {});
  }, []);

  async function submit() {
    if (!guess.trim()) return;
    setSubmitting(true);
    await onPlay(guess.trim().toUpperCase());
    setSubmitting(false);
  }

  if (!scramble) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-pink-400" /></div>;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Category: {scramble.category}</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {scramble.scrambled.split("").map((letter, i) => (
            <motion.span key={i} initial={{opacity:0,y:-20,rotate:-15}} animate={{opacity:1,y:0,rotate:0}} transition={{delay:i*.07,type:"spring"}} className="w-10 h-10 rounded-xl bg-pink-50 border-2 border-pink-200 flex items-center justify-center text-lg font-black text-pink-700">
              {letter}
            </motion.span>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={guess}
        onChange={e => setGuess(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="Type your answer…"
        maxLength={20}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-center font-black text-lg tracking-widest uppercase"
      />
      <button
        onClick={submit}
        disabled={!guess.trim() || submitting}
        className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Submit"}
      </button>
      <p className="text-xs text-gray-400 text-center">+{game.creditsMax} credits for the correct answer</p>
    </div>
  );
}

function MysteryBoxGame({ onPlay }: { onPlay: (answer?: unknown) => Promise<void> }) {
  const [chosen,setChosen]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  async function choose(n:number){if(busy)return;setChosen(n);setBusy(true);try{await new Promise(r=>setTimeout(r,1000));await onPlay(n);}finally{setBusy(false);}}
  return <div className="bz-mystery-game text-center">
    <motion.div className="bz-mystery-crown" animate={{y:[0,-7,0]}} transition={{repeat:Infinity,duration:2.4}} aria-hidden="true">✨🎁✨</motion.div>
    <h3>Choose your mystery box!</h3><p className="bz-mystery-subtitle">Three magical boxes. Pick your favourite and reveal your reward.</p>
    <div className="bz-mystery-grid">{[1,2,3].map((n)=><motion.button key={n} type="button" disabled={busy} onClick={()=>choose(n)} whileHover={!busy?{y:-7,scale:1.025}:undefined} whileTap={{scale:.96}} className={`bz-mystery-tile bz-mystery-tile-${n}`} aria-label={`Open mystery box ${n}`}>
      <motion.span className="bz-mystery-art" aria-hidden="true" animate={chosen===n&&busy?{scale:[1,1.3,1],rotate:[0,-10,10,0]}:{y:[0,-5,0]}} transition={{duration:chosen===n&&busy?.8:2,repeat:chosen===n&&busy?0:Infinity}}>{chosen===n&&busy?"✨":"🎁"}</motion.span>
      <strong>BOX {n}</strong><small>{chosen===n&&busy?"Opening…":"Tap to reveal"}</small>
    </motion.button>)}</div>
    <p className="bz-mystery-hint">{busy?"Revealing your surprise…":"✨ Every box contains a surprise — choose one!"}</p>
  </div>;
}

function LuckyNumberGame({ onPlay }: { onPlay: (answer?: unknown) => Promise<void> }) {
  const [chosen,setChosen]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  async function choose(n:number){if(busy)return;setChosen(n);setBusy(true);try{await new Promise(r=>setTimeout(r,850));await onPlay(n);}finally{setBusy(false);}}
  return <div className="py-4 text-center">
    <motion.div animate={{rotate:[-10,10,-10],y:[0,-5,0]}} transition={{repeat:Infinity,duration:2.2}}><Dices className="w-12 h-12 text-amber-500 mx-auto mb-3"/></motion.div>
    <p className="font-black text-gray-900 text-lg mb-2">Pick your lucky number</p>
    <p className="text-sm text-gray-600 mb-5">Choose 1–6. Match the secret number for the jackpot!</p>
    <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(n=><motion.button key={n} type="button" disabled={busy} onClick={()=>choose(n)}
      whileHover={!busy?{scale:1.1,rotate:4}:undefined} whileTap={!busy?{scale:.9}:undefined}
      animate={chosen===n?{scale:[1,1.2,1],rotate:[0,12,-12,0]}:undefined} transition={{duration:.7}}
      className={`rounded-2xl border-2 py-5 text-2xl font-black shadow-sm focus-visible:ring-4 focus-visible:ring-amber-400 ${chosen===n?"bg-amber-400 text-amber-950 border-amber-500":"border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800"}`}>{n}</motion.button>)}</div>
    <p className="mt-5 text-sm font-semibold text-gray-600">{busy?"Rolling your lucky number…":"Tap a number to play"}</p>
  </div>;
}

// ── Game Modal ────────────────────────────────────────────────────────────────
function GameModal({
  game, onClose, onResult,
}: {
  game: Game;
  onClose: () => void;
  onResult: (res: { won: boolean; creditsEarned: number; message: string; playsRemaining: number }) => void;
}) {
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const [result, setResult] = useState<{ won: boolean; creditsEarned: number; message: string; playsRemaining: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const sessionPromise = useRef<Promise<string> | null>(null);
  const lastAnswer = useRef<unknown>(undefined);
  useEffect(() => {
    sessionPromise.current = (async () => {
      const token=await getToken(); if(!token) throw new Error("Sign in required");
      const res=await fetch("/api/rewards/session/start",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({gameId:game.id})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Cannot start game");return String(data.sessionId);
    })();
    sessionPromise.current.catch(e=>setError(e instanceof Error?e.message:"Could not start game"));
  },[getToken,game.id]);
  const Icon = ICON_MAP[game.id] ?? ICON_MAP[game.icon] ?? Gift;

  const play = useCallback(async (answer?: unknown) => {
    if (submitting.current) return;
    submitting.current = true;
    lastAnswer.current = answer;
    setError(null);
    try {
      const sessionId=await sessionPromise.current;
      if(!sessionId)throw new Error("No active game session");
      const token=await getToken();if(!token)throw new Error("Please sign in again");
      const headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};
      const completed=await fetch("/api/rewards/session/complete",{method:"POST",headers,body:JSON.stringify({sessionId,answer})});
      const completedData=await completed.json();
      if(!completed.ok)throw new Error(completedData.error||"Unable to verify completion");
      const claimed=await fetch("/api/rewards/session/claim",{method:"POST",headers,body:JSON.stringify({sessionId})});
      const data=await claimed.json();
      if(!claimed.ok)throw new Error(data.error||"Unable to claim reward");
      setResult({...data,playsRemaining:Math.max(0,game.playsRemaining-1)});
      onResult(data);
    } catch(e) {
      setError(e instanceof Error?e.message:"Network error — please try again");
    } finally { submitting.current = false; }
  }, [getToken,game.playsRemaining,onResult]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] grid place-items-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        role="dialog" aria-modal="true" aria-label={`${game.name} reward game`} className="bz-reward-game-dialog relative flex flex-col bg-white text-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bz-reward-dialog-header shrink-0 px-5 py-3 flex items-center gap-3 border-b border-gray-200 bg-white`}>
          <div className={`w-10 h-10 rounded-xl ${ICON_BG[game.id]} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${ICON_COLOR[game.id]}`} />
          </div>
          <div>
            <h2 className="font-black text-gray-900">{game.name}</h2>
            <p className="text-xs text-gray-400">{game.playsRemaining} play{game.playsRemaining !== 1 ? "s" : ""} remaining today</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close game" title="Close game" className="ml-auto shrink-0 grid h-11 w-11 place-items-center rounded-full border-2 border-slate-300 bg-slate-100 text-slate-900 text-2xl font-bold hover:bg-orange-100 hover:border-orange-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-500">×</button>
        </div>

        <div className="p-4 sm:p-6 arcade-modal-content">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="result" initial={{opacity:0,scale:.88,y:20}} animate={{opacity:1,scale:1,y:0}} transition={{type:"spring",stiffness:240,damping:20}} className={`arcade-result ${result.won?"arcade-result-win":"arcade-result-try"}`} role="status" aria-live="polite">
                {result.won && <div className="arcade-confetti" aria-hidden="true">{Array.from({length:22},(_,i)=><span key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%8)*-.24}s`,backgroundColor:["#ffbd24","#fa6118","#3e9af7","#b04eea","#28cb9b"][i%5]}} />)}</div>}
                <motion.div className="arcade-result-art" aria-hidden="true" animate={result.won?{y:[0,-8,0],rotate:[-5,5,-5]}:{y:[0,-4,0]}} transition={{duration:2,repeat:Infinity}}>
                  {({"spin-wheel":"🎡","scratch-card":"🎟️","memory-match":"🧩","treasure-tap":"🧰","parcel-dash":"📦","daily-quiz":"🧠","mystery-box":"🎁","lucky-number":"🎲"} as Record<string,string>)[game.id]??"🎁"}
                  <span>{result.won?"🏆":"⭐"}</span>
                </motion.div>
                <h2 className="arcade-result-title">{result.won?"YOU WON! 🎉":"Nice try! ✨"}</h2>
                {result.won?<><p className="arcade-result-amount">+{result.creditsEarned} <small>credits</small></p><p className="arcade-result-description">Your reward has been added to your Bazunk balance.</p></>:<><p className="arcade-result-no-win">No credits this round</p><p className="arcade-result-description">Every game is another chance to play and have fun.</p></>}
                <p className="arcade-result-remaining">{result.playsRemaining>0?`${result.playsRemaining} play${result.playsRemaining===1?"":"s"} remaining today`:"All plays used today — come back tomorrow!"}</p>
                <div className="arcade-result-actions"><button type="button" onClick={onClose} className="arcade-result-primary">Explore more games</button><Link href="/credits" onClick={onClose} className="arcade-result-secondary">View credits</Link></div>
              </motion.div>
            ) : (
              <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error && (
                  <div role="alert" className="arcade-error-panel mb-4">
                    <div className="text-4xl" aria-hidden="true">{/limit|cap|tomorrow/i.test(error)?"🕒":/expired/i.test(error)?"⏳":"🎮"}</div>
                    <h3 className="font-black text-lg text-slate-900">{/limit|cap|tomorrow/i.test(error)?"Today's rewards are finished":/expired/i.test(error)?"Your game session expired":"Something interrupted your reward"}</h3>
                    <p className="text-sm text-slate-700">{error}</p>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {!/limit|cap|expired|disabled/i.test(error)&&sessionPromise.current&&<button type="button" onClick={() => void play(lastAnswer.current)} className="arcade-result-primary">Try again</button>}
                      <button type="button" onClick={onClose} className="bz-arcade-back-button">Back to games</button>
                    </div>
                  </div>
                )}
                {game.id === "spin-wheel" && <SpinWheelGame game={game} onPlay={play} />}
                {game.id === "daily-quiz" && <QuizGame game={game} onPlay={play} />}
                {game.id === "scratch-card" && <ScratchCardGame onPlay={play} />}
                {game.id === "mystery-box" && <MysteryBoxGame onPlay={play} />}
                {game.id === "lucky-number" && <LuckyNumberGame onPlay={play} />}
                {game.id === "memory-match" && <MemoryMatchGame onPlay={play} />}
                {game.id === "treasure-tap" && <TreasureTapGame onPlay={play} />}
                {game.id === "parcel-dash" && <ParcelDashGame onPlay={play} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function RewardsPage() {
  const { user, refreshBalance } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [stats, setStats] = useState({ totalCredits: 0, todayCredits: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const {getToken}=useClerkAuth();
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [streak,setStreak]=useState<{streak:number;playedToday:boolean}|null>(null);
  const [leaderboardScope,setLeaderboardScope]=useState<"all"|"top5">("top5");

  const fetchGames = useCallback(async () => {
    const url = user?.email ? `/api/rewards/games?email=${encodeURIComponent(user.email)}` : "/api/rewards/games";
    const res = await fetch(url);
    if (res.ok) setGames(await res.json());
    setLoading(false);
  }, [user?.email]);

  const fetchStats = useCallback(async () => {
    if (!user?.email) return;
    const res = await fetch(`/api/rewards/my-stats?email=${encodeURIComponent(user.email)}`);
    if (res.ok) setStats(await res.json());
  }, [user?.email]);

  useEffect(() => {
    fetchGames();
    fetchStats();
    fetch("/api/rewards/leaderboard")
      .then(r => r.ok ? r.json() : [])
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, [fetchGames, fetchStats]);

  useEffect(()=>{if(!user)return;let active=true;getToken().then(token=>token?fetch("/api/rewards/streak",{headers:{Authorization:`Bearer ${token}`}}):null).then(r=>r?.ok?r.json():null).then(data=>{if(active&&data)setStreak(data)}).catch(()=>{});return()=>{active=false};},[user?.email,getToken]);
  function playCelebrationTone(){
    if(!soundEnabled)return;
    try{
      const AudioContextClass=window.AudioContext;
      if(!AudioContextClass)return;
      const context=new AudioContextClass(),notes=[523.25,659.25,783.99];
      notes.forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,context.currentTime+i*.12);gain.gain.exponentialRampToValueAtTime(.065,context.currentTime+i*.12+.025);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+i*.12+.19);oscillator.connect(gain).connect(context.destination);oscillator.start(context.currentTime+i*.12);oscillator.stop(context.currentTime+i*.12+.2)});
      window.setTimeout(()=>void context.close(),900);
    }catch{/* Audio is optional and should never interfere with rewards. */}
  }
  function handleResult(res: { won: boolean; creditsEarned: number; message: string; playsRemaining: number }) {
    if(res.won&&res.creditsEarned>0)playCelebrationTone();
    if(user)getToken().then(token=>token?fetch("/api/rewards/streak",{headers:{Authorization:`Bearer ${token}`}}):null).then(r=>r?.ok?r.json():null).then(data=>{if(data)setStreak(data)}).catch(()=>{});
    if (res.creditsEarned > 0) refreshBalance?.();
    fetchStats();
    fetchGames();
  }

  const enabledGames = games.filter(g => g.enabled && g.id !== "daily-checkin");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col bazunk-rewards-arcade bz-rewards-clean">
      <Navbar />

      <CompactPageHero kind="rewards" eyebrow="Rewards Arcade" title="Rewards Arcade" description="Play mini-games, earn credits and unlock marketplace rewards." art="🏆" aside={user?<><strong>{stats.totalCredits} credits</strong><small>+{stats.todayCredits} earned today</small></>:undefined}>
        <a href="#arcade-games" className="bz-hero-chip">🎮 Explore games</a>
        <Link href="/credits" className="bz-hero-chip">🎁 My credits</Link>
      </CompactPageHero>

      <main id="arcade-games" className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button type="button" onClick={()=>setSoundEnabled(v=>!v)} aria-pressed={soundEnabled} className="bz-arcade-sound-toggle rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>} Sound {soundEnabled?"on":"off"}</button>
          {streak&&<div className="rounded-xl border border-orange-200 bg-orange-50 text-orange-950 px-4 py-2 text-sm font-bold flex items-center gap-2"><Flame size={17}/> {streak.streak}-day playing streak {streak.playedToday?"· Played today":"· Play to continue"}</div>}
        </div>
        {user && <Link href="/rewards/referrals" className="mb-6 block rounded-2xl bg-gradient-to-r from-[#F26B21] to-[#4A5CE8] text-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><p className="font-black text-lg">Invite a friend — you both earn credits</p><p className="text-white/80 text-sm">Earn again when your friend makes their first purchase and starts selling.</p></div><ChevronRight className="shrink-0" /></div></Link>}
        {!user && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-2xl border border-[#F26B21]/20 p-5">
            <div className="w-11 h-11 rounded-full bg-[#F26B21]/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[#F26B21]" />
            </div>
            <div className="flex-1">
              <p className="font-black text-gray-900">Free to join — sign in to start earning</p>
              <p className="text-sm text-gray-500">Have a look at today's games below. Create an account or sign in to play and collect credits every day.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/sign-in" className="px-5 py-2.5 rounded-xl bg-[#1A1D2E] text-white text-sm font-bold hover:opacity-90 transition-opacity">Sign In</Link>
              <Link href="/sign-up" className="px-5 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity">Join Free</Link>
            </div>
          </div>
        )}
        {(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Games grid */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-[#F26B21]" />
                <h2 className="text-lg font-black text-gray-900">Today's Games</h2>
                <span className="text-xs text-gray-400 ml-auto">Resets at midnight</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                </div>
              ) : enabledGames.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                  <Gift className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p>The arcade is taking a break. More games will be available soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enabledGames.map((game, i) => {
                    const Icon = ICON_MAP[game.id] ?? ICON_MAP[game.icon] ?? Gift;
                    const done = game.playsRemaining === 0;
                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`arcade-game-card bz-enhanced-game-card bg-white rounded-2xl border p-5 flex flex-col transition-all ${done ? "border-gray-100 opacity-75" : "border-gray-100 hover:border-gray-200 hover:shadow-md"}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`bz-reward-game-icon bz-reward-icon-${game.id} ${ICON_BG[game.id]} flex items-center justify-center`}><span className="bz-reward-icon-emoji" aria-hidden="true">{({ "spin-wheel":"🎡","scratch-card":"🎟️","memory-match":"🧩","treasure-tap":"🧰","parcel-dash":"📦" } as Record<string,string>)[game.id] || ({"daily-quiz":"🧠","mystery-box":"🎁","lucky-number":"🎲","daily-checkin":"🎉"} as Record<string,string>)[game.id] || "🎮"}</span><span className="sr-only">
                            <Icon className={`w-5 h-5 ${ICON_COLOR[game.id]}`} /></span>
                          </div>
                          {done ? (
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Done today
                            </span>
                          ) : (
                            <span className="text-[10px] font-black bg-gray-50 text-gray-500 px-2 py-1 rounded-full">
                              {game.playsRemaining}/{game.dailyPlaysPerUser} left
                            </span>
                          )}
                        </div>

                        <h3 className="font-black text-gray-900 dark:text-white text-lg mb-1">{game.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed flex-1 mb-4">{game.description}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-600">
                            {game.creditsMin === game.creditsMax
                              ? `+${game.creditsMax} credits`
                              : `+${game.creditsMin}–${game.creditsMax} credits`}
                          </span>
                          <span className="text-xs text-gray-400">{game.dailyPlaysPerUser}× per day</span>
                        </div>

                        {!user ? (
                          <Link href="/sign-in" className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#F26B21] text-white hover:opacity-90 transition-opacity">
                            <Lock className="w-3.5 h-3.5" /> Sign in to play
                          </Link>
                        ) : (
                        <button
                          onClick={() => !done && setActiveGame(game)}
                          disabled={done}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            done
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : `bg-[#1A1D2E] text-white hover:opacity-90`
                          }`}
                        >
                          {done ? <><Lock className="w-3.5 h-3.5" /> Played</> : <><Zap className="w-3.5 h-3.5" /> Play Now</>}
                        </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {user && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-4 h-4 text-[#F26B21]" />
                  <h3 className="font-black text-gray-900 text-sm">My Earnings</h3>
                </div>
                <p className="text-4xl font-black text-[#F26B21] mb-1">{stats.totalCredits}</p>
                <p className="text-xs text-gray-400">credits earned from games</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">Today</p>
                  <p className="text-lg font-black text-gray-900">+{stats.todayCredits} credits</p>
                </div>
                <Link href="/credits" className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#4A5CE8] hover:underline">
                  Spend credits <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="font-black text-gray-900 text-sm">Leaderboard</h3>
                  <button type="button" className="ml-auto text-xs text-blue-700 font-bold" onClick={()=>setLeaderboardScope(v=>v==="top5"?"all":"top5")}>{leaderboardScope==="top5"?"Show top 10":"Show top 5"}</button>
                </div>
                {lbLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No players yet — be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.slice(0,leaderboardScope==="top5"?5:10).map((entry, i) => {
                      const isMe = entry.user_email === user?.email;
                      const medals = ["🥇", "🥈", "🥉"];
                      const handle = entry.user_email.split("@")[0].slice(0, 12);
                      return (
                        <div key={entry.user_email} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                          <span className="text-base w-6 text-center">{medals[i] ?? `${i + 1}`}</span>
                          {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className={`text-sm flex-1 truncate ${isMe ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                            {isMe ? "You" : handle}
                          </span>
                          <span className="text-xs font-black text-amber-600">{entry.total_credits} pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-[#1A1D2E] rounded-2xl p-5">
                <p className="font-bold text-white text-sm mb-2">How it works</p>
                <ol className="space-y-1.5 text-xs text-white/60">
                  <li className="flex gap-2"><span className="text-[#F26B21] font-bold shrink-0">1.</span> Pick any game from the cards above.</li>
                  <li className="flex gap-2"><span className="text-[#F26B21] font-bold shrink-0">2.</span> Complete the challenge to earn credits.</li>
                  <li className="flex gap-2"><span className="text-[#F26B21] font-bold shrink-0">3.</span> Credits go straight to your account balance.</li>
                  <li className="flex gap-2"><span className="text-[#F26B21] font-bold shrink-0">4.</span> Play limits reset every midnight UTC.</li>
                </ol>
              </div>
              <div className="bz-rewards-ad-placement"><AdSlot slotKey="rewards_right" /></div>

            </div>
          </div>
        )}
      </main>

      <Footer />

      {createPortal(
        <AnimatePresence>
          {activeGame && (
            <GameModal
              game={activeGame}
              onClose={() => setActiveGame(null)}
              onResult={handleResult}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
