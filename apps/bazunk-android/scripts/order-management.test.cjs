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
const native = load("apps/bazunk-android/src/orderManagement.ts");
function engine({
  status = "confirmed",
  blocked = false,
  failWrite = false,
} = {}) {
  let order = {
      id: "ORD-1",
      item_title: "Phone",
      status,
      buyer_email: "buyer@example.com",
      seller_email: "seller@example.com",
      price: "100",
      buyer_total: "109.69",
      buyer_protection_fee: "5.70",
      delivery_fee: "3.99",
      seller_fee: "8",
      seller_net: "92",
      address: "Buyer address",
      carrier: null,
      tracking_number: null,
      created_at: new Date("2026-10-05T10:00:00Z"),
      shipped_at:
        status === "shipped" ? new Date("2026-10-06T08:00:00Z") : null,
      delivered_at: null,
    },
    notifications = [],
    tail = Promise.resolve(),
    queries = [];
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  const execute = async (q) => {
    queries.push(q);
    const t = q.text,
      v = q.values;
    if (t.startsWith("SELECT * FROM orders"))
      return { rows: v[0] === order.id ? [structuredClone(order)] : [] };
    if (t.startsWith("SELECT EXISTS")) return { rows: [{ blocked }] };
    if (t.startsWith("UPDATE orders")) {
      if (failWrite) throw Error("DB update failed");
      if (t.includes("status='preparing'")) order.status = "preparing";
      else if (t.includes("status='shipped'")) {
        order.status = "shipped";
        order.shipped_at ??= new Date("2026-10-06T09:00:00Z");
        if (v[0]) order.carrier = v[0];
        if (v[1]) order.tracking_number = v[1];
      } else if (t.includes("status='delivered'")) {
        order.status = "delivered";
        order.delivered_at ??= new Date("2026-10-06T09:30:00Z");
      } else {
        order.carrier = v[0];
        order.tracking_number = v[1];
      }
      return { rows: [] };
    }
    throw Error("Unexpected SQL " + t);
  };
  const db = {
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = structuredClone(order);
      try {
        return await fn({ execute });
      } catch (e) {
        order = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  const api = load("artifacts/api-server/src/lib/orderWorkflow.ts", {
    db,
    sql,
    sendSystemMessage: async (...args) => notifications.push(args),
  });
  return {
    ...api,
    queries,
    get order() {
      return order;
    },
    get notifications() {
      return notifications;
    },
  };
}
const shipment = { carrier: "Royal Mail", trackingNumber: "ABC123" };
test("only actual buyer/seller can read order details; private identifiers are omitted", async () => {
  const e = engine();
  await assert.rejects(
    e.getManagedOrder("other@example.com", "ORD-1"),
    /not found/,
  );
  const buyer = await e.getManagedOrder("buyer@example.com", "ORD-1");
  assert.equal(JSON.stringify(buyer).includes("@"), false);
  assert.equal(buyer.amount, 109.69);
  assert.equal(buyer.sellerFee, null);
  const seller = await e.getManagedOrder("seller@example.com", "ORD-1");
  assert.equal(seller.amount, 92);
  assert.equal(seller.buyerProtectionFee, null);
  assert.equal(native.parseManagedOrder(seller).canPrepare, true);
});
test("server identity overrides client owner, role and status fields", async () => {
  const e = engine();
  await assert.rejects(
    e.manageOrder("buyer@example.com", "ORD-1", "dispatch", {
      ...shipment,
      email: "seller@example.com",
      role: "seller",
    }),
    /not available/,
  );
  await e.manageOrder("seller@example.com", "ORD-1", "prepare", {
    status: "delivered",
  });
  assert.equal(e.order.status, "preparing");
});
test("prepare transition is idempotent and notifies buyer once", async () => {
  const e = engine();
  await Promise.all([
    e.manageOrder("seller@example.com", "ORD-1", "prepare"),
    e.manageOrder("seller@example.com", "ORD-1", "prepare"),
  ]);
  assert.equal(e.order.status, "preparing");
  assert.equal(e.notifications.length, 1);
  assert.equal(e.notifications[0][0], "buyer@example.com");
});
test("only confirmed/preparing orders can dispatch; pending, cancelled and refunded stay unchanged", async () => {
  for (const status of [
    "pending",
    "cancelled",
    "refunded",
    "delivered",
    "out_for_delivery",
  ]) {
    const e = engine({ status });
    await assert.rejects(
      e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment),
      /confirmed/,
    );
    assert.equal(e.order.status, status);
    assert.equal(e.notifications.length, 0);
  }
});
test("website/app concurrent dispatch commits once and preserves timestamp on replay", async () => {
  const e = engine();
  const r = await Promise.all([
    e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment),
    e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment),
  ]);
  assert.equal(r.filter((x) => x.changed).length, 1);
  assert.equal(e.notifications.length, 1);
  const at = e.order.shipped_at.getTime();
  await e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment);
  assert.equal(e.order.shipped_at.getTime(), at);
  assert.match(e.queries[0].text, /FOR UPDATE/);
});
test("dispatch permits untracked delivery and uses explicit tracking update for later changes", async () => {
  const e = engine();
  await e.manageOrder("seller@example.com", "ORD-1", "dispatch", {});
  assert.equal(e.order.tracking_number, null);
  await assert.rejects(
    e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment),
    /Update tracking/,
  );
  await e.manageOrder("seller@example.com", "ORD-1", "tracking", shipment);
  assert.equal(e.order.tracking_number, "ABC123");
});
test("tracking edits cannot dispatch, reverse status, or change shipped time", async () => {
  const e = engine({ status: "shipped" }),
    at = e.order.shipped_at.getTime();
  await e.manageOrder("seller@example.com", "ORD-1", "tracking", shipment);
  assert.equal(e.order.status, "shipped");
  assert.equal(e.order.shipped_at.getTime(), at);
  await e.manageOrder("seller@example.com", "ORD-1", "tracking", shipment);
  assert.equal(e.notifications.length, 1);
  await assert.rejects(
    engine().manageOrder("seller@example.com", "ORD-1", "tracking", shipment),
    /Dispatch/,
  );
});
test("carrier/tracking validation rejects oversized and nontext inputs and requires complete updates", async () => {
  const e = engine({ status: "shipped" });
  for (const body of [
    { carrier: "A", trackingNumber: "" },
    { carrier: 5, trackingNumber: "X" },
    { carrier: "A".repeat(81), trackingNumber: "X" },
    { carrier: "A", trackingNumber: "X".repeat(201) },
  ])
    await assert.rejects(
      e.manageOrder("seller@example.com", "ORD-1", "tracking", body),
    );
  assert.equal(e.order.tracking_number, null);
});
test("only buyer can confirm a dispatched item; delivery replay notifies seller once", async () => {
  const e = engine({ status: "shipped" });
  await assert.rejects(
    e.manageOrder("seller@example.com", "ORD-1", "delivered"),
    /not available/,
  );
  await e.manageOrder("buyer@example.com", "ORD-1", "delivered");
  const at = e.order.delivered_at.getTime();
  await e.manageOrder("buyer@example.com", "ORD-1", "delivered");
  assert.equal(e.order.delivered_at.getTime(), at);
  assert.equal(e.notifications.length, 1);
  assert.equal(e.notifications[0][0], "seller@example.com");
});
test("open return/dispute blocks confirmation and the native availability flag", async () => {
  const e = engine({ status: "shipped", blocked: true });
  const order = await e.getManagedOrder("buyer@example.com", "ORD-1");
  assert.equal(order.canConfirmDelivery, false);
  await assert.rejects(
    e.manageOrder("buyer@example.com", "ORD-1", "delivered"),
    /open return or dispute/,
  );
  assert.equal(e.order.status, "shipped");
});
test("unsent/cancelled/refunded orders cannot be marked delivered", async () => {
  for (const status of [
    "confirmed",
    "preparing",
    "pending",
    "cancelled",
    "refunded",
  ])
    await assert.rejects(
      engine({ status }).manageOrder("buyer@example.com", "ORD-1", "delivered"),
      /dispatched/,
    );
});
test("failed write rolls back status and suppresses notifications; invalid actions never write", async () => {
  const e = engine({ failWrite: true });
  await assert.rejects(
    e.manageOrder("seller@example.com", "ORD-1", "dispatch", shipment),
    /DB update/,
  );
  assert.equal(e.order.status, "confirmed");
  assert.equal(e.notifications.length, 0);
  await assert.rejects(
    e.manageOrder("seller@example.com", "ORD-1", "refund"),
    /Invalid order action/,
  );
});
test("native order parser rejects invalid money/dates/permissions and unconfirmed actions", async () => {
  const order = await engine({ status: "shipped" }).getManagedOrder(
    "buyer@example.com",
    "ORD-1",
  );
  for (const extra of [
    { amount: -1 },
    { price: "100" },
    { createdAt: "bad" },
    { trackingNumber: 5 },
    { canPrepare: true },
    { hasOpenCase: true, canConfirmDelivery: true },
  ])
    assert.throws(() => native.parseManagedOrder({ ...order, ...extra }));
  assert.throws(() => native.parseOrderAction({ ok: true }));
  assert.throws(() => native.parseOrderAction({ ok: false, changed: true }));
  assert.equal(native.parseOrderAction({ ok: true, changed: false }), false);
});
test("native management endpoints require verified guard and ignore body identity", async () => {
  for (const method of ["GET", "POST"]) {
    let handler,
      guarded = false,
      args,
      status = 200;
    const guard = () => {},
      router = {
        get: (p, ...h) => {
          if (method === "GET") {
            handler = h.at(-1);
            guarded = h.includes(guard);
          }
        },
        post: (p, ...h) => {
          if (method === "POST") {
            handler = h.at(-1);
            guarded = h.includes(guard);
          }
        },
      };
    load("artifacts/api-server/src/routes/mobileOrderManagement.ts", {
      Router: () => router,
      requireMobileMember: guard,
      OrderActionError: class extends Error {},
      getManagedOrder: async (...x) => {
        args = x;
        return {};
      },
      manageOrder: async (...x) => {
        args = x;
        return { ok: true };
      },
    });
    const res = {
      locals: { mobileAccount: { email: "verified@example.com" } },
      setHeader: () => {},
      status: (n) => {
        status = n;
        return res;
      },
      json: () => {},
    };
    await handler(
      {
        params: { id: "ORD-1", action: "dispatch" },
        body: { email: "attacker" },
      },
      res,
    );
    assert.equal(guarded, true);
    assert.equal(status, 200);
    assert.equal(args[0], "verified@example.com");
  }
});
test("website dispatch uses the same verified shared workflow as Android", async () => {
  let handler,
    guarded = false,
    args;
  const guard = () => {},
    router = {
      get: () => {},
      post: (p, ...h) => {
        if (p === "/orders/:id/dispatch") {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
      patch: () => {},
      delete: () => {},
    };
  load("artifacts/api-server/src/routes/reviews.ts", {
    Router: () => router,
    sql: () => null,
    requireMobileMember: guard,
    requireAdmin: () => {},
    manageOrder: async (...x) => {
      args = x;
      return { ok: true };
    },
    OrderActionError: class extends Error {},
  });
  await handler(
    { params: { id: "ORD-1" }, body: shipment },
    {
      locals: { mobileAccount: { email: "seller@example.com" } },
      json: () => {},
      status: () => ({ json: () => {} }),
    },
  );
  assert.equal(guarded, true);
  assert.deepEqual(args, ["seller@example.com", "ORD-1", "dispatch", shipment]);
});
