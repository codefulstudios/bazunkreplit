import { ensureCreditEconomyTable } from "../lib/creditEconomy.js";
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
],
  { q: "Largest ocean?", options: ["Atlantic","Indian","Pacific","Arctic"], answer: 2 },
  { q: "Tallest land animal?", options: ["Elephant","Giraffe","Camel","Ostrich"], answer: 1 },
  { q: "Capital of Japan?", options: ["Kyoto","Osaka","Tokyo","Hiroshima"], answer: 2 },
  { q: "Which planet is called the Red Planet?", options: ["Venus","Mars","Jupiter","Mercury"], answer: 1 },
  { q: "How many sides has a hexagon?", options: ["Five","Six","Seven","Eight"], answer: 1 },
  { q: "Fastest land animal?", options: ["Lion","Cheetah","Horse","Greyhound"], answer: 1 },
  { q: "Which bird can mimic human speech?", options: ["Eagle","Penguin","Parrot","Swan"], answer: 2 },
  { q: "Chemical symbol for gold?", options: ["Ag","Gd","Go","Au"], answer: 3 },
  { q: "The Statue of Liberty was a gift from which country?", options: ["France","Italy","Canada","Spain"], answer: 0 },
  { q: "Largest mammal on Earth?", options: ["Elephant","Blue whale","Giraffe","Whale shark"], answer: 1 },
  { q: "How many colours are traditionally named in a rainbow?", options: ["Five","Six","Seven","Eight"], answer: 2 },
  { q: "Which instrument has keys, pedals and strings?", options: ["Flute","Piano","Trumpet","Drum kit"], answer: 1 },
  { q: "Hardest naturally occurring mineral?", options: ["Quartz","Diamond","Granite","Topaz"], answer: 1 },
  { q: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"], answer: 2 },
  { q: "Main language spoken in Brazil?", options: ["Spanish","Portuguese","French","Italian"], answer: 1 },
  { q: "Which continent contains the Sahara Desert?", options: ["Asia","South America","Africa","Australia"], answer: 2 },
  { q: "Smallest prime number?", options: ["0","1","2","3"], answer: 2 },
  { q: "How many minutes are in two hours?", options: ["100","110","120","130"], answer: 2 },
  { q: "Which ocean lies between Africa and Australia?", options: ["Atlantic","Pacific","Indian","Arctic"], answer: 2 },
  { q: "Freezing point of water at standard pressure?", options: ["0°C","10°C","32°C","100°C"], answer: 0 },
  { q: "Which metal is liquid at ordinary room temperature?", options: ["Iron","Mercury","Copper","Aluminium"], answer: 1 },
  { q: "Largest planet in our solar system?", options: ["Saturn","Neptune","Jupiter","Earth"], answer: 2 },
  { q: "Which country is shaped like a boot?", options: ["Greece","Italy","Portugal","Croatia"], answer: 1 },
  { q: "Capital of Canada?", options: ["Toronto","Vancouver","Ottawa","Montreal"], answer: 2 },
  { q: "How many legs does a spider have?", options: ["Six","Eight","Ten","Twelve"], answer: 1 },
  { q: "Closest star to Earth?", options: ["Sirius","The Sun","Proxima Centauri","Polaris"], answer: 1 },
  { q: "What is the transformation of a caterpillar into a butterfly called?", options: ["Germination","Metamorphosis","Pollination","Fermentation"], answer: 1 },
  { q: "Largest hot desert in the world?", options: ["Gobi","Kalahari","Sahara","Arabian"], answer: 2 },
  { q: "Square root of 81?", options: ["7","8","9","10"], answer: 2 },
  { q: "Which blood cells help fight infection?", options: ["Red cells","White cells","Platelets","Plasma"], answer: 1 },
  { q: "Which famous ship sank on its maiden voyage in 1912?", options: ["Britannic","Lusitania","Titanic","Endurance"], answer: 2 },
  { q: "Capital of Australia?", options: ["Sydney","Melbourne","Canberra","Perth"], answer: 2 },
  { q: "Which material is made from tree bark?", options: ["Cork","Linen","Wool","Silk"], answer: 0 },
  { q: "Largest internal organ in the human body?", options: ["Heart","Liver","Lung","Kidney"], answer: 1 },
  { q: "Which planet has the most prominent ring system?", options: ["Mars","Venus","Saturn","Mercury"], answer: 2 },
  { q: "Currency of Japan?", options: ["Won","Yuan","Yen","Ringgit"], answer: 2 },
  { q: "How many degrees are in a right angle?", options: ["45","90","120","180"], answer: 1 },
  { q: "Which animal is called the ship of the desert?", options: ["Horse","Camel","Donkey","Llama"], answer: 1 },
  { q: "Which part of a plant usually absorbs water from soil?", options: ["Leaf","Flower","Root","Stem"], answer: 2 },
  { q: "Capital of Iceland?", options: ["Oslo","Helsinki","Reykjavik","Copenhagen"], answer: 2 },
  { q: "Which sport uses the terms love, deuce and ace?", options: ["Cricket","Tennis","Rugby","Golf"], answer: 1 },
  { q: "Largest bone in the human body?", options: ["Tibia","Humerus","Femur","Pelvis"], answer: 2 },
  { q: "Which country is home to Petra?", options: ["Egypt","Jordan","Turkey","Greece"], answer: 1 },
  { q: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen","Carbon dioxide","Nitrogen","Argon"], answer: 2 },
  { q: "What force pulls objects towards Earth?", options: ["Friction","Magnetism","Gravity","Buoyancy"], answer: 2 },
  { q: "Who painted the Mona Lisa?", options: ["Van Gogh","Leonardo da Vinci","Picasso","Monet"], answer: 1 },
  { q: "How many players per team are on court in basketball?", options: ["Five","Six","Seven","Eight"], answer: 0 },
  { q: "Longest river in South America?", options: ["Nile","Amazon","Orinoco","Parana"], answer: 1 },
  { q: "Capital of New Zealand?", options: ["Auckland","Christchurch","Wellington","Queenstown"], answer: 2 },
  { q: "Main ingredient in guacamole?", options: ["Courgette","Avocado","Cucumber","Peas"], answer: 1 },
  { q: "Chemical symbol for oxygen?", options: ["Ox","O","Og","Oy"], answer: 1 },
  { q: "Which planet has the Great Red Spot?", options: ["Jupiter","Saturn","Neptune","Mars"], answer: 0 },
  { q: "Typical adult human teeth including wisdom teeth?", options: ["28","30","32","36"], answer: 2 },
  { q: "Which mammal lays eggs?", options: ["Koala","Platypus","Dolphin","Bat"], answer: 1 },
  { q: "Main ingredient in traditional hummus?", options: ["Lentils","Chickpeas","Butter beans","Peas"], answer: 1 },
  { q: "Which instrument measures temperature?", options: ["Barometer","Thermometer","Anemometer","Altimeter"], answer: 1 },
  { q: "Largest island excluding continents?", options: ["Madagascar","Borneo","Greenland","New Guinea"], answer: 2 },
  { q: "Capital of South Korea?", options: ["Busan","Seoul","Incheon","Daegu"], answer: 1 },
  { q: "What do bees produce from flower nectar?", options: ["Maple syrup","Honey","Molasses","Nectarine"], answer: 1 },
  { q: "How many months have 31 days?", options: ["Five","Six","Seven","Eight"], answer: 2 },
  { q: "Which part of the eye controls how much light enters?", options: ["Retina","Iris","Cornea","Optic nerve"], answer: 1 },
  { q: "Name of the galaxy containing our solar system?", options: ["Andromeda","Milky Way","Whirlpool","Sombrero"], answer: 1 },
  { q: "Which country is famous for the sauna tradition?", options: ["Sweden","Finland","Norway","Iceland"], answer: 1 },
  { q: "Capital of Egypt?", options: ["Alexandria","Cairo","Giza","Luxor"], answer: 1 },
  { q: "Largest living bird?", options: ["Emu","Emperor penguin","Ostrich","Cassowary"], answer: 2 },
  { q: "What does a barometer measure?", options: ["Wind speed","Air pressure","Humidity","Rainfall"], answer: 1 },
  { q: "Which vitamin is produced in skin through sunlight exposure?", options: ["Vitamin A","Vitamin B12","Vitamin C","Vitamin D"], answer: 3 },
  { q: "Which sea separates the UK from mainland Europe at its narrowest point?", options: ["Irish Sea","North Sea","English Channel","Baltic Sea"], answer: 2 },
  { q: "How many strings does a standard violin have?", options: ["Four","Five","Six","Eight"], answer: 0 },
  { q: "Which city hosted the first modern Olympic Games in 1896?", options: ["Paris","Athens","London","Rome"], answer: 1 },
  { q: "Largest species of big cat?", options: ["Lion","Leopard","Tiger","Jaguar"], answer: 2 },
  { q: "Which shape has three sides?", options: ["Square","Triangle","Pentagon","Trapezoid"], answer: 1 },
  { q: "Capital of Argentina?", options: ["Lima","Santiago","Buenos Aires","Montevideo"], answer: 2 },
  { q: "Who formulated the laws of motion?", options: ["Einstein","Isaac Newton","Galileo","Nikola Tesla"], answer: 1 },
  { q: "Molten rock beneath Earth's surface is called what?", options: ["Lava","Magma","Basalt","Ash"], answer: 1 },
  { q: "Which country has a maple leaf on its national flag?", options: ["Canada","Austria","Denmark","Switzerland"], answer: 0 },
  { q: "Which animal is famous for changing colour to camouflage?", options: ["Chameleon","Meerkat","Armadillo","Hedgehog"], answer: 0 },
  { q: "Capital of Thailand?", options: ["Phuket","Chiang Mai","Bangkok","Pattaya"], answer: 2 },
  { q: "Which planet is farthest from the Sun?", options: ["Uranus","Saturn","Neptune","Jupiter"], answer: 2 },
  { q: "Which organ pumps blood around the body?", options: ["Liver","Heart","Lungs","Pancreas"], answer: 1 },
  { q: "Which country is home to Marrakech?", options: ["Morocco","Tunisia","Algeria","Libya"], answer: 0 },
  { q: "Which is the largest penguin species?", options: ["King penguin","Emperor penguin","Adelie penguin","Gentoo penguin"], answer: 1 },
  { q: "Which metal is widely used in electrical wiring?", options: ["Copper","Lead","Tin","Zinc"], answer: 0 },
  { q: "How many days are in a leap year?", options: ["365","366","364","367"], answer: 1 },
  { q: "Capital of Ireland?", options: ["Cork","Galway","Dublin","Limerick"], answer: 2 },
  { q: "A frog belongs to which animal group?", options: ["Reptiles","Amphibians","Mammals","Fish"], answer: 1 },
  { q: "What is the famous clock tower at the Palace of Westminster called?", options: ["Elizabeth Tower","Tower Bridge","The Shard","BT Tower"], answer: 0 },
  { q: "Which planet is known for its blue appearance and extreme winds?", options: ["Venus","Neptune","Mercury","Earth"], answer: 1 },
  { q: "Which country is home to Angkor Wat?", options: ["Thailand","Cambodia","Vietnam","Laos"], answer: 1 },
  { q: "Largest country by land area?", options: ["Canada","China","Russia","United States"], answer: 2 },
  { q: "Capital of Kenya?", options: ["Mombasa","Nairobi","Kampala","Kigali"], answer: 1 },
  { q: "Which instrument observes very distant objects in space?", options: ["Microscope","Telescope","Periscope","Stethoscope"], answer: 1 }
];;

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

// Arcade sound is globally controlled by admins; each visitor can mute locally.
const DEFAULT_ARCADE_SOUND = { enabled: true, spinWheel: true, scratchCard: true };
async function readArcadeSound(){
 const r=await db.execute(sql`SELECT value FROM site_settings WHERE key='rewards_arcade_sound'`);
 try{return {...DEFAULT_ARCADE_SOUND,...JSON.parse(String((r.rows[0] as any)?.value||"{}"))}}catch{return DEFAULT_ARCADE_SOUND}
}
router.get("/rewards/sound-settings",async(_req,res)=>{
 try{res.setHeader("Cache-Control","no-store");res.json(await readArcadeSound())}catch{res.json(DEFAULT_ARCADE_SOUND)}
});
router.get("/admin/rewards/sound-settings",requireAdmin,async(_req,res)=>{
 try{res.setHeader("Cache-Control","no-store");res.json(await readArcadeSound())}catch{res.status(503).json({error:"Sound settings unavailable"})}
});
router.put("/admin/rewards/sound-settings",requireAdmin,async(req,res)=>{
 const {enabled,spinWheel,scratchCard}=req.body||{};
 if([enabled,spinWheel,scratchCard].some(v=>typeof v!=="boolean"))return void res.status(400).json({error:"All sound switches must be true or false"});
 const next={enabled,spinWheel,scratchCard};
 try{
  await db.execute(sql`INSERT INTO site_settings(key,value,updated_at) VALUES('rewards_arcade_sound',${JSON.stringify(next)},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`);
  res.setHeader("Cache-Control","no-store");res.json({ok:true,...next});
 }catch{res.status(503).json({error:"Could not save arcade sound settings"})}
});

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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ question: q.q, options: q.options, questionNumber: getDayIndex() % QUIZ_QUESTIONS.length + 1, totalQuestions: QUIZ_QUESTIONS.length, rotatesAt: "midnight UTC" });
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
  const n=await tx.execute(sql`SELECT COUNT(*)::int n FROM reward_game_sessions WHERE user_email=${email} AND game_id=${gameId} AND issued_at>=date_trunc('day',now()) AND (status IN ('completed','claimed') OR (status='started' AND expires_at>now()))`);
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
  if(t==="memory-match"&&(!info.completed||elapsed<8||elapsed>180||!Number.isFinite(Number(info.score))||Number(info.score)<0||Number(info.score)>100))return {status:422,error:"Invalid completion"};
  if(t==="treasure-tap"&&(!info.completed||elapsed<25||elapsed>120||Number(info.duration)!==30))return {status:422,error:"Invalid completion"};
  if(t==="parcel-dash"&&(!info.completed||elapsed<5||elapsed>240||!Number.isFinite(Number(info.distance))||Number(info.distance)<0||Number(info.distance)>1200))return {status:422,error:"Invalid completion"};
  // Incorrect quiz responses are completed attempts worth zero credits.
  const wrongQuiz=t==="daily-quiz"&&a!==ss.server_result.answer;
  if(t==="lucky-number"&&(!Number.isInteger(Number(a))||Number(a)<1||Number(a)>6))return {status:422,error:"Invalid number"};
  if((t==="spin-wheel"||t==="scratch-card")&&elapsed<1)return {status:422,error:"Reveal not finished"};
  let prize=wrongQuiz?0:Number(ss.prize_credits);if(t==="lucky-number"&&Number(a)!==ss.server_result.draw)prize=Math.min(5,prize);
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

router.get("/admin/rewards/overview", requireAdmin, async (_req,res)=>{
 try {
  const [summary,games,sessions,suspicious]=await Promise.all([
   db.execute(sql`SELECT COUNT(*)::int AS plays,COUNT(DISTINCT user_email)::int AS players,COALESCE(SUM(credits_earned),0)::int AS credits FROM reward_plays WHERE played_at>=CURRENT_DATE`),
   db.execute(sql`SELECT p.game_id,COUNT(*)::int AS plays,COALESCE(SUM(p.credits_earned),0)::int AS credits FROM reward_plays p WHERE p.played_at>=CURRENT_DATE-INTERVAL '7 days' GROUP BY p.game_id ORDER BY plays DESC`),
   db.execute(sql`SELECT id,game_id,LEFT(user_email,2)||'***' AS user_label,status,issued_at,completed_at,claimed_at,expires_at,prize_credits FROM reward_game_sessions ORDER BY issued_at DESC LIMIT 75`),
   db.execute(sql`SELECT COUNT(*)::int AS flagged_accounts FROM (SELECT user_email FROM reward_game_sessions WHERE issued_at>=NOW()-INTERVAL '24 hours' GROUP BY user_email HAVING COUNT(*)>30) suspect`)
  ]);
  const flags=sessions.rows.filter((r:any)=>r.status==='started'&&new Date(r.expires_at)<new Date()).length;
  res.setHeader("Cache-Control","no-store");
  res.json({summary:summary.rows[0],games:games.rows,sessions:sessions.rows,expiredInRecent:flags,flaggedAccounts:Number((suspicious.rows[0] as any)?.flagged_accounts??0)});
 }catch(err){logger.error({err},"Reward admin overview");res.status(500).json({error:"Reward monitoring unavailable"});}
});
router.get("/rewards/streak",async(req,res)=>{
 try {
  const email=await identity(req);if(!email)return void res.status(401).json({error:"Sign in required"});
  const rows=await db.execute(sql`SELECT DISTINCT to_char((played_at AT TIME ZONE 'UTC')::date,'YYYY-MM-DD') AS day FROM reward_plays WHERE user_email=${email} AND played_at>=NOW()-INTERVAL '45 days' ORDER BY day DESC`);
  const days=new Set(rows.rows.map((r:any)=>String(r.day).slice(0,10)));
  let cursor=new Date();cursor.setUTCHours(0,0,0,0);
  if(!days.has(cursor.toISOString().slice(0,10)))cursor.setUTCDate(cursor.getUTCDate()-1);
  let streak=0;while(days.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
  res.json({streak,playedToday:days.has(new Date().toISOString().slice(0,10))});
 }catch(err){logger.error({err},"Reward streak");res.status(500).json({error:"Streak unavailable"});}
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
