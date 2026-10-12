import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { createHmac } from "node:crypto";
import { logger } from "../lib/logger.js";

const router = Router();

/** Chatwoot identity validation. The secret must match the Chatwoot inbox identity validation secret. */
router.get("/chatwoot/identity", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.CHATWOOT_IDENTITY_VALIDATION_SECRET;
  if (!secret) { res.status(503).json({ error: "Chatwoot identity validation is not configured" }); return; }
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) { res.status(401).json({ error: "Sign in required" }); return; }
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) { res.status(422).json({ error: "Account has no verified primary email" }); return; }
    // Clerk user ID is stable; the signature is generated only on the server.
    const identifier = auth.userId;
    const identifier_hash = createHmac("sha256", secret).update(identifier).digest("hex");
    res.json({ identifier, identifier_hash, email, name: user.fullName || user.username || email.split("@")[0] });
  } catch (error) {
    logger.error({ error }, "Chatwoot identity lookup failed");
    res.status(502).json({ error: "Unable to verify account" });
  }
});

export default router;
