import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, RotateCcw, HelpCircle, Gift, Type,
  Coins, Trophy, Crown, ChevronRight, Loader2,
  CheckCircle2, XCircle, Zap, Star, Lock,
  CalendarCheck, Brain, Ticket, PackageOpen, Dices,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
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
};

const ICON_BG: Record<string, string> = {
  "daily-checkin":  "bg-emerald-50",
  "spin-wheel":     "bg-purple-50",
  "daily-quiz":     "bg-blue-50",
  "scratch-card":   "bg-orange-50",
  "mystery-box":    "bg-pink-50",
  "lucky-number":   "bg-amber-50",
};

const ICON_COLOR: Record<string, string> = {
  "daily-checkin":  "text-emerald-500",
  "spin-wheel":     "text-purple-500",
  "daily-quiz":     "text-blue-500",
  "scratch-card":   "text-orange-500",
  "mystery-box":    "text-pink-500",
  "lucky-number":   "text-amber-500",
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
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-center text-sm font-medium text-gray-600">Give the wheel a spin to reveal your reward!</p>
      <div className="relative w-[min(72vw,288px)] aspect-square rounded-full p-2 bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 shadow-[0_12px_35px_rgba(245,158,11,.25)]">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg" aria-hidden="true"><div className="w-0 h-0 border-l-[13px] border-r-[13px] border-t-[27px] border-l-transparent border-r-transparent border-t-orange-600" /></div>
        <motion.div className="w-full h-full rounded-full border-[5px] border-white shadow-inner relative overflow-hidden" animate={{ rotate: angle }} transition={{ duration: 3.4, ease: [0.12, 0.75, 0.12, 1] }}
          style={{ background: `conic-gradient(from -22.5deg, ${colors.map((color,i)=>`${color} ${i*45}deg ${(i+1)*45}deg`).join(", ")})` }}>
          {segments.map((val,i) => <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i*45}deg)` }}>
            <span className="absolute top-[13%] left-1/2 -translate-x-1/2 text-white text-base sm:text-lg font-black drop-shadow-md" style={{ textShadow:"0 1px 3px #2229" }}>{val}</span>
          </div>)}
          <div className="absolute inset-[39%] rounded-full bg-white border-4 border-amber-300 flex items-center justify-center shadow-lg"><Star className="w-6 h-6 text-orange-500 fill-orange-400" /></div>
        </motion.div>
      </div>
      <button onClick={spin} disabled={spinning} className="min-w-44 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-base shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2">
        {spinning ? <><Loader2 className="w-5 h-5 animate-spin" /> Spinning…</> : <><RotateCcw className="w-5 h-5" /> SPIN NOW</>}
      </button>
      <p className="text-sm font-semibold text-gray-600">Prizes: {game.creditsMin}–{game.creditsMax} credits</p>
      <p className="text-xs text-gray-500 text-center">Your actual prize is determined securely when the spin completes.</p>
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
    <div className="space-y-4">
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="rounded-2xl bg-blue-50 border border-blue-200 p-4"><Brain className="w-7 h-7 text-blue-600 mb-2"/><p className="font-bold text-gray-900 text-lg">{question.question}</p></motion.div>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <motion.button
            key={i}
            initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.09}} whileHover={{scale:1.015}} whileTap={{scale:.98}}
            onClick={() => setSelected(i)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              selected === i ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            <span className="font-bold text-gray-400 mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
          </motion.button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={selected === null || submitting}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Submit Answer"}
      </button>
      <p className="text-xs text-gray-400 text-center">+{game.creditsMax} credits for a correct answer</p>
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
  return <div className="flex flex-col items-center gap-4 py-2">
    <p className="text-center text-base font-semibold text-gray-700">Scratch away the silver coating to reveal your surprise!</p>
    <div className="relative w-full max-w-[320px] aspect-[320/190] rounded-2xl overflow-hidden border-[5px] border-amber-400 shadow-[0_12px_30px_rgba(245,158,11,.3)] select-none" style={{background:"linear-gradient(135deg,#6d28d9,#c026d3 55%,#f97316)"}}>
      <div className="absolute inset-0 flex flex-col justify-center items-center text-white gap-2">
        <motion.div animate={{rotate:[-8,8,-8],scale:[1,1.15,1]}} transition={{duration:1.6,repeat:Infinity}}><Gift className="w-14 h-14 text-yellow-200"/></motion.div>
        <span className="font-black text-2xl">BAZUNK BONUS!</span><span className="text-sm font-bold">Keep scratching!</span>
      </div>
      {!revealed&&<canvas ref={canvasRef} width={320} height={190} aria-label="Scratch ticket coating. Drag or swipe to reveal." onPointerDown={e=>{dragging.current=true;last.current=null;e.currentTarget.setPointerCapture(e.pointerId);scratchAt(e);}} onPointerMove={scratchAt} onPointerUp={()=>{dragging.current=false;last.current=null;}} onPointerCancel={()=>{dragging.current=false;last.current=null;}} className="absolute inset-0 w-full h-full cursor-crosshair touch-none"/>}
    </div>
    <div className="w-full max-w-[320px] h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-orange-500 transition-all" style={{width:`${progress}%`}}/></div>
    <p className="text-sm font-bold text-gray-700">{revealing?"Checking your prize…":revealed?"Ticket revealed!":`${progress}% scratched · Reveal at 48%`}</p>
    <button type="button" disabled={revealing||revealed} onClick={finish} className="rounded-xl bg-violet-600 text-white px-6 py-3 font-bold disabled:opacity-50">Reveal without scratching</button>
    <p className="text-sm text-gray-600">70% chance to win 5–30 credits</p>
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
  async function choose(n:number){if(busy)return;setChosen(n);setBusy(true);try{await new Promise(r=>setTimeout(r,1100));await onPlay(n);}finally{setBusy(false);}}
  return <div className="py-4 text-center">
    <motion.div animate={{y:[0,-5,0]}} transition={{repeat:Infinity,duration:2.5}}><Gift className="w-12 h-12 mx-auto text-pink-500 mb-3"/></motion.div>
    <p className="font-black text-gray-900 text-lg mb-2">Choose your mystery box!</p>
    <p className="text-sm text-gray-600 mb-6">Three boxes, one surprise. Pick your favourite.</p>
    <div className="grid grid-cols-3 gap-3">{[1,2,3].map(n=><motion.button key={n} type="button" disabled={busy} onClick={()=>choose(n)} whileHover={!busy?{scale:1.09,y:-6}:undefined} whileTap={!busy?{scale:.94}:undefined}
      animate={chosen===n&&busy?{rotate:[0,-8,8,-6,6,0],scale:[1,1.15,1]}:{y:[0,-3,0]}} transition={chosen===n&&busy?{duration:.8}:{duration:2+n*.3,repeat:Infinity}}
      className="relative rounded-2xl border-2 border-pink-200 bg-gradient-to-b from-fuchsia-50 to-pink-100 py-7 sm:py-9 shadow-md disabled:cursor-wait focus-visible:ring-4 focus-visible:ring-pink-400">
      <span className="block text-4xl sm:text-5xl drop-shadow-md" aria-hidden="true">{chosen===n&&busy?"✨":"🎁"}</span><span className="block text-sm mt-3 font-black text-pink-800">BOX {n}</span>
    </motion.button>)}</div>
    <p className="mt-5 text-sm font-semibold text-gray-600">{busy?"Opening your mystery box…":"Tap a box to reveal your reward"}</p>
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
  const [result, setResult] = useState<{ won: boolean; creditsEarned: number; message: string; playsRemaining: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const Icon = ICON_MAP[game.id] ?? ICON_MAP[game.icon] ?? Gift;

  const play = useCallback(async (answer?: unknown) => {
    setError(null);
    try {
      const res = await fetch("/api/rewards/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, gameId: game.id, answer }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResult(data);
      onResult(data);
    } catch {
      setError("Network error — please try again");
    }
  }, [user?.email, game.id, onResult]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 flex items-center gap-3 border-b border-gray-100`}>
          <div className={`w-10 h-10 rounded-xl ${ICON_BG[game.id]} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${ICON_COLOR[game.id]}`} />
          </div>
          <div>
            <h2 className="font-black text-gray-900">{game.name}</h2>
            <p className="text-xs text-gray-400">{game.playsRemaining} play{game.playsRemaining !== 1 ? "s" : ""} remaining today</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center gap-4 py-4 text-center"
              >
                {result.won && <motion.div aria-hidden="true" initial={{opacity:0,scale:.6}} animate={{opacity:[0,1,0],scale:[.6,1.5,1.8]}} transition={{duration:1.5}} className="absolute inset-0 pointer-events-none flex justify-center items-start text-4xl">✨ 🎉 ✨</motion.div>}\n                {result.won ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-emerald-500 mb-1">+{result.creditsEarned} credits</p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                      <XCircle className="w-9 h-9 text-red-400" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900 mb-1">No credits this time</p>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </>
                )}
                <p className="text-xs text-gray-400">
                  {result.playsRemaining > 0
                    ? `${result.playsRemaining} play${result.playsRemaining !== 1 ? "s" : ""} remaining today`
                    : "Come back tomorrow for more!"}
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#1A1D2E] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {game.id === "daily-checkin" && (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 mb-1">Today's check-in</p>
                      <p className="text-sm text-gray-500">Tap below to collect your daily credits.</p>
                    </div>
                    <button
                      onClick={() => play()}
                      className="px-10 py-3 rounded-xl bg-emerald-500 text-white font-black text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" /> Collect {game.creditsMax} Credits
                    </button>
                  </div>
                )}
                {game.id === "spin-wheel" && <SpinWheelGame game={game} onPlay={play} />}
                {game.id === "daily-quiz" && <QuizGame game={game} onPlay={play} />}
                {game.id === "scratch-card" && <ScratchCardGame onPlay={play} />}
                {game.id === "mystery-box" && <MysteryBoxGame onPlay={play} />}
                {game.id === "lucky-number" && <LuckyNumberGame onPlay={play} />}
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

  function handleResult(res: { won: boolean; creditsEarned: number; message: string; playsRemaining: number }) {
    if (res.creditsEarned > 0) refreshBalance?.();
    fetchStats();
    fetchGames();
  }

  const enabledGames = games.filter(g => g.enabled);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-[#1A1D2E] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#4A5CE8]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-[#F26B21]/10 blur-3xl" />
        </div>
        <div className="relative container mx-auto max-w-5xl px-4 py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F26B21] flex items-center justify-center shadow-lg shadow-[#F26B21]/30">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <span className="text-[#F26B21] font-black text-sm uppercase tracking-widest">Daily Rewards</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                Play games. Earn credits.
              </h1>
              <p className="text-white/50 text-sm max-w-md leading-relaxed">
                Five daily mini-games — each one earns real credits you can spend on promotions and perks. New plays reset every midnight.
              </p>
            </div>

            {user && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 min-w-[200px] text-center border border-white/10 shrink-0">
                <Coins className="w-8 h-8 text-[#F26B21] mx-auto mb-2" />
                <p className="text-3xl font-black text-white">{stats.totalCredits}</p>
                <p className="text-white/50 text-xs mb-2">total credits earned via games</p>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm font-bold text-amber-400">+{stats.todayCredits} today</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
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
                  <p>No games are available right now — check back soon!</p>
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
                        className={`bg-white rounded-2xl border p-5 flex flex-col transition-all ${done ? "border-gray-100 opacity-75" : "border-gray-100 hover:border-gray-200 hover:shadow-md"}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-11 h-11 rounded-xl ${ICON_BG[game.id]} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${ICON_COLOR[game.id]}`} />
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

                        <h3 className="font-black text-gray-900 text-sm mb-1">{game.name}</h3>
                        <p className="text-xs text-gray-400 leading-snug flex-1 mb-4">{game.description}</p>

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
                </div>
                {lbLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No players yet — be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => {
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
            </div>
          </div>
        )}
      </main>

      <Footer />

      <AnimatePresence>
        {activeGame && (
          <GameModal
            game={activeGame}
            onClose={() => setActiveGame(null)}
            onResult={handleResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
