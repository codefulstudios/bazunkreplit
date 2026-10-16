import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it in your host's environment variables.`);
  }
  return value;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const key = requireEnv("STRIPE_SECRET_KEY");
  // An accidentally copied production key must never be usable by staging.
  if ((process.env.RENDER_SERVICE_NAME ?? "").toLowerCase().includes("staging") && !key.startsWith("sk_test_")) {
    throw new Error("Staging Stripe must use a test-mode secret key");
  }
  return new Stripe(key, {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string> {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
}

export async function getStripeSecretKey(): Promise<string> {
  return requireEnv("STRIPE_SECRET_KEY");
}
