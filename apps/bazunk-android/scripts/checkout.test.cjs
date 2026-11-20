const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");
const test = require("node:test");
const root = path.resolve(__dirname, "../../..");
const esbuild = createRequire(
  path.join(root, "artifacts/api-server/package.json"),
)("esbuild");
let source = fs
  .readFileSync(
    path.join(root, "artifacts/api-server/src/routes/mobileCheckout.ts"),
    "utf8",
  )
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace("export default router;", "");
const code = esbuild.transformSync(source, {
  loader: "ts",
  format: "cjs",
}).code;
class QuoteError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
async function run(
  pathname,
  method,
  {
    body = {},
    enabled = true,
    stockEnabled = true,
    owner = "owner@example.com",
    paid = false,
    sessionOwner = owner,
    count = 1,
    selfBuy = false,
  } = {},
) {
  const routes = [];
  let created,
    fulfilled = 0,
    expired = false;
  const quote = {
    units: [
      {
        id: 1,
        title: "Item",
        priceMinor: 1000,
        sellerEmail: selfBuy ? owner : "seller@example.com",
      },
    ],
    totalMinor: 1519,
    buyerProtectionMinor: 120,
    deliveryMinor: 399,
    policy: "current",
    protectionPercent: 5,
  };
  const session = {
    id: "cs_test_123",
    url: "https://checkout.stripe.com/c/pay/test",
    client_reference_id: sessionOwner,
    metadata: { source: "bazunk_android", feeQuoteId: "snapshot" },
    payment_status: paid ? "paid" : "unpaid",
    status: "open",
  };
  const stripe = {
    checkout: {
      sessions: {
        create: async (x) => {
          created = x;
          return session;
        },
        retrieve: async () => session,
        expire: async () => {
          expired = true;
        },
      },
    },
    customers: { create: async () => ({ id: "cus_test" }) },
  };
  const router = {
    get: (p, ...handlers) =>
      routes.push({ p, method: "GET", h: handlers.at(-1) }),
    post: (p, ...handlers) =>
      routes.push({ p, method: "POST", h: handlers.at(-1) }),
  };
  new Function(
    "holdStripeStock",
    "releaseExpiredStripeStock",
    "StockError",
    "INVENTORY_POLICY",
    "Router",
    "sql",
    "db",
    "quoteCart",
    "saveFeeSnapshot",
    "getFeeSnapshot",
    "QuoteError",
    "getUncachableStripeClient",
    "storage",
    "fulfillCartSession",
    "requireMobileMember",
    "process",
    code,
  )(
    async () => {},
    async () => {},
    QuoteError,
    "listing-stock-v1",
    () => router,
    () => null,
    { execute: async () => ({ rows: [{ count }] }) },
    async () => quote,
    async () => "snapshot",
    async () => quote,
    QuoteError,
    async () => stripe,
    {
      upsertUser: async () => {},
      getUser: async () => ({ stripeCustomerId: "cus_test" }),
      setStripeCustomerId: async () => {},
    },
    async () => {
      fulfilled++;
      return { status: "fulfilled", orders: 1 };
    },
    () => {},
    {
      env: {
        STOCK_RESERVATIONS_ENABLED: stockEnabled ? "true" : "false",
        MOBILE_CHECKOUT_ENABLED: enabled ? "true" : "false",
        MOBILE_API_BASE_URL: "https://bazunk.com/api",
      },
    },
  );
  const handler = routes.find((r) => r.p === pathname && r.method === method).h;
  let status = 200,
    response;
  const res = {
    locals: { mobileAccount: { email: owner, name: "Owner" } },
    setHeader: () => {},
    status: (n) => {
      status = n;
      return { json: (x) => (response = x) };
    },
    json: (x) => (response = x),
  };
  await handler({ body, params: { id: "cs_test_123" } }, res);
  return { status, response, created, fulfilled, expired };
}
test("checkout stays disabled until configured", async () =>
  assert.equal(
    (await run("/mobile/checkout", "POST", { enabled: false })).status,
    503,
  ));
test("rejects marketplace credits and stale cart totals", async () => {
  assert.equal(
    (
      await run("/mobile/checkout", "POST", {
        body: { creditsApplied: 1, expectedTotal: 15.19 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await run("/mobile/checkout", "POST", { body: { expectedTotal: 10 } }))
      .status,
    409,
  );
});
test("rejects buying own listing", async () =>
  assert.equal(
    (
      await run("/mobile/checkout", "POST", {
        selfBuy: true,
        body: { expectedTotal: 15.19 },
      })
    ).status,
    400,
  ));
test("payment identity, fees and return URL come from trusted server data", async () => {
  const r = await run("/mobile/checkout", "POST", {
    body: {
      email: "victim@example.com",
      expectedTotal: 15.19,
      returnUrl: "https://evil.example.com",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.created.client_reference_id, "owner@example.com");
  assert.equal(
    r.created.success_url,
    "https://bazunk.com/api/mobile/payment-return",
  );
  assert.equal(
    r.created.line_items.reduce(
      (n, x) => n + x.price_data.unit_amount * x.quantity,
      0,
    ),
    1519,
  );
  assert.equal(
    r.created.shipping_address_collection.allowed_countries.includes("GB"),
    true,
  );
});
test("unpaid session never fulfills or reports paid", async () => {
  const r = await run("/mobile/checkout/:id", "GET");
  assert.equal(r.response.status, "unpaid");
  assert.equal(r.fulfilled, 0);
});
test("another member cannot confirm or cancel a checkout", async () => {
  assert.equal(
    (
      await run("/mobile/checkout/:id", "GET", {
        sessionOwner: "other@example.com",
        paid: true,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await run("/mobile/checkout/:id/cancel", "POST", {
        sessionOwner: "other@example.com",
      })
    ).status,
    404,
  );
});
test("paid confirmation waits for every order row", async () => {
  assert.equal(
    (await run("/mobile/checkout/:id", "GET", { paid: true, count: 0 })).status,
    409,
  );
  assert.equal(
    (await run("/mobile/checkout/:id", "GET", { paid: true })).response.status,
    "paid",
  );
});
test("paid checkout cannot be cancelled", async () => {
  const r = await run("/mobile/checkout/:id/cancel", "POST", { paid: true });
  assert.equal(r.status, 409);
  assert.equal(r.expired, false);
});
test("unpaid checkout can be expired before clearing pending state", async () => {
  const r = await run("/mobile/checkout/:id/cancel", "POST");
  assert.equal(r.response.status, "expired");
  assert.equal(r.expired, true);
});
const bundled = esbuild.buildSync({
  entryPoints: [path.join(root, "apps/bazunk-android/src/commerce.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
}).outputFiles[0].text;
const mod = { exports: {} };
new Function("module", "exports", bundled)(mod, mod.exports);
test("rejects inconsistent fee totals and non-Stripe payment URLs", () => {
  assert.throws(() =>
    mod.exports.parseQuote({
      currency: "GBP",
      subtotal: 10,
      buyerProtectionFee: 1.2,
      delivery: 3.99,
      total: 10,
      items: [{ id: 1, title: "Item", price: 10 }],
    }),
  );
  for (const url of [
    "http://checkout.stripe.com/x",
    "https://checkout.stripe.com.evil.example/x",
    "https://evil.example",
  ])
    assert.throws(() => mod.exports.checkoutUrl(url));
  assert.equal(
    mod.exports.checkoutUrl("https://checkout.stripe.com/c/pay/test"),
    "https://checkout.stripe.com/c/pay/test",
  );
});

test("native checkout requires reviewed inventory setup as well as the mobile payment flag", async () =>
  assert.equal(
    (
      await run("/mobile/checkout", "POST", {
        stockEnabled: false,
        body: { expectedTotal: 15.19 },
      })
    ).status,
    503,
  ));
