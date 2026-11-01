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
const fees = load("artifacts/api-server/src/lib/marketplaceFees.ts");
const buyer = "buyer@example.com",
  seller = "seller@example.com",
  now = Date.parse("2026-10-06T12:00:00Z");
function engine({ kind = "auction", failOrder = false } = {}) {
  let seq = 0,
    attempt = null,
    orders = [],
    tail = Promise.resolve();
  const sessions = new Map(),
    queries = [];
  const source = {
    id: "S1",
    title: "Camera",
    category: "electronics",
    seller_email: seller,
    status: kind === "auction" ? "ended" : "active",
    winner_email: buyer,
    winner_bid: "20",
    reserve_price: "10",
    sale_price: "20",
    end_time: "2026-10-06T10:00:00Z",
    starts_at: "2026-10-06T10:00:00Z",
    ends_at: "2026-10-06T14:00:00Z",
    server_now: new Date(now),
  };
  function sql(s, ...values) {
    let text = s[0],
      v = [];
    values.forEach((x, i) => {
      if (x && typeof x === "object" && "text" in x) {
        text += x.text;
        v.push(...x.values);
      } else {
        text += "?";
        v.push(x);
      }
      text += s[i + 1];
    });
    return { text: text.replace(/\s+/g, " ").trim(), values: v };
  }
  sql.raw = (text) => ({ text, values: [] });
  async function execute(q) {
    queries.push(q);
    const t = q.text,
      v = q.values;
    let rows = [];
    if (t.startsWith("CREATE")) return { rows };
    if (t.startsWith("SELECT * FROM special_checkouts"))
      rows =
        attempt &&
        (t.includes("state<>'expired'") ? attempt.state !== "expired" : true)
          ? [attempt]
          : [];
    else if (t.startsWith("SELECT id FROM special_checkouts"))
      rows = attempt && attempt.state !== "expired" ? [attempt] : [];
    else if (t.startsWith("SELECT *,clock_timestamp")) rows = [source];
    else if (t.startsWith("SELECT seller_type"))
      rows = [{ seller_type: "private" }];
    else if (t.startsWith("SELECT key,value")) rows = [];
    else if (t.startsWith("INSERT INTO special_checkouts")) {
      attempt = {
        id: v[0],
        kind: v[1],
        source_id: v[2],
        buyer_email: v[3],
        quote: JSON.parse(v[4]),
        stripe_payload: JSON.parse(v[5]),
        stripe_session_id: null,
        state: "pending",
        created_at: new Date(),
      };
      rows = [attempt];
    } else if (t.startsWith("UPDATE special_checkouts")) {
      if (t.includes("state='paid'")) {
        attempt.state = "paid";
        attempt.stripe_session_id = v[0];
      } else if (t.includes("state='expired'")) {
        if (attempt.state !== "paid") attempt.state = "expired";
      } else {
        attempt.stripe_session_id = v[0];
        if (attempt.state === "pending") attempt.state = "open";
      }
    } else if (t.startsWith("INSERT INTO orders")) {
      if (failOrder) throw Error("Order failed");
      orders.push(v);
    } else if (t.startsWith("UPDATE flash_sales")) source.status = "ended";
    else throw Error("Unexpected SQL " + t);
    return { rows: structuredClone(rows) };
  }
  const db = {
    execute,
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = structuredClone([attempt, orders, source.status]);
      try {
        return await fn({ execute });
      } catch (e) {
        [attempt, orders, source.status] = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  const stripe = {
    checkout: {
      sessions: {
        create: async (payload, { idempotencyKey }) => {
          if (!sessions.has(idempotencyKey)) {
            sessions.set(idempotencyKey, {
              id: "cs_" + idempotencyKey,
              metadata: payload.metadata,
              client_reference_id: payload.client_reference_id,
              status: "open",
              payment_status: "unpaid",
              url: "https://checkout.stripe.com/c/pay/test",
              currency: "gbp",
              amount_total: attempt.quote.totalMinor,
            });
          }
          return structuredClone(sessions.get(idempotencyKey));
        },
        retrieve: async (id) =>
          structuredClone([...sessions.values()].find((s) => s.id === id)),
        expire: async (id) => {
          const s = [...sessions.values()].find((s) => s.id === id);
          s.status = "expired";
          return structuredClone(s);
        },
      },
    },
  };
  const api = load("artifacts/api-server/src/lib/specialPayments.ts", {
    db,
    sql,
    randomUUID: () => `ID${++seq}`,
    settledAuction: async () => {},
    getUncachableStripeClient: async () => stripe,
    ...fees,
    makeDealPayload: (email) => ({ client_reference_id: email }),
    publicDealQuote: (q) => ({ total: q.totalMinor / 100 }),
  });
  return {
    ...api,
    source,
    queries,
    get attempt() {
      return attempt;
    },
    get orders() {
      return orders;
    },
    pay: () => {
      const s = [...sessions.values()][0];
      s.status = "complete";
      s.payment_status = "paid";
      return s;
    },
    get sessions() {
      return sessions;
    },
  };
}
process.env.MOBILE_API_BASE_URL = "https://example.com/api";
test("only actual ended-auction winner may pay; invalid timing and unmet reserve fail", () => {
  const e = engine();
  assert.equal(e.payable(e.source, "auction", buyer, now), 2000);
  for (const extra of [
    { status: "active" },
    { winner_email: "other" },
    { winner_bid: 5 },
    { end_time: "bad" },
    { end_time: "2027-01-01" },
  ])
    assert.throws(() =>
      e.payable({ ...e.source, ...extra }, "auction", buyer, now),
    );
  assert.throws(() => e.payable(e.source, "auction", seller, now));
});
test("flash timing, cancellation, positive price and self-purchase are checked", () => {
  const e = engine({ kind: "flash" });
  assert.equal(e.payable(e.source, "flash", buyer, now), 2000);
  for (const extra of [
    { status: "cancelled" },
    { sale_price: 0 },
    { starts_at: "bad" },
    { ends_at: "bad" },
    { ends_at: "2026-10-06T11:00:00Z" },
  ])
    assert.throws(() =>
      e.payable({ ...e.source, ...extra }, "flash", buyer, now),
    );
});
test("checkout requires displayed total and charges one private protection fee", async () => {
  const e = engine();
  const q = await e.specialPayment("auction", "S1", buyer, "read");
  assert.equal(q.quote.total, 25.69);
  await assert.rejects(
    e.specialPayment("auction", "S1", buyer, "start", 20),
    /Fees changed/,
  );
  assert.equal(e.attempt, null);
});
test("parallel checkout starts cannot create two payment attempts", async () => {
  const e = engine();
  await Promise.allSettled([
    e.specialPayment("auction", "S1", buyer, "start", 25.69),
    e.specialPayment("auction", "S1", buyer, "start", 25.69),
  ]);
  assert.equal(e.sessions.size, 1);
  const resumed = await e.specialPayment("auction", "S1", buyer, "read");
  assert.equal(resumed.paymentState, "unpaid");
  assert.match(
    e.queries.find((q) => q.text.startsWith("SELECT *,")).text,
    /FOR UPDATE/,
  );
});
test("another flash buyer cannot see or pay reserved session; paid item cannot sell again", async () => {
  const e = engine({ kind: "flash" });
  await e.specialPayment("flash", "S1", buyer, "start", 25.69);
  await assert.rejects(
    e.specialPayment("flash", "S1", "other", "start", 25.69),
    /reserved or sold/,
  );
  e.pay();
  await e.specialPayment("flash", "S1", buyer, "read");
  assert.equal(e.source.status, "ended");
  await assert.rejects(
    e.specialPayment("flash", "S1", "other", "read"),
    /reserved or sold/,
  );
});
test("Stripe payment confirmation creates exactly one order across repeated callbacks", async () => {
  const e = engine();
  await e.specialPayment("auction", "S1", buyer, "start", 25.69);
  const s = e.pay();
  await Promise.all([
    e.fulfillSpecialSession(s.id),
    e.fulfillSpecialSession(s.id),
  ]);
  assert.equal(e.orders.length, 1);
  assert.equal(e.attempt.state, "paid");
});
test("unconfirmed amount or identity never creates an order", async () => {
  const e = engine();
  await e.specialPayment("auction", "S1", buyer, "start", 25.69);
  const s = e.pay();
  s.amount_total = 1;
  await assert.rejects(e.fulfillSpecialSession(s.id), /amount mismatch/);
  s.amount_total = 2569;
  s.metadata.kind = "flash";
  await assert.rejects(e.fulfillSpecialSession(s.id), /identity mismatch/);
  assert.equal(e.orders.length, 0);
});
test("failed order write rolls back paid state; paid sessions cannot be cancelled", async () => {
  const e = engine({ failOrder: true });
  await e.specialPayment("auction", "S1", buyer, "start", 25.69);
  e.pay();
  await assert.rejects(
    e.specialPayment("auction", "S1", buyer, "read"),
    /Order failed/,
  );
  assert.equal(e.attempt.state, "open");
  await assert.rejects(
    e.specialPayment("auction", "S1", buyer, "cancel"),
    /complete/,
  );
});
test("confirmed Stripe cancellation releases the item for another flash buyer", async () => {
  const e = engine({ kind: "flash" });
  await e.specialPayment("flash", "S1", buyer, "start", 25.69);
  const r = await e.specialPayment("flash", "S1", buyer, "cancel");
  assert.equal(r.paymentState, "expired");
  await e.specialPayment("flash", "S1", "other", "start", 25.69);
  assert.equal(e.attempt.buyer_email, "other");
});
const routerStub = () => ({
  use: () => {},
  get: () => {},
  post: () => {},
  delete: () => {},
});
test("stream links reject script URLs, credentials, lookalike hosts and unsupported providers", () => {
  const { streamUrl } = load("artifacts/api-server/src/routes/mobileLive.ts", {
    Router: routerStub,
    requireMobileMember: () => {},
  });
  for (const [u, p] of [
    ["javascript:alert(1)", "youtube"],
    ["https://youtube.com.evil.com/a", "youtube"],
    ["https://u:p@youtube.com/a", "youtube"],
    ["https://twitch.tv/a", "other"],
  ])
    assert.throws(() => streamUrl(u, p));
  assert.equal(
    streamUrl("https://youtu.be/abc", "youtube"),
    "https://youtu.be/abc",
  );
});
test("credit product configuration rejects non-integer quantities and invalid identifiers", () => {
  const { creditProducts } = load(
    "artifacts/api-server/src/routes/mobileCredits.ts",
    { Router: routerStub, requireMobileMember: () => {} },
  );
  for (const value of ['{"pack":0}', '{"pack":1.5}', '{"pack":"100"}', "[]"]) {
    process.env.PLAY_CREDIT_PRODUCTS = value;
    assert.throws(() => creditProducts());
  }
  process.env.PLAY_CREDIT_PRODUCTS = '{"bazunk_100":100}';
  assert.deepEqual(creditProducts(), { bazunk_100: 100 });
});
test("native wallet and promotion parsers reject unconfirmed or malformed financial responses", () => {
  const n = load("apps/bazunk-android/src/business.ts");
  assert.throws(() =>
    n.parseWallet({
      balance: "10",
      products: {},
      purchasesEnabled: true,
      history: [],
    }),
  );
  assert.throws(() =>
    n.parsePromotions({ balance: 1, catalog: [{ credits: -3 }], active: [] }),
  );
  assert.throws(() => n.saved({ error: "failed" }));
  assert.equal(
    n.parseWallet({
      balance: 100,
      products: { pack: 100 },
      purchasesEnabled: true,
      history: [],
    }).balance,
    100,
  );
});
function creditWebhook({ failLedger = false } = {}) {
  let handler,
    credit = 0,
    purchase = null,
    ledger = [],
    tail = Promise.resolve();
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  async function execute(q) {
    const t = q.text,
      v = q.values;
    if (t.startsWith("CREATE") || t.startsWith("SELECT pg_advisory"))
      return { rows: [] };
    if (t.startsWith("SELECT * FROM play_credit"))
      return { rows: purchase ? [structuredClone(purchase)] : [] };
    if (t.startsWith("UPDATE users")) {
      credit += v[0];
      return { rows: [{ email: buyer }] };
    }
    if (t.startsWith("INSERT INTO play_credit")) {
      purchase = {
        transaction_id: v[0],
        event_id: v[1],
        email: v[2],
        product_id: v[3],
        credits: v[4],
        state: v[5],
        environment: v[6],
      };
      return { rows: [] };
    }
    if (t.startsWith("UPDATE play_credit")) {
      purchase.state = "refunded";
      return { rows: [] };
    }
    if (t.startsWith("INSERT INTO credit_economy")) {
      if (failLedger) throw Error("Ledger failed");
      ledger.push(v);
      return { rows: [] };
    }
    throw Error("Unexpected " + t);
  }
  const db = {
    execute,
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = structuredClone([credit, purchase, ledger]);
      try {
        return await fn({ execute });
      } catch (e) {
        [credit, purchase, ledger] = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  load("artifacts/api-server/src/routes/mobileCredits.ts", {
    Router: () => ({ get: () => {}, post: (_p, fn) => (handler = fn) }),
    db,
    sql,
    requireMobileMember: () => {},
    ensureCreditEconomyTable: async () => {},
    timingSafeEqual: crypto.timingSafeEqual,
    randomUUID: crypto.randomUUID,
    clerkClient: {
      users: {
        getUser: async () => ({
          primaryEmailAddressId: "p",
          emailAddresses: [
            {
              id: "p",
              emailAddress: buyer,
              verification: { status: "verified" },
            },
          ],
        }),
      },
    },
  });
  process.env.REVENUECAT_WEBHOOK_AUTH = "test-secret";
  process.env.PLAY_CREDIT_PRODUCTS = '{"bazunk_100":100}';
  delete process.env.PLAY_ALLOW_SANDBOX;
  return {
    get credit() {
      return credit;
    },
    get purchase() {
      return purchase;
    },
    get ledger() {
      return ledger;
    },
    send: async (event, auth = "test-secret") => {
      let status = 200,
        body;
      const res = {
        status: (n) => {
          status = n;
          return res;
        },
        json: (x) => (body = x),
      };
      await handler({ get: () => auth, body: { event } }, res);
      return { status, body };
    },
  };
}
const purchaseEvent = {
  id: "event-1",
  transaction_id: "GPA.123",
  app_user_id: "user_test",
  type: "NON_RENEWING_PURCHASE",
  store: "PLAY_STORE",
  environment: "PRODUCTION",
  product_id: "bazunk_100",
  price_in_purchased_currency: 1.29,
  currency: "GBP",
};
test("credit webhook requires configured secret and ignores forged store/sandbox events", async () => {
  const e = creditWebhook();
  assert.equal((await e.send(purchaseEvent, "wrong")).status, 401);
  assert.equal(
    (await e.send({ ...purchaseEvent, store: "STRIPE" })).status,
    400,
  );
  assert.equal(
    (await e.send({ ...purchaseEvent, environment: "SANDBOX" })).status,
    400,
  );
  assert.equal(e.credit, 0);
});
test("concurrent Google Play webhook retries credit one purchase once with actual cash recorded", async () => {
  const e = creditWebhook();
  const r = await Promise.all([e.send(purchaseEvent), e.send(purchaseEvent)]);
  assert.equal(
    r.every((x) => x.status === 200),
    true,
  );
  assert.equal(e.credit, 1);
  assert.equal(e.ledger.length, 1);
  assert.equal(e.ledger[0][4], 1.29);
});
test("purchase refund reverses credits once and refund arriving before purchase prevents later award", async () => {
  const e = creditWebhook();
  await e.send(purchaseEvent);
  await e.send({ ...purchaseEvent, type: "CANCELLATION", id: "refund" });
  await e.send({ ...purchaseEvent, type: "CANCELLATION", id: "refund" });
  assert.equal(e.credit, 0);
  assert.equal(e.ledger.length, 2);
  const firstRefund = creditWebhook();
  await firstRefund.send({ ...purchaseEvent, type: "CANCELLATION" });
  await firstRefund.send(purchaseEvent);
  assert.equal(firstRefund.credit, 0);
  assert.equal(firstRefund.purchase.state, "refunded");
});
test("failed Google Play ledger commit rolls back wallet and purchase marker so retry is safe", async () => {
  const e = creditWebhook({ failLedger: true });
  assert.equal((await e.send(purchaseEvent)).status, 500);
  assert.equal(e.credit, 0);
  assert.equal(e.purchase, null);
});
test("unknown credit products and anonymous RevenueCat users never receive credits", async () => {
  const e = creditWebhook();
  assert.equal(
    (await e.send({ ...purchaseEvent, product_id: "unknown" })).status,
    400,
  );
  assert.equal(
    (await e.send({ ...purchaseEvent, app_user_id: "$RCAnonymousID:1" }))
      .status,
    400,
  );
  assert.equal(e.credit, 0);
});

function promotionEngine({
  legacy = false,
  failLedger = false,
  owned = true,
  balance = 2,
} = {}) {
  let handler,
    credit = balance,
    promotions = [],
    ledger = [],
    tail = Promise.resolve();
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  async function execute({ text: t, values: v }) {
    if (t.startsWith("SELECT type,cost")) return { rows: [] };
    if (t.startsWith("SELECT id, public_id"))
      return {
        rows: owned ? [{ id: 1, seller_email: buyer, status: "active" }] : [],
      };
    if (t.startsWith("SELECT id,status"))
      return { rows: owned ? [{ id: 1, status: "active" }] : [] };
    if (t.startsWith("SELECT email FROM users"))
      return { rows: [{ email: buyer }] };
    if (t.startsWith("SELECT metadata FROM credit"))
      return { rows: ledger.filter((x) => x.requestId === v[0]) };
    if (t.startsWith("SELECT id FROM listing_promotions"))
      return { rows: promotions };
    if (t.startsWith("UPDATE users")) {
      if (credit < v[0]) return { rows: [] };
      credit -= v[0];
      return { rows: [{ credits: credit }] };
    }
    if (t.startsWith("INSERT INTO listing_promotions")) {
      promotions.push({ id: 1 });
      return { rows: [] };
    }
    if (t.startsWith("INSERT INTO credit_economy")) {
      if (failLedger) throw Error("Ledger unavailable");
      ledger.push({
        requestId: legacy ? null : v[4],
        metadata: JSON.parse(v[legacy ? 4 : 5]),
      });
      return { rows: [] };
    }
    throw Error("Unexpected promotion SQL " + t);
  }
  const tx = {
    execute,
    insert: () => ({ values: async () => promotions.push({ id: 1 }) }),
  };
  const db = {
    execute,
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = structuredClone([credit, promotions, ledger]);
      try {
        return await fn(tx);
      } catch (e) {
        [credit, promotions, ledger] = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  const config = {
    type: "featured-badge",
    label: "Featured",
    cost: 1,
    daysValid: 7,
    enabled: true,
  };
  load(
    "artifacts/api-server/src/routes/" +
      (legacy ? "promotions.ts" : "mobilePromotions.ts"),
    {
      Router: () => ({
        get: () => {},
        delete: () => {},
        put: () => {},
        post: (p, ...f) => {
          if (p === (legacy ? "/promotions/apply" : "/mobile/promotions"))
            handler = f.at(-1);
        },
      }),
      db,
      sql,
      listingPromotionsTable: {},
      randomUUID: crypto.randomUUID,
      requireMobileMember: () => {},
      requireAdmin: () => {},
      featureEnabled: async () => true,
      ensureCreditEconomyTable: async () => {},
      PROMO_DEFAULTS: new Proxy({}, { get: () => config }),
      getPromoConfig: async () => config,
      logger: { info: () => {}, error: () => {} },
      sendSystemMessage: async () => {},
    },
  );
  return {
    get credit() {
      return credit;
    },
    get promotions() {
      return promotions;
    },
    send: async (body = {}) => {
      let status = 200,
        response;
      const res = {
        locals: { mobileAccount: { email: buyer } },
        status: (n) => {
          status = n;
          return res;
        },
        json: (x) => (response = x),
      };
      await handler(
        {
          body: {
            listingId: 1,
            type: "featured-badge",
            requestId: "request-123456",
            expectedCredits: 100,
            ...body,
          },
        },
        res,
      );
      return { status, response };
    },
  };
}
test("promotion retries with the same reference charge once and active duplicates do not charge", async () => {
  const e = promotionEngine();
  const r = await Promise.all([e.send(), e.send()]);
  assert.equal(
    r.every((x) => x.status === 200),
    true,
  );
  assert.equal(e.credit, 1);
  assert.equal(e.promotions.length, 1);
  assert.equal((await e.send({ requestId: "another-123456" })).status, 409);
  assert.equal(e.credit, 1);
});
test("promotion ledger failures roll back both native and website charges and promotion records", async () => {
  for (const legacy of [false, true]) {
    const e = promotionEngine({ legacy, failLedger: true });
    assert.ok((await e.send()).status >= 400);
    assert.equal(e.credit, 2);
    assert.equal(e.promotions.length, 0);
  }
});
test("promotion ownership and insufficient balance prevent both native and website charges", async () => {
  for (const legacy of [false, true])
    for (const opts of [{ owned: false }, { balance: 0 }]) {
      const e = promotionEngine({ legacy, ...opts });
      assert.ok((await e.send()).status >= 400);
      assert.equal(e.credit, opts.balance ?? 2);
      assert.equal(e.promotions.length, 0);
    }
});
test("website promotion commits its charge and promotion together for the verified owner", async () => {
  const e = promotionEngine({ legacy: true });
  assert.equal((await e.send({ email: "attacker@example.com" })).status, 200);
  assert.equal(e.credit, 1);
  assert.equal(e.promotions.length, 1);
});
