import { clerkClient, getAuth } from "@clerk/express";
import type { Request, Response } from "express";

/** Resolve seller identity from verified Clerk session, never request body or email headers. */
export async function authenticatedSellerEmail(req: Request, res: Response): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  const user = await clerkClient.users.getUser(auth.userId);
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) {
    res.status(403).json({ error: "Verified account email required" });
    return null;
  }
  return email;
}
