import { recordCreditEconomy } from "../lib/creditEconomy.js";
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { authenticatedSellerEmail } from "../lib/authenticatedSeller.js";
import { randomUUID } from "crypto";
import {
  sendNewBidNotification,
  sendOutbidNotification,
  sendAuctionWonNotification,
  sendAuctionEndedSellerNotification,
} from "../email.js";

import { storage } from "../storage.js";
import { getPromoConfig } from "../lib/promoConfig.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();

/** Bids placed in the last EXTEND_WINDOW_MS of an auction with Auction Extensions push the end out so that long remains. */
const EXTEND_WINDOW_MS = 2 * 60 * 1000;

/**
 * What the public may see of an auction. The reserve amount is a secret — only say whether
 * one exists and (once there are bids) whether it has been met.
 */
function publicAuction(a: Record<string, unknown>): Record<string, unknown> {
  const {
    reserve_price,
    winner_email,
    ...rest
  } = a;
  const hasReserve = reserve_price !== null && reserve_price !== undefined && reserve_price !== "";
  const current = rest["current_bid"] ? parseFloat(rest["current_bid"] as string) : null;
  return {
    ...rest,
    has_reserve: hasReserve,
    reserve_met: hasReserve ? current !== null && current >= parseFloat(reserve_price as string) : null,
  };
}

/** Public auction detail never reveals bidder email addresses. */
function publicBid(bid: Record<string, unknown>): Record<string, unknown> {
  const { bidder_email, ...rest } = bid;
  return rest;
}

/** Finalize an expired auction once, regardless of how many workers check it. */
async function finalizeAuction(id: string): Promise<void> {
  const result = await db.execute(sql`
    UPDATE auctions
    SET status = 'ended',
        winner_email = CASE WHEN reserve_price IS NOT NULL AND (winner_bid IS NULL OR winner_bid < reserve_price) THEN NULL ELSE winner_email END,
        winner_name = CASE WHEN reserve_price IS NOT NULL AND (winner_bid IS NULL OR winner_bid < reserve_price) THEN NULL ELSE winner_name END,
        winner_bid = CASE WHEN reserve_price IS NOT NULL AND (winner_bid IS NULL OR winner_bid < reserve_price) THEN NULL ELSE winner_bid END,
        updated_at = NOW()
    WHERE id = ${id} AND status = 'active' AND end_time <= NOW()
    RETURNING *
  `);
  if (!result.rows.length) return;
  const a = result.rows[0] as Record<string, unknown>;
  const winningBid = a["winner_bid"] == null ? null : Number(a["winner_bid"]);
  const sellerEmail = String(a["seller_email"]);
  const title = String(a["title"]);
  if (winningBid !== null && a["winner_email"]) {
    const winnerEmail = String(a["winner_email"]);
    void sendSystemMessage(winnerEmail, { category: "Auctions", subject: `You won "${title}"!`, body: `Your winning bid was ${auctionCurrency(a).symbol}${winningBid.toFixed(2)} ${auctionCurrency(a).code}.` });
    void sendSystemMessage(sellerEmail, { category: "Auctions", subject: `Your auction "${title}" has ended`, body: `Winning bid: ${auctionCurrency(a).symbol}${winningBid.toFixed(2)} ${auctionCurrency(a).code}.` });
    void sendAuctionWonNotification({ winnerEmail, winnerName: String(a["winner_name"] ?? winnerEmail), auctionTitle: title, auctionId: id, winningBid, sellerName: String(a["seller_name"]) });
    void sendAuctionEndedSellerNotification({ sellerEmail, sellerName: String(a["seller_name"]), auctionTitle: title, auctionId: id, winnerName: String(a["winner_name"] ?? winnerEmail), winnerEmail, winningBid });
  } else {
    void sendSystemMessage(sellerEmail, { category: "Auctions", subject: `Your auction "${title}" ended without a sale`, body: "No qualifying winning bid was received." });
  }
}

/** Periodic closeout works even if nobody opens the auction page. */
const auctionCloseTimer = setInterval(() => {
  void (async () => {
    const expired = await db.execute(sql`SELECT id FROM auctions WHERE status = 'active' AND end_time <= NOW() ORDER BY end_time LIMIT 50`);
    for (const row of expired.rows) await finalizeAuction(String(row["id"]));
  })().catch(err => console.error("Auction closeout failed", err));
}, 60_000);
auctionCloseTimer.unref();

function auctionCurrency(a: Record<string,unknown>): {symbol:string;code:string} {
  return a["marketplace_region"] === "us" ? {symbol:"$",code:"USD"} : {symbol:"£",code:"GBP"};
}

const VALID_STATUSES = ["active", "ended", "cancelled"];

router.get("/auctions", async (req, res) => {
  const { status = "active", category, sort = "ending", limit = "40", offset = "0" } = req.query as Record<string, string>;
  const orderClause = sort === "newest" ? sql`ORDER BY created_at DESC` : sql`ORDER BY end_time ASC`;
  const region = req.query.region;
  if (region !== undefined && region !== "uk" && region !== "us") {
    res.status(400).json({ error: "Invalid marketplace region; use uk or us" });
    return;
  }
  const regionClause = region === "uk" || region === "us"
    ? sql`marketplace_region = ${region}`
    : sql`TRUE`;
  let rows;
  if (category && category !== "all") {
    rows = await db.execute(sql`SELECT * FROM auctions WHERE ${regionClause} AND NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND cv.key='category_visible_' || COALESCE(category,'')) AND status = ${status} AND category = ${category} ${orderClause} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
  } else {
    rows = await db.execute(sql`SELECT * FROM auctions WHERE ${regionClause} AND NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND cv.key='category_visible_' || COALESCE(category,'')) AND status = ${status} ${orderClause} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
  }
  res.json(rows.rows.map(r => publicAuction(r as Record<string, unknown>)));
});

router.get("/auctions/my-bids", async (req, res) => {
  const email = await authenticatedSellerEmail(req, res);
  if (!email) return;
  const rows = await db.execute(sql`
    SELECT DISTINCT a.*, b.amount AS my_latest_bid
    FROM auctions a
    JOIN bids b ON b.auction_id = a.id
    WHERE b.bidder_email = ${email}
    ORDER BY a.end_time DESC
    LIMIT 50
  `);
  res.json(rows.rows.map(r => publicAuction(r as Record<string, unknown>)));
});

router.get("/auctions/my-listings", async (req, res) => {
  const email = await authenticatedSellerEmail(req, res);
  if (!email) return;
  const rows = await db.execute(sql`SELECT * FROM auctions WHERE seller_email = ${email} ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.rows);
});

router.get("/auctions/:id/payment-eligibility", async (req,res) => {
  const email = await authenticatedSellerEmail(req,res);
  if (!email) return;
  const id = String(req.params.id);
  const result = await db.execute(sql`SELECT status,winner_email,winner_bid FROM auctions WHERE id=${id}`);
  const a = result.rows[0] as Record<string,unknown> | undefined;
  if (!a) { res.status(404).json({error:"Auction not found"}); return; }
  const eligible = a.status === "ended" && !!a.winner_bid && String(a.winner_email ?? "").toLowerCase() === email;
  const orders = eligible ? await db.execute(sql`SELECT id FROM orders WHERE notes=${"auction:"+id} LIMIT 1`) : null;
  res.setHeader("Cache-Control","no-store");
  res.json({eligible:eligible && !orders?.rows.length});
});

router.get("/auctions/:id", async (req, res) => {
  const { id } = req.params;
  const auctionRes = await db.execute(sql`SELECT * FROM auctions WHERE NOT EXISTS (SELECT 1 FROM site_settings cv WHERE cv.value='false' AND cv.key='category_visible_' || COALESCE(category,'')) AND id = ${id}`);
  if (auctionRes.rows.length === 0) { res.status(404).json({ error: "Auction not found" }); return; }
  await finalizeAuction(id);
  const refreshed = await db.execute(sql`SELECT * FROM auctions WHERE id = ${id}`);
  const a = refreshed.rows[0] as Record<string, unknown>;
  const bidsRes = await db.execute(sql`SELECT * FROM bids WHERE auction_id = ${id} ORDER BY created_at DESC LIMIT 30`);
  res.json({ ...publicAuction(a), bids: bidsRes.rows.map(b => publicBid(b as Record<string, unknown>)) });
});

router.post("/auctions", async (req, res) => {
  const authenticatedEmail = await authenticatedSellerEmail(req, res);
  if (!authenticatedEmail) return;
  const body = req.body as Record<string, unknown>;
  const marketplaceRegion = body.marketplaceRegion;
  if (marketplaceRegion !== "uk" && marketplaceRegion !== "us") { res.status(400).json({ error: "Choose UK or USA / Canada marketplace" }); return; }
  const { title, description, category, condition, sellerEmail, sellerName, startingBid, reservePrice, bidIncrement, endTime } = body as Record<string, string>;
  if (typeof sellerEmail !== "string" || sellerEmail.trim().toLowerCase() !== authenticatedEmail) {
    res.status(403).json({ error: "Seller account mismatch" }); return;
  }
  const images = (body["images"] as string[]) ?? [];
  if (!title || !sellerEmail || !sellerName || !startingBid || !endTime) {
    res.status(400).json({ error: "title, sellerEmail, sellerName, startingBid, endTime are required" });
    return;
  }
  const startAmount = Number(startingBid);
  const incrementAmount = bidIncrement == null || bidIncrement === "" ? 1 : Number(bidIncrement);
  const reserveAmount = reservePrice == null || reservePrice === "" ? null : Number(reservePrice);
  const endDate = new Date(endTime);
  if (!Number.isFinite(startAmount) || startAmount <= 0 || !Number.isFinite(incrementAmount) || incrementAmount <= 0 || (reserveAmount !== null && (!Number.isFinite(reserveAmount) || reserveAmount <= 0)) || !Number.isFinite(endDate.getTime()) || endDate.getTime() <= Date.now()) {
    res.status(400).json({ error: "Enter positive starting bid, increment and reserve values, and a future end time" }); return;
  }
  const wantsExtension = body["extendEnabled"] === true || body["extendEnabled"] === "true";
  const wantsReserve = reserveAmount !== null;

  // Optional paid add-ons (prices and availability are set in Admin → Promotions)
  const reserveCfg = await getPromoConfig("reserve-auction");
  const extendCfg = await getPromoConfig("auction-extension");
  if (wantsReserve && reserveCfg && !reserveCfg.enabled) { res.status(400).json({ error: "Reserve prices aren't available right now." }); return; }
  if (wantsExtension && extendCfg && !extendCfg.enabled) { res.status(400).json({ error: "Auction Extensions aren't available right now." }); return; }
  const fee = (wantsReserve ? (reserveCfg?.cost ?? 0) : 0) + (wantsExtension ? (extendCfg?.cost ?? 0) : 0);
  if (fee > 0) {
    const balance = await storage.getCredits(sellerEmail);
    if (balance < fee) {
      res.status(402).json({ error: "Insufficient credits for the auction add-ons", balance, required: fee });
      return;
    }
  }

  const id = `AUC-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO auctions
      (id, title, description, images, category, condition, seller_email, seller_name,
       starting_bid, reserve_price, bid_increment, end_time, extend_enabled, status, marketplace_region, created_at, updated_at)
    VALUES (
      ${id}, ${title}, ${description ?? null}, ${JSON.stringify(images)},
      ${category ?? null}, ${condition ?? "used"}, ${sellerEmail}, ${sellerName},
      ${startAmount},
      ${reserveAmount},
      ${incrementAmount},
      ${endTime}, ${wantsExtension}, 'active', ${marketplaceRegion}, NOW(), NOW()
    )
  `);
  let newBalance: number | undefined;
  if (fee > 0) {
    newBalance = Number(await storage.addCredits(sellerEmail, -fee));
    await recordCreditEconomy({ email: sellerEmail, kind: "spent", credits: -fee, reason: "Auction listing fee", referenceType: "auction" });
    const parts = [wantsReserve && "Reserve Price", wantsExtension && "Auction Extensions"].filter(Boolean).join(" + ");
    void sendSystemMessage(sellerEmail, {
      category: "Promotions",
      subject: `${parts} added to your auction`,
      body: `You added ${parts} to "${title}" and spent ${Math.round(fee * 100)} credits. Your new balance is ${Math.round((newBalance ?? 0) * 100)} credits.`,
    });
  }
  res.status(201).json({ id, creditsSpent: fee, newBalance });
});

router.post("/auctions/:id/bid", async (req, res) => {
  const bidderEmail = await authenticatedSellerEmail(req, res);
  if (!bidderEmail) return;
  const { id } = req.params;
  const { bidderName, amount } = req.body as Record<string, string>;
  if (!bidderName || !amount) {
    res.status(400).json({ error: "bidderName and amount are required" });
    return;
  }
  const bidAmount = Number(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) { res.status(400).json({ error: "Enter a valid positive bid" }); return; }
  const bidId = `BID-${randomUUID().slice(0, 8).toUpperCase()}`;
  // Lock the auction row for the entire read/validate/insert/update sequence.
  // Competing bids wait for this transaction, then see the updated minimum.
  const outcome = await db.transaction(async (tx) => {
    const auctionRes = await tx.execute(sql`SELECT * FROM auctions WHERE id = ${id} FOR UPDATE`);
    if (auctionRes.rows.length === 0) return { error: "Auction not found", status: 404 } as const;
    const auction = auctionRes.rows[0] as Record<string, unknown>;
    if (auction["status"] !== "active") return { error: "Auction is not active", status: 400 } as const;
    if (new Date(auction["end_time"] as string).getTime() <= Date.now()) return { error: "Auction has ended", status: 400 } as const;
    if (String(auction["seller_email"]).toLowerCase() === bidderEmail) return { error: "You cannot bid on your own auction", status: 400 } as const;
    const currentBid = auction["current_bid"] == null ? null : Number(auction["current_bid"]);
    const increment = Number(auction["bid_increment"]);
    const minBid = currentBid !== null ? currentBid + increment : Number(auction["starting_bid"]);
    if (bidAmount < minBid) return { error: `Minimum bid is ${auctionCurrency(auction).symbol}${minBid.toFixed(2)} ${auctionCurrency(auction).code}`, status: 400, minBid } as const;

    const prevWinnerEmail = (auction["winner_email"] as string | null) ?? null;
    const prevWinnerName = (auction["winner_name"] as string | null) ?? null;
    await tx.execute(sql`
      INSERT INTO bids (id, auction_id, bidder_email, bidder_name, amount, created_at)
      VALUES (${bidId}, ${id}, ${bidderEmail}, ${bidderName}, ${bidAmount}, NOW())
    `);
    let extended = false;
    let newEndTime: string | null = null;
    if (auction["extend_enabled"] === true) {
      const endMs = new Date(auction["end_time"] as string).getTime();
      if (endMs - Date.now() <= EXTEND_WINDOW_MS) {
        newEndTime = new Date(Date.now() + EXTEND_WINDOW_MS).toISOString();
        extended = true;
      }
    }
    await tx.execute(sql`
      UPDATE auctions SET current_bid = ${bidAmount}, bid_count = COALESCE(bid_count, 0) + 1,
        winner_email = ${bidderEmail}, winner_name = ${bidderName}, winner_bid = ${bidAmount},
        end_time = CASE WHEN ${newEndTime}::timestamptz IS NOT NULL
          AND end_time < ${newEndTime}::timestamptz THEN ${newEndTime}::timestamptz ELSE end_time END,
        updated_at = NOW()
      WHERE id = ${id}
    `);
    return {
      auction, prevWinnerEmail, prevWinnerName, extended, newEndTime,
      newBidCount: Number(auction["bid_count"] ?? 0) + 1,
      nextMinBid: bidAmount + increment,
    };
  });
  if ("error" in outcome) {
    res.status(outcome.status ?? 400).json({ error: outcome.error, ...("minBid" in outcome ? { minBid: outcome.minBid } : {}) });
    return;
  }
  const { auction, prevWinnerEmail, prevWinnerName, extended, newEndTime, newBidCount, nextMinBid } = outcome;
  // Notify seller by email and in-app inbox.
  void sendSystemMessage(auction["seller_email"] as string,{category:"Auctions",subject:`New bid on "${auction["title"]}"`,body:`${bidderName} bid ${auctionCurrency(auction).symbol}${bidAmount.toFixed(2)} ${auctionCurrency(auction).code}. Open the auction to review the latest bid.`});
  void sendNewBidNotification({
    sellerEmail: auction["seller_email"] as string,
    sellerName: auction["seller_name"] as string,
    auctionTitle: auction["title"] as string,
    auctionId: id,
    bidderName,
    bidAmount,
    currentBidCount: newBidCount,
  });
  // Notify outbid previous winner (if different from new bidder)
  if (prevWinnerEmail && prevWinnerEmail !== bidderEmail) {
    void sendSystemMessage(prevWinnerEmail,{category:"Auctions",subject:`You\'ve been outbid on "${auction["title"]}"`,body:`The new bid is ${auctionCurrency(auction).symbol}${bidAmount.toFixed(2)} ${auctionCurrency(auction).code}. The minimum next bid is ${auctionCurrency(auction).symbol}${nextMinBid.toFixed(2)}.`});
    void sendOutbidNotification({
      email: prevWinnerEmail,
      name: prevWinnerName ?? prevWinnerEmail,
      auctionTitle: auction["title"] as string,
      auctionId: id,
      newBidAmount: bidAmount,
      minNextBid: nextMinBid,
    });
  }
  res.status(201).json({ id: bidId, currentBid: bidAmount, extended, endTime: newEndTime });
});

router.patch("/auctions/:id/cancel", async (req, res) => {
  const authenticatedEmail = await authenticatedSellerEmail(req, res);
  if (!authenticatedEmail) return;
  const { id } = req.params;
  const { email } = req.body as Record<string, string>;
  const auctionRes = await db.execute(sql`SELECT * FROM auctions WHERE id = ${id}`);
  if (auctionRes.rows.length === 0) { res.status(404).json({ error: "Auction not found" }); return; }
  const auction = auctionRes.rows[0] as Record<string, unknown>;
  if (typeof email !== "string" || email.trim().toLowerCase() !== authenticatedEmail || String(auction["seller_email"]).toLowerCase() !== authenticatedEmail) { res.status(403).json({ error: "Forbidden" }); return; }
  if (auction["status"] !== "active") { res.status(409).json({ error: "Only active auctions can be cancelled" }); return; }
  if (Number(auction["bid_count"] ?? 0) > 0) { res.status(409).json({ error: "Auctions with bids cannot be cancelled by the seller; contact support" }); return; }
  const changed = await db.execute(sql`UPDATE auctions SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} AND status = 'active' AND COALESCE(bid_count, 0) = 0 RETURNING id`);
  if (!changed.rows.length) { res.status(409).json({ error: "Auction has changed and can no longer be cancelled" }); return; }
  res.json({ ok: true });
});

router.get("/admin/auctions", requireAdmin, async (req, res) => {
  const rows = await db.execute(sql`SELECT * FROM auctions ORDER BY created_at DESC LIMIT 200`);
  res.json(rows.rows);
});

router.patch("/admin/auctions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) { res.status(400).json({ error: "Valid status required" }); return; }
  await db.execute(sql`UPDATE auctions SET status = ${status}, updated_at = NOW() WHERE id = ${id}`);
  res.json({ ok: true });
});

export default router;
