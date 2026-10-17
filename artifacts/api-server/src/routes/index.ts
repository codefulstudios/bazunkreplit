import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import demoCreatorRouter from "./demoCreator.js";
import stripeRouter from "./stripe.js";
import adminRouter from "./admin.js";
import setupRouter from "./setup.js";
import productsRouter from "./products.js";
import disputesRouter from "./disputes.js";
import ordersRouter from "./orders.js";
import postageRouter from "./postage.js";
import reviewsRouter from "./reviews.js";
import messagesRouter from "./messages.js";
import notificationsRouter from "./notifications.js";
import marketplaceOffersRouter from "./marketplaceOffers.js";
import returnsRouter from "./returns.js";
import auctionsRouter from "./auctions.js";
import flashSalesRouter from "./flashSales.js";
import treasureHuntRouter from "./treasureHunt.js";
import listingsRouter from "./listings.js";
import livekitRouter from "./livekit.js";
import supplierRouter from "./supplier.js";
import classifiedsRouter from "./classifieds.js";
import promotionsRouter from "./promotions.js";
import supportRouter from "./support.js";
import rewardsRouter from "./rewards.js";
import verificationRouter from "./verification.js";
import userImporterRouter from "./userImporter.js";
import userRapidApiRouter from "./userRapidApi.js";
import referralsRouter from "./referrals.js";
import chatwootRouter from "./chatwoot.js";
import { featureEnabled } from "../lib/featureFlags.js";
import { featureGate } from "../middlewares/featureGate.js";

const router: IRouter = Router();

// Runtime feature gates: disabled modules stay in code/database but public APIs stop immediately.
router.use(featureGate);

// Public read-only setting for the homepage intro; no admin credentials exposed.
router.get("/public/homepage-intro", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ enabled: await featureEnabled("homepage_intro") });
});

router.use(healthRouter);
router.use(stripeRouter);
router.use(adminRouter);
router.use(setupRouter);
router.use(productsRouter);
router.use(disputesRouter);
// reviewsRouter first: its GET /orders/seller must win over ordersRouter's GET /orders/:id
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(marketplaceOffersRouter);
router.use(notificationsRouter);
router.use(ordersRouter);
router.use(postageRouter);
router.use(returnsRouter);
router.use(auctionsRouter);
router.use(flashSalesRouter);
router.use(treasureHuntRouter);
router.use(listingsRouter);
router.use(livekitRouter);
router.use(supplierRouter);
router.use(classifiedsRouter);
router.use(promotionsRouter);
router.use(supportRouter);
router.use(rewardsRouter);
router.use(verificationRouter);
router.use(userImporterRouter);
router.use(userRapidApiRouter);
router.use(referralsRouter);
router.use(chatwootRouter);
router.use(demoCreatorRouter);

export default router;
