const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module"),
  assert = require("node:assert/strict"),
  test = require("node:test"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../.."),
  esbuild = createRequire(path.join(root, "artifacts/api-server/package.json"))(
    "esbuild",
  );
function load(file, deps = {}) {
  const code = esbuild.transformSync(
    fs
      .readFileSync(path.join(root, file), "utf8")
      .replace(/^import[\s\S]*?;\n/gm, ""),
    { loader: "ts", format: "cjs" },
  ).code;
  const module = { exports: {} };
  new Function("module", "exports", ...Object.keys(deps), code)(
    module,
    module.exports,
    ...Object.values(deps),
  );
  return module.exports;
}
const rules = load("artifacts/api-server/src/lib/offerRules.ts"),
  fees = load("artifacts/api-server/src/lib/marketplaceFees.ts");
const basicOffer = (extra = {}) => ({
  id: "offer-1",
  listing_id: 1,
  buyer_email: "buyer@example.com",
  seller_email: "seller@example.com",
  status: "accepted",
  offer_price: "80",
  counter_price: "90",
  checkout_locked: false,
  paid_at: null,
  version: 2,
  ...extra,
});
function engine({
  offerExtra = {},
  sellerType = "private",
  incomplete = false,
  failAttach = false,
} = {}) {
  let offer = basicOffer(offerExtra),
    attempts = [],
    snapshots = new Map(),
    sessions = new Map(),
    orders = new Map(),
    tail = Promise.resolve(),
    createCalls = 0,
    expireCalls = 0,
    queries = [];
  const listing = {
    id: 1,
    status: "active",
    seller_email: "seller@example.com",
  };
  const quoteFor = (amount) =>
    fees.calculateFees(
      [
        {
          id: 1,
          title: "Phone",
          image: null,
          category: "electronics",
          sellerEmail: offer.seller_email,
          sellerType,
          businessRate: 8,
          quantity: 1,
          priceMinor: amount,
        },
      ],
      5,
      70,
      amount >= 5000 ? 0 : 399,
    );
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  const execute = async (q) => {
    queries.push(q);
    const t = q.text,
      v = q.values;
    if (t.startsWith("CREATE")) return { rows: [] };
    if (t.startsWith("SELECT * FROM marketplace_offers"))
      return {
        rows:
          v[0] === offer.id && String(v[1]).toLowerCase() === offer.buyer_email
            ? [structuredClone(offer)]
            : [],
      };
    if (t.startsWith("SELECT * FROM listings")) return { rows: [listing] };
    if (t.startsWith("SELECT * FROM marketplace_offer_checkouts")) {
      let rows = t.includes("WHERE id=")
        ? attempts.filter((a) => a.id === v[0])
        : attempts.filter((a) => a.offer_id === v[0]);
      if (t.includes("state<>'expired'"))
        rows = rows.filter((a) => a.state !== "expired");
      return { rows: rows.slice(-1).map((a) => structuredClone(a)) };
    }
    if (t.startsWith("INSERT INTO marketplace_offer_checkouts")) {
      const a = {
        id: v[0],
        offer_id: v[1],
        buyer_email: v[2],
        fee_quote_id: v[3],
        stripe_payload: JSON.parse(v[4]),
        stripe_session_id: null,
        state: "pending",
        created_at: new Date().toISOString(),
      };
      attempts.push(a);
      return { rows: [structuredClone(a)] };
    }
    if (t.startsWith("UPDATE marketplace_offers SET checkout_locked=true")) {
      offer.checkout_locked = true;
      offer.version++;
      return { rows: [] };
    }
    if (t.startsWith("UPDATE marketplace_offers SET paid_at")) {
      offer.paid_at = new Date().toISOString();
      offer.checkout_locked = true;
      return { rows: [] };
    }
    if (t.startsWith("UPDATE marketplace_offers SET checkout_locked=false")) {
      if (
        !offer.paid_at &&
        !attempts.some((a) => a.state !== "expired") &&
        offer.checkout_locked
      ) {
        offer.checkout_locked = false;
        offer.version++;
      }
      return { rows: [] };
    }
    if (
      t.startsWith("UPDATE marketplace_offer_checkouts SET stripe_session_id")
    ) {
      const a = attempts.find((a) => a.id === v[1]);
      if (failAttach && t.includes("state='pending'")) {
        failAttach = false;
        throw Error("Lost attach response");
      }
      a.stripe_session_id = v[0];
      if (t.includes("state='paid'")) a.state = "paid";
      else if (t.includes("state='expired'")) a.state = "expired";
      else if (a.state === "pending") a.state = "open";
      return { rows: [] };
    }
    if (t.startsWith("SELECT COUNT(*)"))
      return { rows: [{ count: orders.get(v[0]) ?? 0 }] };
    throw Error("Unexpected query " + t);
  };
  const db = {
    execute,
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const beforeOffer = structuredClone(offer),
        beforeAttempts = structuredClone(attempts);
      try {
        return await fn({ execute });
      } catch (e) {
        offer = beforeOffer;
        attempts = beforeAttempts;
        throw e;
      } finally {
        release();
      }
    },
  };
  const stripe = {
    checkout: {
      sessions: {
        create: async (payload, options) => {
          createCalls++;
          if (sessions.has(options.idempotencyKey))
            return structuredClone(sessions.get(options.idempotencyKey));
          const s = {
            id: "cs_test_" + (sessions.size + 1),
            status: "open",
            payment_status: "unpaid",
            url: "https://checkout.stripe.com/c/pay/test",
            client_reference_id: payload.client_reference_id,
            metadata: payload.metadata,
            currency: "gbp",
            amount_total: snapshots.get(payload.metadata.feeQuoteId).totalMinor,
          };
          sessions.set(options.idempotencyKey, s);
          return structuredClone(s);
        },
        retrieve: async (id) => {
          const s = [...sessions.values()].find((s) => s.id === id);
          if (!s) throw Error("No session");
          return structuredClone(s);
        },
        expire: async (id) => {
          expireCalls++;
          const s = [...sessions.values()].find((s) => s.id === id);
          if (s.status !== "open" || s.payment_status === "paid")
            throw Error("Cannot expire");
          s.status = "expired";
          s.url = null;
          return structuredClone(s);
        },
      },
    },
  };
  const api = load("artifacts/api-server/src/lib/dealPayments.ts", {
    holdStripeStock: async () => {},
    releaseExpiredStripeStock: async () => {},
    INVENTORY_POLICY: "listing-stock-v1",
    db,
    sql,
    randomUUID: crypto.randomUUID,
    ensureOfferTable: async () => {},
    ensureFeeSchema: async () => {},
    ...rules,
    quoteCart: async (items, agreed) => {
      assert.deepEqual(items, [{ id: 1, quantity: 1 }]);
      assert.equal(agreed.sellerEmail, offer.seller_email);
      if (listing.status !== "active")
        throw new rules.OfferError("Unavailable", 409);
      return quoteFor(agreed.priceMinor);
    },
    saveFeeSnapshot: async (q) => {
      const id = crypto.randomUUID();
      snapshots.set(id, structuredClone(q));
      return id;
    },
    getFeeSnapshot: async (id) => {
      if (!snapshots.has(id)) throw Error("Missing snapshot");
      return structuredClone(snapshots.get(id));
    },
    finishDealOrder: async (session, attempt, quote) => {
      const id = session.id;
      assert.equal(attempt.buyer_email, "buyer@example.com");
      assert.equal(quote.units.length, 1);
      if (incomplete) return { status: "already_done" };
      if (orders.has(id)) return { status: "already_done" };
      orders.set(id, 1);
      return { status: "fulfilled" };
    },
    getUncachableStripeClient: async () => stripe,
  });
  return {
    ...api,
    listing,
    queries,
    snapshots,
    sessions,
    orders,
    get attempts() {
      return attempts;
    },
    get offer() {
      return offer;
    },
    get createCalls() {
      return createCalls;
    },
    get expireCalls() {
      return expireCalls;
    },
  };
}
process.env.MOBILE_API_BASE_URL = "https://bazunk.com/api";
test("accepted and counter-accepted amounts come only from the offer row and buyer identity", () => {
  const e = engine();
  assert.equal(e.acceptedAmount(basicOffer(), "buyer@example.com"), 8000);
  assert.equal(
    e.acceptedAmount(
      basicOffer({ status: "counter_accepted" }),
      "buyer@example.com",
    ),
    9000,
  );
  assert.throws(
    () => e.acceptedAmount(basicOffer(), "attacker@example.com"),
    /not found/,
  );
  assert.throws(
    () =>
      e.acceptedAmount(basicOffer({ status: "pending" }), "buyer@example.com"),
    /Only accepted/,
  );
  assert.throws(() =>
    e.acceptedAmount(basicOffer({ offer_price: "NaN" }), "buyer@example.com"),
  );
});
test("private and business fees use agreed value, with protection only on private item", async () => {
  const p = await engine().getDealPayment("buyer@example.com", "offer-1");
  assert.equal(p.quote.subtotal, 80);
  assert.equal(p.quote.buyerProtectionFee, 4.7);
  assert.equal(p.quote.total, 84.7);
  const e = engine({ sellerType: "business" });
  const b = await e.getDealPayment("buyer@example.com", "offer-1");
  assert.equal(b.quote.total, 80);
  await e.startDealPayment("buyer@example.com", "offer-1", 80);
  assert.equal([...e.snapshots.values()][0].units[0].sellerFeeMinor, 640);
});
test("stale expected total prevents checkout, lock and Stripe creation", async () => {
  const e = engine();
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 100),
    /Fees changed/,
  );
  assert.equal(e.attempts.length, 0);
  assert.equal(e.offer.checkout_locked, false);
  assert.equal(e.createCalls, 0);
});
test("same offer creates one durable attempt and repeated/concurrent starts reuse Stripe key", async () => {
  const e = engine();
  const r = await Promise.all([
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
  ]);
  assert.equal(e.attempts.length, 1);
  assert.equal(e.sessions.size, 1);
  assert.equal(r[0].url, r[1].url);
  assert.equal(e.offer.checkout_locked, true);
  const locks = e.queries.filter((q) => q.text.includes("FOR UPDATE"));
  assert.match(locks[0].text, /listings/);
  assert.match(locks[1].text, /marketplace_offers/);
});
test("lost DB attachment recovers same Stripe session rather than charging again", async () => {
  const e = engine({ failAttach: true });
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
    /Lost attach/,
  );
  assert.equal(e.attempts.length, 1);
  assert.equal(e.sessions.size, 1);
  assert.equal(e.attempts[0].stripe_session_id, null);
  const r = await e.getDealPayment("buyer@example.com", "offer-1");
  assert.equal(r.paymentState, "unpaid");
  assert.equal(e.sessions.size, 1);
  assert.equal(e.attempts[0].stripe_session_id, "cs_test_1");
});
test("interrupted creation older than replay window blocks unsafe new session", async () => {
  const e = engine({ failAttach: true });
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
  );
  e.attempts[0].created_at = new Date(Date.now() - 24 * 3600000).toISOString();
  await assert.rejects(
    e.getDealPayment("buyer@example.com", "offer-1"),
    /needs support/,
  );
  assert.equal(e.sessions.size, 1);
});
test("another buyer cannot inspect, cancel or pay a private offer", async () => {
  const e = engine();
  for (const fn of [
    () => e.getDealPayment("attacker@example.com", "offer-1"),
    () => e.startDealPayment("attacker@example.com", "offer-1", 84.7),
    () => e.cancelDealPayment("attacker@example.com", "offer-1"),
  ])
    await assert.rejects(fn(), /not found/);
  assert.equal(e.sessions.size, 0);
});
test("unavailable or changed seller blocks a new accepted checkout", async () => {
  const e = engine();
  e.listing.status = "archived";
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
    /no longer available/,
  );
  assert.equal(e.sessions.size, 0);
  e.listing.status = "active";
  e.listing.seller_email = "other@example.com";
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
  );
});
test("payment lock prevents withdrawal and paid state is visible without private emails", async () => {
  const e = engine();
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  assert.throws(
    () =>
      rules.offerTransition(
        e.offer,
        "buyer@example.com",
        { version: e.offer.version, action: "withdraw" },
        Date.now(),
      ),
    /payment status/,
  );
  const dto = rules.offerDto(
    {
      ...e.offer,
      product_title: "Phone",
      listing_price: "100",
      message: "",
      created_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
    },
    "buyer@example.com",
  );
  assert.equal(dto.paymentState, "pending");
  assert.equal(JSON.stringify(dto).includes("@example.com"), false);
});
test("cancellation requires Stripe expiry, unlocks offer and new attempt is possible", async () => {
  const e = engine();
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  assert.equal(
    (await e.cancelDealPayment("buyer@example.com", "offer-1")).paymentState,
    "expired",
  );
  assert.equal(e.expireCalls, 1);
  assert.equal(e.offer.checkout_locked, false);
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  assert.equal(e.attempts.length, 2);
  assert.equal(e.sessions.size, 2);
});
test("paid checkout cannot be cancelled and repeated confirmation creates one order", async () => {
  const e = engine();
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  const s = [...e.sessions.values()][0];
  s.payment_status = "paid";
  s.status = "complete";
  await assert.rejects(
    e.cancelDealPayment("buyer@example.com", "offer-1"),
    /already be complete/,
  );
  assert.equal(
    (await e.getDealPayment("buyer@example.com", "offer-1")).paymentState,
    "paid",
  );
  assert.equal((await e.fulfillDealSession(s.id)).paymentState, "paid");
  assert.equal(e.orders.size, 1);
  assert.equal(e.offer.checkout_locked, true);
  assert.ok(e.offer.paid_at);
  assert.equal(e.expireCalls, 0);
});
test("paid amount/currency/metadata mismatches never confirm an order", async () => {
  for (const field of ["amount_total", "currency", "metadata"]) {
    const e = engine();
    await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
    const s = [...e.sessions.values()][0];
    s.payment_status = "paid";
    s.status = "complete";
    if (field === "amount_total") s.amount_total++;
    else if (field === "currency") s.currency = "usd";
    else s.metadata.offerId = "other-offer";
    await assert.rejects(e.getDealPayment("buyer@example.com", "offer-1"));
    assert.equal(e.orders.size, 0);
    assert.equal(e.offer.paid_at, null);
  }
});
test("incomplete fulfillment reports processing and webhook retry instead of paid", async () => {
  const e = engine({ incomplete: true });
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  const s = [...e.sessions.values()][0];
  s.payment_status = "paid";
  s.status = "complete";
  assert.equal(
    (await e.getDealPayment("buyer@example.com", "offer-1")).paymentState,
    "processing",
  );
  assert.equal(e.offer.paid_at, null);
  await assert.rejects(e.fulfillDealSession(s.id), /still pending/);
});
test("Stripe expiration webhook can reconcile an interrupted creation and release lock", async () => {
  const e = engine({ failAttach: true });
  await assert.rejects(
    e.startDealPayment("buyer@example.com", "offer-1", 84.7),
  );
  const s = [...e.sessions.values()][0];
  s.status = "expired";
  assert.equal((await e.fulfillDealSession(s.id)).paymentState, "expired");
  assert.equal(e.offer.checkout_locked, false);
  assert.equal(e.attempts[0].stripe_session_id, s.id);
});
test("session payload freezes verified identity, agreed price and safe return URL with no credits", async () => {
  const e = engine();
  await e.startDealPayment("buyer@example.com", "offer-1", 84.7);
  const p = e.attempts[0].stripe_payload;
  assert.equal(p.client_reference_id, "buyer@example.com");
  assert.equal(p.line_items[0].price_data.unit_amount, 8000);
  assert.equal(p.metadata.creditsApplied, "0");
  assert.equal(p.metadata.type, "offer");
  assert.match(p.success_url, /deal-payment-return/);
  const q = [...e.snapshots.values()][0];
  for (const url of [
    undefined,
    "http://bazunk.com/api",
    "https://u:p@bazunk.com/api",
    "https://bazunk.com/api?x=1",
  ])
    assert.throws(() =>
      e.makeDealPayload("buyer@example.com", "offer-1", "a", "q", q, url),
    );
});
test("agreed-price quote override validates single unit and seller/currency before fees", async () => {
  const sql = (s, ...values) => ({ text: s.join("?"), values });
  sql.join = () => ({});
  const quote = load("artifacts/api-server/src/lib/checkoutQuote.ts", {
    checkStock: async () => {},
    db: {
      execute: async (q) =>
        q.text.startsWith("SELECT l.id")
          ? {
              rows: [
                {
                  id: 1,
                  title: "Phone",
                  price: "100",
                  currency: "GBP",
                  category: "electronics",
                  status: "active",
                  seller_email: "seller@example.com",
                  seller_type: "private",
                },
              ],
            }
          : { rows: [] },
    },
    sql,
    convertAmount: async () => 100,
    ...fees,
    randomUUID: crypto.randomUUID,
  });
  const override = {
    listingId: 1,
    priceMinor: 8000,
    sellerEmail: "seller@example.com",
  };
  assert.equal(
    (await quote.quoteCart([{ id: 1, quantity: 1 }], override)).totalMinor,
    8470,
  );
  await assert.rejects(
    quote.quoteCart([{ id: 1, quantity: 2 }], override),
    /Invalid agreed/,
  );
  await assert.rejects(
    quote.quoteCart([{ id: 1, quantity: 1 }], {
      ...override,
      sellerEmail: "attacker@example.com",
    }),
    /seller or listing currency/,
  );
  assert.equal(
    (await quote.quoteCart([{ id: 1, quantity: 1 }])).subtotalMinor,
    10000,
  );
});
test("native payment parser rejects malformed totals, states and unsafe Stripe links", () => {
  const commerce = load("apps/bazunk-android/src/commerce.ts"),
    native = load("apps/bazunk-android/src/dealPayment.ts", commerce),
    q = {
      currency: "GBP",
      subtotal: 80,
      buyerProtectionFee: 4.7,
      delivery: 0,
      total: 84.7,
      items: [{ id: 1, title: "Phone", price: 80 }],
    };
  assert.equal(
    native.parseDealPayment({
      paymentState: "unpaid",
      quote: q,
      url: "https://checkout.stripe.com/c/pay/test",
      enabled: true,
    }).quote.total,
    84.7,
  );
  for (const extra of [
    { paymentState: "done" },
    { enabled: "true" },
    { url: "https://evil.example.com" },
    { quote: { ...q, total: 90 } },
  ])
    assert.throws(() =>
      native.parseDealPayment({
        paymentState: "none",
        quote: q,
        url: null,
        enabled: true,
        ...extra,
      }),
    );
});
function orderEngine({ failMark = false } = {}) {
  let records = [],
    paid = false,
    offerPaid = false,
    notifications = 0,
    tail = Promise.resolve(),
    queries = [];
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  const execute = async (q) => {
    queries.push(q);
    if (q.text.startsWith("SELECT id FROM"))
      return { rows: [{ id: "offer-1" }] };
    if (q.text.startsWith("SELECT state,stripe_session_id"))
      return {
        rows: [
          { state: paid ? "paid" : "open", stripe_session_id: "cs_test_1" },
        ],
      };
    if (q.text.startsWith("INSERT INTO orders")) {
      if (records.length) return { rows: [] };
      records.push(q.values);
      return { rows: [{ id: q.values[0] }] };
    }
    if (q.text.startsWith("UPDATE marketplace_offer_checkouts")) {
      paid = true;
      return { rows: [] };
    }
    if (q.text.startsWith("UPDATE marketplace_offers")) {
      if (failMark) throw Error("Commit failed");
      offerPaid = true;
      return { rows: [] };
    }
    throw Error("Unexpected query");
  };
  const db = {
    transaction: async (fn) => {
      let release;
      const before = tail;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = { records: structuredClone(records), paid, offerPaid };
      try {
        return await fn({ execute });
      } catch (e) {
        records = snapshot.records;
        paid = snapshot.paid;
        offerPaid = snapshot.offerPaid;
        throw e;
      } finally {
        release();
      }
    },
  };
  const notify = async () => {
    notifications++;
  };
  const api = load("artifacts/api-server/src/lib/dealOrderFulfillment.ts", {
    ensureInventory: async () => {},
    lockInventory: async () => {},
    consumeStock: async () => {},
    INVENTORY_POLICY: "listing-stock-v1",
    db,
    sql,
    sendOrderConfirmation: notify,
    sendSellerSaleNotification: notify,
    sendSystemMessage: notify,
    refreshSellerMilestones: notify,
    awardReferralMilestone: notify,
  });
  const quote = fees.calculateFees(
    [
      {
        id: 1,
        title: "Phone",
        image: null,
        category: "electronics",
        sellerEmail: "seller@example.com",
        sellerType: "business",
        businessRate: 8,
        quantity: 1,
        priceMinor: 8000,
      },
    ],
    5,
    70,
    0,
  );
  const attempt = {
      id: "attempt-1",
      offer_id: "offer-1",
      buyer_email: "buyer@example.com",
    },
    session = {
      id: "cs_test_1",
      customer_details: { name: "Buyer" },
      collected_information: {
        shipping_details: {
          name: "Buyer",
          address: {
            line1: "1 Street",
            city: "Town",
            postal_code: "AB1 2CD",
            country: "GB",
          },
        },
      },
    };
  return {
    ...api,
    quote,
    attempt,
    session,
    queries,
    get records() {
      return records;
    },
    get paid() {
      return paid;
    },
    get offerPaid() {
      return offerPaid;
    },
    get notifications() {
      return notifications;
    },
  };
}
test("deal order price, seller net, address and paid state commit together exactly once", async () => {
  const e = orderEngine();
  const r = await Promise.all([
    e.finishDealOrder(e.session, e.attempt, e.quote),
    e.finishDealOrder(e.session, e.attempt, e.quote),
  ]);
  assert.equal(e.records.length, 1);
  assert.equal(e.paid, true);
  assert.equal(e.offerPaid, true);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(e.records[0][5], 80);
  assert.equal(e.records[0][8], 6.4);
  assert.equal(e.records[0][11], 73.6);
  assert.match(e.records[0][15], /1 Street/);
  assert.equal(e.notifications, 6);
});
test("failed paid-state write rolls back the inserted order and sends no notifications", async () => {
  const e = orderEngine({ failMark: true });
  await assert.rejects(
    e.finishDealOrder(e.session, e.attempt, e.quote),
    /Commit failed/,
  );
  assert.equal(e.records.length, 0);
  assert.equal(e.paid, false);
  assert.equal(e.offerPaid, false);
  assert.equal(e.notifications, 0);
});
async function paymentRoute(
  method,
  url,
  { enabled = true, feature = true, body = {} } = {},
) {
  let handler,
    guarded = false,
    called = false,
    status = 200,
    result;
  const guard = () => {},
    router = {
      use: () => {},
      get: (p, ...h) => {
        if (method === "GET" && p === url) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
      post: (p, ...h) => {
        if (method === "POST" && p === url) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
    };
  const oldStock = process.env.STOCK_RESERVATIONS_ENABLED;
  process.env.STOCK_RESERVATIONS_ENABLED = "true";
  const old = process.env.DEAL_CHECKOUT_ENABLED;
  process.env.DEAL_CHECKOUT_ENABLED = String(enabled);
  load("artifacts/api-server/src/routes/dealPayments.ts", {
    Router: () => router,
    requireMobileMember: guard,
    featureEnabled: async () => feature,
    ...rules,
    StockError: class extends Error {},
    QuoteError: class extends Error {},
    startDealPayment: async (email, id, total) => {
      called = { email, id, total };
      return { paymentState: "unpaid" };
    },
    getDealPayment: async (email) => {
      called = { email };
      return { paymentState: "unpaid" };
    },
    cancelDealPayment: async (email) => {
      called = { email };
      return { paymentState: "expired" };
    },
  });
  const res = {
    locals: { mobileAccount: { email: "buyer@example.com" } },
    status: (n) => {
      status = n;
      return res;
    },
    json: (x) => (result = x),
  };
  try {
    await handler({ params: { id: "offer-1" }, body }, res);
  } finally {
    if (oldStock === undefined) delete process.env.STOCK_RESERVATIONS_ENABLED;
    else process.env.STOCK_RESERVATIONS_ENABLED = oldStock;
    if (old === undefined) delete process.env.DEAL_CHECKOUT_ENABLED;
    else process.env.DEAL_CHECKOUT_ENABLED = old;
  }
  return { status, result, called, guarded };
}
test("payments are verified; disabled settings block new payments but allow status/cancellation", async () => {
  for (const method of ["GET", "POST"]) {
    const r = await paymentRoute(method, "/deal-payments/:id", {
      enabled: false,
      body: { expectedTotal: 84.7, email: "attacker@example.com" },
    });
    assert.equal(r.guarded, true);
    assert.equal(r.status, method === "POST" ? 503 : 200);
    if (method === "GET") assert.equal(r.called.email, "buyer@example.com");
  }
  assert.equal(
    (await paymentRoute("POST", "/deal-payments/:id", { feature: false }))
      .status,
    503,
  );
  const cancel = await paymentRoute("POST", "/deal-payments/:id/cancel", {
    enabled: false,
  });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.called.email, "buyer@example.com");
  assert.equal(
    (
      await paymentRoute("POST", "/deal-payments/:id", {
        body: { creditsApplied: 1 },
      })
    ).status,
    400,
  );
  const good = await paymentRoute("POST", "/deal-payments/:id", {
    body: { expectedTotal: 84.7, email: "attacker@example.com", offerPrice: 1 },
  });
  assert.deepEqual(good.called, {
    email: "buyer@example.com",
    id: "offer-1",
    total: 84.7,
  });
});
