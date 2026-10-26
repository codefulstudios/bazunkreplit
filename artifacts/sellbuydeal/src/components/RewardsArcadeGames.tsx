import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Props = { onPlay: (answer?: unknown) => Promise<void> };
const symbols = ["📦","🪙","🎁","⭐","⚡","🛍️","🏆","💎"];

export function MemoryMatchGame({ onPlay }: Props) {
  const [deck, setDeck] = useState<number[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(90);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    if (!started || finished || seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(t);
  }, [started, finished, seconds]);
  function start() {
    const values = [...symbols.keys(), ...symbols.keys()];
    for (let i=values.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [values[i],values[j]]=[values[j],values[i]]; }
    setDeck(values);setFlipped([]);setMatched([]);setMoves(0);setSeconds(90);setFinished(false);setStarted(true);locked.current=false;
  }
  function flip(i:number) {
    if (!started || finished || seconds===0 || locked.current || matched.includes(i) || flipped.includes(i)) return;
    const next=[...flipped,i];setFlipped(next);
    if(next.length===2) {
      locked.current=true;setMoves(n=>n+1);
      if(deck[next[0]]===deck[next[1]]) {
        const all=[...matched,...next];setMatched(all);
        window.setTimeout(()=>{setFlipped([]);locked.current=false;if(all.length===16){setFinished(true);void onPlay({completed:true,score:Math.max(1,100-moves*3),duration:90-seconds});}},550);
      } else window.setTimeout(()=>{setFlipped([]);locked.current=false;},850);
    }
  }
  return <div className="arcade-game">
    <div className="arcade-scorebar"><span>⏱️ {seconds}s</span><span>🎯 {moves} moves</span><span>⭐ {matched.length/2}/8 pairs</span></div>
    {!started ? <div className="arcade-intro"><div className="text-6xl mb-3">🎁 🪙 ⭐</div><p>Match all eight pairs before the timer runs out.</p><button onClick={start} className="arcade-orange-button">▶ Start Memory Match</button></div> :
      <div className="arcade-memory-grid">{deck.map((symbol,i) => <motion.button type="button" whileTap={{scale:.95}} key={i} onClick={()=>flip(i)} disabled={finished||seconds===0} aria-label={flipped.includes(i)||matched.includes(i)?symbols[symbol]:"Hidden card"} className={`arcade-memory-tile ${flipped.includes(i)||matched.includes(i)?"revealed":""} ${matched.includes(i)?"matched":""}`}>{flipped.includes(i)||matched.includes(i)?symbols[symbol]:"B"}</motion.button>)}</div>}
    {started&&seconds===0&&!finished&&<div role="status" className="arcade-status">Time up! <button className="underline" onClick={start}>Try again</button></div>}
    {finished&&<p role="status" className="arcade-status">🎉 All pairs matched! Your reward is being processed.</p>}
  </div>;
}

export function TreasureTapGame({ onPlay }: Props) {
  const [time,setTime]=useState(30),[active,setActive]=useState(false),[score,setScore]=useState(0),[target,setTarget]=useState(0),[bomb,setBomb]=useState(false),[done,setDone]=useState(false);
  const scoreRef=useRef(0),busy=useRef(false);
  useEffect(()=>{
    if(!active)return;
    const pop=setInterval(()=>{setTarget(Math.floor(Math.random()*9));setBomb(Math.random()<.26);},700);
    const clock=setInterval(()=>setTime(t=>Math.max(0,t-1)),1000);
    return ()=>{clearInterval(pop);clearInterval(clock)};
  },[active]);
  useEffect(()=>{
    if(time===0&&active&&!busy.current){busy.current=true;setActive(false);setDone(true);void onPlay({completed:true,score:scoreRef.current,duration:30});}
  },[time,active,onPlay]);
  function start(){scoreRef.current=0;busy.current=false;setScore(0);setTime(30);setActive(true);setDone(false);}
  function tap(i:number){if(!active||i!==target)return;const value=bomb?-20:10;scoreRef.current=Math.max(0,scoreRef.current+value);setScore(scoreRef.current);setTarget(-1);}
  return <div className="arcade-game"><div className="arcade-scorebar"><span>⏱️ {time}s</span><span>⭐ {score} score</span><span>💰 Tap treasures!</span></div>
    <div className="arcade-treasure-scene"><h3>🏝️ TREASURE TAP 🏴‍☠️</h3><p>Tap treasure chests and avoid bombs!</p>
    <div className="arcade-treasure-grid">{Array.from({length:9},(_,i)=><motion.button whileTap={{scale:.88}} key={i} type="button" disabled={!active} aria-label={active&&target===i?(bomb?"Bomb":"Treasure"):"Empty hole"} onClick={()=>tap(i)} className="arcade-treasure-hole">{active&&target===i?(bomb?"💣":"🎁"):"🕳️"}</motion.button>)}</div></div>
    {!active&&!done&&<button onClick={start} className="arcade-orange-button">▶ Tap to Play</button>}
    {done&&<p role="status" className="arcade-status">🏆 Final score: {score}. Reward processing…</p>}
  </div>;
}

export function ParcelDashGame({ onPlay }: Props) {
  const [playing,setPlaying]=useState(false),[distance,setDistance]=useState(0),[stars,setStars]=useState(0),[lives,setLives]=useState(3),[jump,setJump]=useState(false),[finished,setFinished]=useState(false);
  const jumpRef=useRef(false), scoreRef=useRef({distance:0,stars:0,lives:3}),busy=useRef(false);
  const jumpNow=()=>{if(!playing||jumpRef.current)return;jumpRef.current=true;setJump(true);window.setTimeout(()=>{jumpRef.current=false;setJump(false)},650);};
  useEffect(()=>{
    if(!playing)return;
    const handler=(e:KeyboardEvent)=>{if(e.code==="Space"||e.key==="ArrowUp"){e.preventDefault();jumpNow();}};
    window.addEventListener("keydown",handler);
    const t=setInterval(()=>{
      const d=scoreRef.current.distance+10;
      const st=scoreRef.current.stars+(Math.random()<.35?1:0);
      const life=Math.max(0,scoreRef.current.lives-(!jumpRef.current&&Math.random()<.11?1:0));
      scoreRef.current={distance:d,stars:st,lives:life};setDistance(d);setStars(st);setLives(life);
      if((life===0||d>=1000)&&!busy.current){busy.current=true;setPlaying(false);setFinished(true);void onPlay({completed:true,score:d+st*10,distance:d,stars:st});}
    },300);
    return ()=>{window.removeEventListener("keydown",handler);clearInterval(t)};
  },[playing,onPlay]);
  function start(){scoreRef.current={distance:0,stars:0,lives:3};busy.current=false;setDistance(0);setStars(0);setLives(3);setFinished(false);setPlaying(true);}
  return <div className="arcade-game"><div className="arcade-scorebar"><span>🏃 {distance}m</span><span>⭐ {stars}</span><span>❤️ {lives}/3</span></div>
    <div className="arcade-runner-scene" onPointerDown={jumpNow} role="img" aria-label="Animated parcel runner crossing a market street">
      <div className="arcade-runner-cloud">☁️ ☁️ ☀️</div><div className="arcade-runner-shop">🏪 🏬 🏠 🛒 🏪</div>
      <motion.div className="arcade-runner-character" animate={{y:jump?-95:0,rotate:jump?-10:0}} transition={{duration:.25}}>📦</motion.div>
      <div className="arcade-runner-coins">🪙 ⭐ 🪙 ⭐</div><div className="arcade-runner-obstacles">📦 🚧 📦 🚧</div>
      <div className="arcade-runner-road"/></div>
    {playing?<button type="button" className="arcade-orange-button" onClick={jumpNow}>⬆ Jump · Space / Tap</button>:!finished?<button className="arcade-orange-button" onClick={start}>▶ Play Parcel Dash</button>:<p role="status" className="arcade-status">🏆 {distance}m · {stars} stars. Reward processing…</p>}
  </div>;
}
