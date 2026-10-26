import { recordCreditEconomy } from "../lib/creditEconomy.js";
import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();

// ── Rotating content ────────────────────────────────────────────────────────

const QUIZ_QUESTIONS = [
  { q: "What does P2P stand for?",                       options: ["Pay to Play", "Peer to Peer", "Product to Product", "Price to Pay"], answer: 1 },
  { q: "What does 'BIN' mean in online auctions?",       options: ["Buy It Now", "Bid in Now", "Best in Network", "Buyer Interest Notice"], answer: 0 },
  { q: "How many credits equal £1 on Bazunk?",           options: ["10", "50", "100", "200"], answer: 2 },
  { q: "What is a 'flash sale'?",                        options: ["A sale with flashing lights", "A very short time-limited sale", "A discount on electronics", "A hidden sale"], answer: 1 },
  { q: "What does 'VGC' mean in listings?",              options: ["Very Good Condition", "Value Guaranteed Cost", "Verified Grade C", "Very Good Choice"], answer: 0 },
  { q: "Which UK city is known as the 'Second City'?",   options: ["Manchester", "Birmingham", "Leeds", "Liverpool"], answer: 1 },
  { q: "What protects buyers if an item doesn't arrive?",options: ["Seller rating", "Buyer Protection", "Cashback", "Credits"], answer: 1 },
  { q: "What is an auction reserve price?",              options: ["The highest bid", "The starting price", "The minimum price the seller will accept", "The buyer's max bid"], answer: 2 },
];

const SCRAMBLE_WORDS = [
  { word: "AUCTION",   category: "marketplace" },
  { word: "LISTING",   category: "marketplace" },
  { word: "CREDITS",   category: "rewards"     },
  { word: "BIDDING",   category: "marketplace" },
  { word: "SELLERS",   category: "users"       },
  { word: "PAYMENT",   category: "finance"     },
  { word: "REVIEWS",   category: "feedback"    },
  { word: "DELIVER",   category: "shipping"    },
  { word: "BARGAIN",   category: "deals"       },
  { word: "MARKETS",   category: "marketplace" },
  { word: "PROTECT",   category: "safety"      },
  { word: "VINTAGE",   category: "categories"  },
];

function getDayIndex() {
  return Math.floor(Date.now() / 86400000);
}

function getTodayQuiz() {
  return QUIZ_QUESTIONS[getDayIndex() % QUIZ_QUESTIONS.length];
}

function getTodayScramble() {
  const entry = SCRAMBLE_WORDS[getDayIndex() % SCRAMBLE_WORDS.length];
  const arr = entry.word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join("") === entry.word
    ? arr.reverse().join("")
    : arr.join("");
  return { word: entry.word, scrambled, category: entry.category };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKLY_CAP_CREDITS = 150;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getWeekEarned(email: string): Promise<number> {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(credits_earned), 0)::int AS total
    FROM reward_plays
    WHERE user_email = ${email} AND played_at >= ${weekStart.toISOString()}
  `);
  return (r.rows[0] as Record<string, unknown>)?.total as number ?? 0;
}

async function getTodayPlays(gameId: string, email: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM reward_plays
    WHERE game_id = ${gameId} AND user_email = ${email} AND played_at >= ${todayStart.toISOString()}
  `);
  return (r.rows[0] as Record<string, unknown>)?.cnt as number ?? 0;
}

// ── Public routes ─────────────────────────────────────────────────────────────

router.get("/rewards/games", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  const games = await db.execute(sql`SELECT * FROM reward_games WHERE id <> 'daily-checkin' ORDER BY created_at ASC`);

  const result = await Promise.all(games.rows.map(async (g: Record<string, unknown>) => {
    const todayPlays = email ? await getTodayPlays(g.id as string, email) : 0;
    const dailyLimit = g.daily_plays_per_user as number;
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      icon: g.icon,
      enabled: g.enabled,
      creditsMin: g.credits_min,
      creditsMax: g.credits_max,
      dailyPlaysPerUser: dailyLimit,
      todayPlays,
      playsRemaining: Math.max(0, dailyLimit - todayPlays),
    };
  }));
  res.json(result);
});

router.get("/rewards/quiz-today", (_req, res) => {
  const q = getTodayQuiz();
  res.json({ question: q.q, options: q.options });
});

router.get("/rewards/scramble-today", (_req, res) => {
  const s = getTodayScramble();
  res.json({ scrambled: s.scrambled, category: s.category });
});

router.get("/rewards/leaderboard", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT user_email, SUM(credits_earned)::int AS total_credits
    FROM reward_plays
    GROUP BY user_email
    ORDER BY total_credits DESC LIMIT 10
  `);
  res.json(rows.rows);
});

router.get("/rewards/my-stats", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const [tot, tod, wk] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS total FROM reward_plays WHERE user_email = ${email}`),
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS today FROM reward_plays WHERE user_email = ${email} AND played_at >= ${todayStart.toISOString()}`),
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS week FROM reward_plays WHERE user_email = ${email} AND played_at >= ${weekStart.toISOString()}`),
  ]);
  const weeklyEarned = (wk.rows[0] as Record<string, unknown>)?.week as number ?? 0;
  res.json({
    totalCredits: (tot.rows[0] as Record<string, unknown>)?.total ?? 0,
    todayCredits: (tod.rows[0] as Record<string, unknown>)?.today ?? 0,
    weeklyEarned,
    weeklyCapRemaining: Math.max(0, WEEKLY_CAP_CREDITS - weeklyEarned),
    weeklyCap: WEEKLY_CAP_CREDITS,
  });
});


router.post("/rewards/play",(_req,res)=>{res.status(410).json({error:"Reload to use secure reward sessions"});});
async function identity(req:import("express").Request){const a=getAuth(req);if(!a.isAuthenticated||!a.userId)return null;const u=await clerkClient.users.getUser(a.userId);return u.primaryEmailAddress?.emailAddress?.trim().toLowerCase()||null;}
const startWeek=()=>{const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString();};
router.post("/rewards/session/start",async(req,res)=>{
try{
 const email=await identity(req),gameId=String(req.body?.gameId||"");
 if(!email)return void res.status(401).json({error:"Sign in required"});
 if(!["spin-wheel","scratch-card","daily-quiz","mystery-box","lucky-number","memory-match","treasure-tap","parcel-dash"].includes(gameId))return void res.status(400).json({error:"Invalid game"});
 const value=await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`);
  const gs=await tx.execute(sql`SELECT * FROM reward_games WHERE id=${gameId} AND enabled=TRUE`);const g=gs.rows[0] as Record<string,any>|undefined;if(!g)return {error:"Game disabled"};
  const n=await tx.execute(sql`SELECT COUNT(*)::int n FROM reward_game_sessions WHERE user_email=${email} AND game_id=${gameId} AND issued_at>=date_trunc('day',now()) AND status<>'expired'`);
  if(Number((n.rows[0] as any).n)>=Number(g.daily_plays_per_user))return {error:"Daily limit reached"};
  const w=await tx.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int n FROM reward_plays WHERE user_email=${email} AND played_at>=${startWeek()}::timestamptz`);
  if(Number((w.rows[0] as any).n)>=WEEKLY_CAP_CREDITS)return {error:"Weekly cap reached"};
  const min=Math.max(0,Number(g.credits_min)),max=Math.max(min,Number(g.credits_max)),id=randomUUID();
  let prize=min;if(gameId==="spin-wheel")prize=min+5*Math.floor(Math.random()*(Math.floor((max-min)/5)+1));if(gameId==="scratch-card")prize=Math.random()<.7?min+Math.floor(Math.random()*(max-min+1)):0;if(gameId==="daily-quiz"||gameId==="lucky-number")prize=max;
  const secret=JSON.stringify({answer:gameId==="daily-quiz"?getTodayQuiz().answer:null,draw:gameId==="lucky-number"?1+Math.floor(Math.random()*6):null});
  await tx.execute(sql`INSERT INTO reward_game_sessions(id,user_email,game_id,server_result,prize_credits,expires_at) VALUES(${id}::uuid,${email},${gameId},${secret}::jsonb,${prize},now()+INTERVAL '5 minutes')`);
  return {sessionId:id};
 });
 if("error" in value)return void res.status(429).json(value);
 res.json(value);
}catch(e){logger.error({e},"Session start");res.status(500).json({error:"Session unavailable"});}
});
router.post("/rewards/session/complete",async(req,res)=>{
try{
 const email=await identity(req),id=String(req.body?.sessionId||"");if(!email)return void res.status(401).json({error:"Sign in required"});
 if(!/^[\da-f-]{36}$/i.test(id))return void res.status(400).json({error:"Invalid session"});
 const value=await db.transaction(async tx=>{
  const rr=await tx.execute(sql`SELECT *,EXTRACT(EPOCH FROM now()-issued_at) elapsed FROM reward_game_sessions WHERE id=${id}::uuid FOR UPDATE`);const ss=rr.rows[0] as Record<string,any>|undefined;
  if(!ss||ss.user_email!==email)return {status:404,error:"Session not found"};
  if(ss.status==="completed"||ss.status==="claimed")return {status:200,ok:true};
  if(ss.status!=="started"||new Date(ss.expires_at)<new Date())return {status:410,error:"Session expired"};
  const a=req.body?.answer,t=String(ss.game_id),elapsed=Number(ss.elapsed),info=(a&&typeof a==="object")?a as Record<string,any>:{};
  if(t==="memory-match"&&(!info.completed||elapsed<8||elapsed>180||Number(info.score)>100))return {status:422,error:"Invalid completion"};
  if(t==="treasure-tap"&&(!info.completed||elapsed<25||elapsed>120||Number(info.duration)!==30))return {status:422,error:"Invalid completion"};
  if(t==="parcel-dash"&&(!info.completed||elapsed<5||elapsed>240||Number(info.distance)>1200))return {status:422,error:"Invalid completion"};
  if(t==="daily-quiz"&&a!==ss.server_result.answer)return {status:422,error:"Wrong answer"};
  if(t==="lucky-number"&&(!Number.isInteger(Number(a))||Number(a)<1||Number(a)>6))return {status:422,error:"Invalid number"};
  if((t==="spin-wheel"||t==="scratch-card")&&elapsed<1)return {status:422,error:"Reveal not finished"};
  let prize=Number(ss.prize_credits);if(t==="lucky-number"&&Number(a)!==ss.server_result.draw)prize=Math.min(5,prize);
  await tx.execute(sql`UPDATE reward_game_sessions SET status='completed',completed_at=now(),telemetry=${JSON.stringify(info)}::jsonb,prize_credits=${prize} WHERE id=${id}::uuid`);
  return {status:200,ok:true};
 });
 res.status(value.status).json(value);
}catch(e){logger.error({e},"Session complete");res.status(500).json({error:"Completion unavailable"});}
});
router.post("/rewards/session/claim",async(req,res)=>{
try{
 const email=await identity(req),id=String(req.body?.sessionId||"");if(!email)return void res.status(401).json({error:"Sign in required"});
 if(!/^[\da-f-]{36}$/i.test(id))return void res.status(400).json({error:"Invalid session"});
 await ensureCreditEconomyTable();
 const value=await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`);
  const rr=await tx.execute(sql`SELECT * FROM reward_game_sessions WHERE id=${id}::uuid FOR UPDATE`);const ss=rr.rows[0] as Record<string,any>|undefined;
  if(!ss||ss.user_email!==email)return {status:404,error:"Session not found"};
  const prior=await tx.execute(sql`SELECT credits_earned FROM reward_plays WHERE session_id=${id}::uuid`);
  if(ss.status==="claimed"&&prior.rows.length)return {status:200,ok:true,creditsEarned:Number((prior.rows[0] as any).credits_earned)};
  if(ss.status!=="completed")return {status:409,error:"Game incomplete"};
  if(new Date(ss.expires_at)<new Date())return {status:410,error:"Session expired"};
  const gameId=String(ss.game_id);const gs=await tx.execute(sql`SELECT * FROM reward_games WHERE id=${gameId} AND enabled=TRUE`);const game=gs.rows[0] as Record<string,any>|undefined;
  if(!game)return {status:403,error:"Game disabled"};
  const n=await tx.execute(sql`SELECT COUNT(*)::int n FROM reward_plays WHERE user_email=${email} AND game_id=${gameId} AND played_at>=date_trunc('day',now())`);
  if(Number((n.rows[0] as any).n)>=Number(game.daily_plays_per_user))return {status:429,error:"Daily limit reached"};
  const w=await tx.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int n FROM reward_plays WHERE user_email=${email} AND played_at>=${startWeek()}::timestamptz`);
  const amount=Math.min(Number(ss.prize_credits),Math.max(0,WEEKLY_CAP_CREDITS-Number((w.rows[0] as any).n)));
  const playId="RP-"+randomUUID().slice(0,8).toUpperCase();
  await tx.execute(sql`INSERT INTO reward_plays(id,game_id,user_email,credits_earned,played_at,session_id) VALUES(${playId},${gameId},${email},${amount},now(),${id}::uuid)`);
  if(amount>0){
   const upd=await tx.execute(sql`UPDATE users SET credits=credits+${amount/100} WHERE lower(email)=${email} RETURNING email`);if(!upd.rows.length)throw new Error("Account not found");
   const lid=randomUUID(),reason="Rewards Arcade: "+String(game.name),metadata=JSON.stringify({gameId,sessionId:id});
   await tx.execute(sql`INSERT INTO credit_economy_ledger(id,email,kind,credits,reason,reference_type,reference_id,metadata) VALUES(${lid},${email},'earned',${amount/100},${reason},'reward_play',${playId},${metadata}::jsonb)`);
  }
  await tx.execute(sql`UPDATE reward_game_sessions SET status='claimed',claimed_at=now(),idempotency_key=${id} WHERE id=${id}::uuid`);
  return {status:200,ok:true,creditsEarned:amount};
 });
 if(!value.ok)return void res.status(value.status).json(value);
 const balance=await storage.getCredits(email);
 res.json({...value,won:value.creditsEarned>0,message:value.creditsEarned>0?"You earned "+value.creditsEarned+" credits!":"No credits this time.",newBalance:balance,newBalanceCredits:Math.round(balance*100)});
}catch(e){logger.error({e},"Session claim");res.status(500).json({error:"Claim unavailable"});}
});
// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/rewards/games", requireAdmin, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const games = await db.execute(sql`SELECT * FROM reward_games ORDER BY created_at ASC`);
  res.json(games.rows);
});

router.patch("/admin/rewards/games/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { enabled, creditsMin, creditsMax, dailyPlaysPerUser } = req.body as {
    enabled?: boolean; creditsMin?: number; creditsMax?: number; dailyPlaysPerUser?: number;
  };
  await db.execute(sql`
    UPDATE reward_games SET
      enabled = COALESCE(${enabled ?? null}, enabled),
      credits_min = COALESCE(${creditsMin ?? null}, credits_min),
      credits_max = COALESCE(${creditsMax ?? null}, credits_max),
      daily_plays_per_user = COALESCE(${dailyPlaysPerUser ?? null}, daily_plays_per_user),
      updated_at = NOW()
    WHERE id = ${id}
  `);
  const updated = await db.execute(sql`SELECT * FROM reward_games WHERE id = ${id}`);
  res.json(updated.rows[0] ?? { error: "not found" });
});

export default router;
