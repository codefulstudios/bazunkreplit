const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module"),
  assert = require("node:assert/strict"),
  test = require("node:test");
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
const quote = (ids = [1]) => ({
  units: ids.map((id) => ({
    id,
    sellerEmail: "seller@example.com",
    title: "Item " + id,
    image: null,
    priceMinor: 1000,
    protectionMinor: 50,
    sellerFeeMinor: 0,
    sellerType: "private",
    businessRate: 8,
    sellerNetMinor: 1000,
    deliveryMinor: 0,
    buyerTotalMinor: 1050,
  })),
  totalMinor: ids.length * 1050,
  policy: "test",
});
function engine({ quantities = { 1: 1, 2: 1 }, failOrder = 0 } = {}) {
  let listings = new Map(
      Object.keys(quantities).map((id) => [
        Number(id),
        {
          id: Number(id),
          seller_email: "seller@example.com",
          status: "active",
        },
      ]),
    ),
    inventory = new Map(
      Object.entries(quantities).map(([id, n]) => [Number(id), n]),
    ),
    headers = new Map(),
    items = [],
    orders = [],
    tail = Promise.resolve();
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  sql.join = (entries) => ({ entries });
  const held = (id) =>
    items
      .filter((i) => i.id === id && headers.get(i.session)?.state === "held")
      .reduce((n, i) => n + i.quantity, 0);
  const execute = async (q) => {
    const t = q.text,
      v = q.values;
    if (t.startsWith("CREATE")) return { rows: [] };
    if (t.startsWith("SELECT id,status,seller_email FROM listings WHERE id IN"))
      return {
        rows: v[0].entries
          .map((e) => listings.get(e.values[0]))
          .filter(Boolean),
      };
    if (t.startsWith("SELECT id,status,seller_email FROM listings WHERE id="))
      return { rows: listings.has(v[0]) ? [listings.get(v[0])] : [] };
    if (t.startsWith("SELECT id FROM marketplace_offers"))
      return { rows: [{ id: "offer" }] };
    if (t.startsWith("SELECT state,stripe_session_id"))
      return { rows: [{ state: "open", stripe_session_id: "cs_paid" }] };
    if (
      t.startsWith("UPDATE marketplace_offer_checkouts") ||
      t.startsWith("UPDATE marketplace_offers")
    )
      return { rows: [] };
    if (t.startsWith("SELECT id FROM listings")) return { rows: [] };
    if (t.startsWith("INSERT INTO listing_inventory")) {
      if (!inventory.has(v[0])) inventory.set(v[0], 1);
      return { rows: [] };
    }
    if (t.startsWith("SELECT i.quantity"))
      return { rows: [{ quantity: inventory.get(v[0]), held: held(v[0]) }] };
    if (
      t.startsWith("SELECT buyer_email,payload,state") ||
      t.startsWith("SELECT payload,state") ||
      t.startsWith("SELECT payload FROM stock_reservations")
    )
      return {
        rows: headers.has(v[0]) ? [structuredClone(headers.get(v[0]))] : [],
      };
    if (t.startsWith("INSERT INTO stock_reservations")) {
      headers.set(v[0], {
        buyer_email: v[1],
        payload: JSON.parse(v[2]),
        state: "held",
      });
      return { rows: [] };
    }
    if (t.startsWith("INSERT INTO stock_reservation_items")) {
      items.push({ session: v[0], id: v[1], quantity: v[2] });
      return { rows: [] };
    }
    if (t.startsWith("UPDATE stock_reservations")) {
      const h = headers.get(v[0]);
      if (h && (!t.includes("AND state='held'") || h.state === "held"))
        h.state = t.includes("state='released'") ? "released" : "consumed";
      return { rows: [] };
    }
    if (t.startsWith("UPDATE listing_inventory SET quantity=quantity-")) {
      inventory.set(v[1], inventory.get(v[1]) - v[0]);
      return { rows: [] };
    }
    if (t.startsWith("UPDATE listing_inventory SET quantity=")) {
      inventory.set(v[1], v[0]);
      return { rows: [] };
    }
    if (t.startsWith("UPDATE listings SET status='sold'")) {
      const l = listings.get(v[0]);
      if (l.status === "active" && inventory.get(v[0]) === 0) l.status = "sold";
      return { rows: [] };
    }
    if (t.startsWith("UPDATE listings SET status=CASE")) {
      const l = listings.get(v[2]);
      if (v[0] === 0 && l.status === "active") l.status = "sold";
      else if (v[1] > 0 && l.status === "sold") l.status = "active";
      return { rows: [] };
    }
    if (t.startsWith("INSERT INTO orders")) {
      if (failOrder && v[7] === failOrder) throw Error("Order write failed");
      if (orders.some((o) => o[6] === v[6] && o[7] === v[7]))
        return { rows: [] };
      orders.push(v);
      return { rows: [{ id: v[0] }] };
    }
    throw Error("Unexpected SQL " + t);
  };
  const db = {
    execute,
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const backup = structuredClone({
        listings,
        inventory,
        headers,
        items,
        orders,
      });
      try {
        return await fn({ execute });
      } catch (e) {
        ({ listings, inventory, headers, items, orders } = backup);
        throw e;
      } finally {
        release();
      }
    },
  };
  const api = load("artifacts/api-server/src/lib/inventory.ts", { db, sql });
  const notify = async () => {};
  const fulfillment = load(
    "artifacts/api-server/src/lib/stockOrderFulfillment.ts",
    {
      db,
      sql,
      ...api,
      sendOrderConfirmation: notify,
      sendSellerSaleNotification: notify,
      sendSystemMessage: notify,
      refreshSellerMilestones: notify,
      awardReferralMilestone: notify,
    },
  );
  const deals = load("artifacts/api-server/src/lib/dealOrderFulfillment.ts", {
    db,
    sql,
    ...api,
    sendOrderConfirmation: notify,
    sendSellerSaleNotification: notify,
    sendSystemMessage: notify,
    refreshSellerMilestones: notify,
    awardReferralMilestone: notify,
  });
  return {
    ...api,
    ...fulfillment,
    ...deals,
    db,
    get inventory() {
      return inventory;
    },
    get headers() {
      return headers;
    },
    get listings() {
      return listings;
    },
    get orders() {
      return orders;
    },
  };
}
const expiry = () => Math.floor(Date.now() / 1000) + 1800;
async function consume(e, id, q) {
  return e.db.transaction(async (tx) => {
    await e.lockInventory(tx, q);
    return e.consumeStock(tx, id, q);
  });
}
test("concurrent website/app reservations cannot both claim the final unit", async () => {
  const e = engine();
  const results = await Promise.allSettled([
    e.reserveStock("cs_web", "a", quote(), expiry()),
    e.reserveStock("cs_app", "b", quote(), expiry()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(e.headers.size, 1);
  assert.equal(e.inventory.get(1), 1);
});
test("repeat checkout is idempotent even after JSONB object key reordering", async () => {
  const e = engine();
  await e.reserveStock("cs_one", "buyer", quote(), expiry());
  e.headers.get("cs_one").payload = [
    { sellerEmail: "seller@example.com", quantity: 1, id: 1 },
  ];
  await e.reserveStock("cs_one", "buyer", quote(), expiry());
  assert.equal(e.headers.size, 1);
  await assert.rejects(
    e.reserveStock("cs_one", "attacker", quote(), expiry()),
    /identity/,
  );
});
test("multi-item reservation failure rolls back all held units", async () => {
  const e = engine({ quantities: { 1: 1, 2: 0 } });
  await assert.rejects(
    e.reserveStock("cs_many", "buyer", quote([1, 2]), expiry()),
    /sold out/,
  );
  assert.equal(e.headers.size, 0);
  await e.reserveStock("cs_available", "buyer", quote(), expiry());
});
test("stock edits enforce owner and cannot reduce quantities beneath held stock", async () => {
  const e = engine({ quantities: { 1: 3 } });
  await e.reserveStock("cs_two", "buyer", quote([1, 1]), expiry());
  await assert.rejects(e.setStock(1, 1, "seller@example.com"), /lower/);
  await assert.rejects(e.setStock(1, 3, "attacker@example.com"), /not found/);
  assert.deepEqual(await e.setStock(1, 4, "seller@example.com"), {
    quantity: 4,
    held: 2,
    available: 2,
  });
});
test("confirmed release restores availability and cannot release consumed stock", async () => {
  const e = engine();
  await e.reserveStock("cs_old", "buyer", quote(), expiry());
  await e.releaseStock("cs_old");
  await assert.rejects(
    e.reserveStock("cs_old", "buyer", quote(), expiry()),
    /released/,
  );
  await e.reserveStock("cs_new", "buyer", quote(), expiry());
  assert.equal(await consume(e, "cs_new", quote()), true);
  assert.equal(await consume(e, "cs_new", quote()), false);
  await e.releaseStock("cs_new");
  assert.equal(e.headers.get("cs_new").state, "consumed");
  assert.equal(e.inventory.get(1), 0);
  assert.equal(e.listings.get(1).status, "sold");
});
test("restocking reactivates sold listings but preserves draft status", async () => {
  const e = engine();
  await e.setStock(1, 0, "seller@example.com");
  assert.equal(e.listings.get(1).status, "sold");
  await e.setStock(1, 2, "seller@example.com");
  assert.equal(e.listings.get(1).status, "active");
  e.listings.get(1).status = "draft";
  await e.setStock(1, 3, "seller@example.com");
  assert.equal(e.listings.get(1).status, "draft");
});
const paid = (q) => ({
  id: "cs_paid",
  payment_status: "paid",
  currency: "gbp",
  amount_total: q.totalMinor,
  client_reference_id: "buyer",
});
test("paid multi-item cart commits stock and all orders exactly once", async () => {
  const e = engine(),
    q = quote([1, 2]);
  await e.reserveStock("cs_paid", "buyer", q, expiry());
  await Promise.all([
    e.fulfillReservedCart(paid(q), q, "buyer"),
    e.fulfillReservedCart(paid(q), q, "buyer"),
  ]);
  assert.equal(e.orders.length, 2);
  assert.equal(e.inventory.get(1), 0);
  assert.equal(e.inventory.get(2), 0);
  assert.equal(e.headers.get("cs_paid").state, "consumed");
});
test("failed second order rolls back the whole cart and stock consumption", async () => {
  const e = engine({ failOrder: 2 }),
    q = quote([1, 2]);
  await e.reserveStock("cs_paid", "buyer", q, expiry());
  await assert.rejects(
    e.fulfillReservedCart(paid(q), q, "buyer"),
    /Order write/,
  );
  assert.equal(e.orders.length, 0);
  assert.equal(e.inventory.get(1), 1);
  assert.equal(e.inventory.get(2), 1);
  assert.equal(e.headers.get("cs_paid").state, "held");
});
test("missing reservation and paid amount mismatch never create orders", async () => {
  const e = engine(),
    q = quote();
  await assert.rejects(e.fulfillReservedCart(paid(q), q, "buyer"), /missing/);
  await assert.rejects(
    e.fulfillReservedCart({ ...paid(q), amount_total: 1 }, q, "buyer"),
    /mismatch/,
  );
  assert.equal(e.orders.length, 0);
});
function stripeHarness({
  status = "open",
  paid = false,
  failReserve = false,
  failExpire = false,
} = {}) {
  let released = 0,
    expired = 0;
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => ({
          id: "cs_one",
          status,
          payment_status: paid ? "paid" : "unpaid",
        }),
        expire: async () => {
          expired++;
          if (failExpire) throw Error("Stripe unavailable");
          status = "expired";
        },
      },
    },
  };
  const api = load("artifacts/api-server/src/lib/reserveStripeStock.ts", {
    getUncachableStripeClient: async () => stripe,
    reserveStock: async () => {
      if (failReserve) throw Error("Reservation failed");
    },
    releaseStock: async () => released++,
    INVENTORY_POLICY: "listing-stock-v1",
    StockError: class extends Error {},
  });
  return {
    ...api,
    get released() {
      return released;
    },
    get expired() {
      return expired;
    },
  };
}
test("expiry recovery preserves paid/open sessions and releases Stripe-confirmed expiry only", async () => {
  for (const config of [
    { status: "open" },
    { status: "expired", paid: true },
  ]) {
    const e = stripeHarness(config);
    await assert.rejects(e.releaseExpiredStripeStock("cs_one"));
    assert.equal(e.released, 0);
  }
  const e = stripeHarness({ status: "expired" });
  await e.releaseExpiredStripeStock("cs_one");
  assert.equal(e.released, 1);
});
test("failed hold creation cancels payment and releases only after confirmed expiry", async () => {
  for (const failExpire of [false, true]) {
    const e = stripeHarness({ failReserve: true, failExpire });
    await assert.rejects(
      e.holdStripeStock(
        {
          id: "cs_one",
          status: "open",
          client_reference_id: "buyer",
          expires_at: expiry(),
          metadata: { inventoryPolicy: "listing-stock-v1" },
        },
        quote(),
      ),
    );
    assert.equal(e.expired, 1);
    assert.equal(e.released, failExpire ? 0 : 1);
  }
});
test("remaining quantity and native availability parsers reject invalid responses", () => {
  const e = engine(),
    native = load("apps/bazunk-android/src/inventory.ts");
  for (const x of [-1, 1.5, 10001, null, "abc"])
    assert.throws(() => e.stockQuantity(x));
  assert.equal(e.stockQuantity("0"), 0);
  assert.throws(() =>
    native.parseInventory({
      id: 1,
      quantity: 2,
      held: 1,
      available: 2,
      status: "active",
    }),
  );
  assert.equal(
    native.parseInventory({
      id: 1,
      quantity: 2,
      held: 1,
      available: 1,
      status: "active",
    }).available,
    1,
  );
});
async function route(
  method,
  url,
  {
    email = "seller@example.com",
    listingStatus = "draft",
    failRecovery = false,
  } = {},
) {
  let handler,
    guarded = false,
    status = 200,
    result,
    queries = [];
  const member = () => {},
    admin = () => {},
    router = {
      use: () => {},
      get: (p, ...h) => {
        if (method === "GET" && p === url) {
          handler = h.at(-1);
          guarded = h.includes(member)
            ? "member"
            : h.includes(admin)
              ? "admin"
              : false;
        }
      },
      patch: () => {},
      post: (p, ...h) => {
        if (method === "POST" && p === url) {
          handler = h.at(-1);
          guarded = h.includes(admin) ? "admin" : false;
        }
      },
    };
  const sql = (s, ...values) => ({ text: s.join("?"), values });
  load("artifacts/api-server/src/routes/inventory.ts", {
    Router: () => router,
    requireMobileMember: member,
    requireAdmin: admin,
    ensureInventory: async () => {},
    setStock: async () => {},
    StockError: class extends Error {
      constructor(m, status = 409) {
        super(m);
        this.status = status;
      }
    },
    releaseExpiredStripeStock: async () => {
      if (failRecovery) throw Error("Not confirmed expired");
    },
    sql,
    db: {
      execute: async (q) => {
        queries.push(q);
        return {
          rows: q.text.startsWith("SELECT session_id")
            ? [{ session_id: "cs_one" }]
            : [
                {
                  id: 1,
                  status: listingStatus,
                  seller_email: "seller@example.com",
                  quantity: 2,
                  held: 1,
                },
              ],
        };
      },
    },
  });
  const res = {
    locals: { mobileAccount: { email } },
    status: (n) => {
      status = n;
      return res;
    },
    json: (x) => (result = x),
  };
  await handler({ params: { id: "1" } }, res);
  return { status, result, guarded, queries };
}
test("seller-private stock endpoint is guarded and public views hide draft listings and private email", async () => {
  const mine = await route("GET", "/inventory/listings/:id/mine");
  assert.equal(mine.guarded, "member");
  assert.equal(mine.status, 200);
  assert.equal(mine.result.available, 1);
  assert.equal(JSON.stringify(mine.result).includes("@"), false);
  assert.equal(
    (
      await route("GET", "/inventory/listings/:id/mine", {
        email: "attacker@example.com",
      })
    ).status,
    404,
  );
  assert.equal((await route("GET", "/inventory/listings/:id")).status, 404);
  assert.equal(
    (await route("GET", "/inventory/listings/:id", { listingStatus: "active" }))
      .status,
    200,
  );
});
test("expiry recovery is admin-only, bounded and reports unconfirmed holds as kept", async () => {
  for (const failRecovery of [false, true]) {
    const r = await route("POST", "/admin/inventory/reconcile", {
      failRecovery,
    });
    assert.equal(r.guarded, "admin");
    assert.match(r.queries[0].text, /LIMIT 20/);
    assert.deepEqual(r.result, {
      checked: 1,
      released: failRecovery ? 0 : 1,
      kept: failRecovery ? 1 : 0,
    });
  }
});

test("accepted deal consumes the same stock pool and excludes ordinary cart competition", async () => {
  const e = engine(),
    q = quote();
  await e.reserveStock("cs_paid", "buyer", q, expiry());
  await assert.rejects(
    e.reserveStock("cs_competing", "other", q, expiry()),
    /reserved/,
  );
  const session = {
    ...paid(q),
    metadata: { inventoryPolicy: "listing-stock-v1" },
  };
  await e.finishDealOrder(
    session,
    { id: "attempt", offer_id: "offer", buyer_email: "buyer" },
    q,
  );
  await e.finishDealOrder(
    session,
    { id: "attempt", offer_id: "offer", buyer_email: "buyer" },
    q,
  );
  assert.equal(e.orders.length, 1);
  assert.equal(e.inventory.get(1), 0);
  assert.equal(e.headers.get("cs_paid").state, "consumed");
});
test("reservation failure does not cancel or release a session already paid at Stripe", async () => {
  const e = stripeHarness({ paid: true, failReserve: true });
  await assert.rejects(
    e.holdStripeStock(
      {
        id: "cs_one",
        status: "open",
        expires_at: expiry(),
        metadata: { inventoryPolicy: "listing-stock-v1" },
      },
      quote(),
    ),
  );
  assert.equal(e.expired, 0);
  assert.equal(e.released, 0);
});
