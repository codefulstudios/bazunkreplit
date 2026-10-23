import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import demoCreatorRouter from "./demoCreator.js";
import stripeRouter from "./stripe.js";
import adminRouter from "./admin.js";
import cashbackRouter from "./cashback.js";
import setupRouter from "./setup.js";
import productsRouter from "./products.js";
import disputesRouter from "./disputes.js";
import ordersRouter from "./orders.js";
import postageRouter from "./postage.js";
import reviewsRouter from "./reviews.js";
import messagesRouter from "./messages.js";
import dashboardAccountRouter from "./dashboardAccount.js";
import notificationsRouter from "./notifications.js";
import savedSearchesRouter from "./savedSearches.js";
import marketplaceOffersRouter from "./marketplaceOffers.js";
import returnsRouter from "./returns.js";
import auctionsRouter from "./auctions.js";
import flashSalesRouter from "./flashSales.js";
import treasureHuntRouter from "./treasureHunt.js";
import listingsRouter from "./listings.js";
import sellerListingToolsRouter from "./sellerListingTools.js";
import livekitRouter from "./livekit.js";
import supplierRouter from "./supplier.js";
import classifiedsRouter from "./classifieds.js";
import promotionsRouter from "./promotions.js";
import supportRouter from "./support.js";
import rewardsRouter from "./rewards.js";
import verificationRouter from "./verification.js";
import trustProofRouter from "./trustProof.js";
import userImporterRouter from "./userImporter.js";
import userRapidApiRouter from "./userRapidApi.js";
import referralsRouter from "./referrals.js";
import chatwootRouter from "./chatwoot.js";
import snapSellRouter from "./snapSell.js";
import listingAlertsRouter from "./listingAlerts.js";
import discoveryRouter from "./discovery.js";
import dealPilotRouter from "./dealPilot.js";
import findItRouter from "./findIt.js";
import sellerBundlesRouter from "./sellerBundles.js";
import checkoutRecoveryRouter from "./checkoutRecovery.js";
import { featureEnabled } from "../lib/featureFlags.js";
import { featureGate } from "../middlewares/featureGate.js";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let listingUrlSetup: Promise<void> | undefined;
async function ensureListingUrlTokens() {
  if (!listingUrlSetup) listingUrlSetup = (async () => {
    // public_id is the legacy/import source identifier. Never rewrite it.
    await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS public_url_token VARCHAR(15)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS listings_public_url_token_unique ON listings(public_url_token)`);
    await db.execute(sql.raw(`
      CREATE OR REPLACE FUNCTION bazunk_listing_token() RETURNS text AS $
      BEGIN
        RETURN LEFT(translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/', 'AZ'),15);
      END;
      $ LANGUAGE plpgsql;
      CREATE OR REPLACE FUNCTION bazunk_assign_listing_token() RETURNS trigger AS $
      DECLARE candidate text;
      BEGIN
        IF NEW.public_url_token IS NULL THEN
          LOOP
            candidate := bazunk_listing_token();
            EXIT WHEN NOT EXISTS(SELECT 1 FROM listings WHERE public_url_token=candidate);
          END LOOP;
          NEW.public_url_token := candidate;
        END IF;
        RETURN NEW;
      END;
      $ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS bazunk_listing_url_trigger ON listings;
      CREATE TRIGGER bazunk_listing_url_trigger BEFORE INSERT ON listings
        FOR EACH ROW EXECUTE FUNCTION bazunk_assign_listing_token();
    `));
    // Idempotent backfill, preserving all listing IDs and source identifiers.
    await db.execute(sql`UPDATE listings SET public_url_token=bazunk_listing_token() WHERE public_url_token IS NULL`);
    await db.execute(sql`ALTER TABLE listings ALTER COLUMN public_url_token SET NOT NULL`);
  })().catch(err => {listingUrlSetup=undefined;throw err;});
  return listingUrlSetup;
}

const router: IRouter = Router();

// Runtime feature gates: disabled modules stay in code/database but public APIs stop immediately.
router.use(async (_req,res,next)=>{try{await ensureListingUrlTokens();next();}catch(err){console.error("Listing URL token setup failed",err);res.status(503).json({error:"Listing URL initialization unavailable"});}});
router.use(featureGate);

// Public read-only setting for the homepage intro; no admin credentials exposed.
router.get("/public/homepage-intro", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ enabled: await featureEnabled("homepage_intro") });
});

router.use(healthRouter);
router.use(stripeRouter);
// Before legacy admin routes so real ledger endpoints supersede promotional-only settings.
router.use(cashbackRouter);
router.use(adminRouter);
router.use(setupRouter);
router.use(productsRouter);
router.use(disputesRouter);
// reviewsRouter first: its GET /orders/seller must win over ordersRouter's GET /orders/:id
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(dashboardAccountRouter);
router.use(marketplaceOffersRouter);
router.use(notificationsRouter);
router.use(savedSearchesRouter);
router.use(ordersRouter);
router.use(postageRouter);
router.use(returnsRouter);
router.use(auctionsRouter);
router.use(flashSalesRouter);
router.use(treasureHuntRouter);
router.use(sellerListingToolsRouter);
router.use(listingsRouter);
router.use(livekitRouter);
router.use(supplierRouter);
router.use(classifiedsRouter);
router.use(promotionsRouter);
router.use(supportRouter);
router.use(rewardsRouter);
router.use(verificationRouter);
router.use(trustProofRouter);
router.use(userImporterRouter);
router.use(userRapidApiRouter);
router.use(referralsRouter);
router.use(chatwootRouter);
router.use(snapSellRouter);
router.use(listingAlertsRouter);
router.use(discoveryRouter);
router.use(dealPilotRouter);
router.use(findItRouter);
router.use(sellerBundlesRouter);
router.use(checkoutRecoveryRouter);
router.use(demoCreatorRouter);

export default router;
