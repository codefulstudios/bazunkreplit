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
const rules = load("artifacts/api-server/src/lib/reviewRules.ts"),
  native = load("apps/bazunk-android/src/reviews.ts");
const now = Date.parse("2026-10-06T09:30:00Z");
const review = (extra = {}) => ({
  id: 1,
  order_id: "ORD-1",
  role: "buyer_to_seller",
  reviewer_email: "buyer@example.com",
  reviewee_email: "seller@example.com",
  rating: 4,
  comment: "Good item",
  item_title: "Phone",
  item_as_described: 5,
  dispatch_rating: null,
  packaging_rating: null,
  created_at: new Date(now - 86400000).toISOString(),
  seller_reply: null,
  removed_at: null,
  deleted_by_reviewer_at: null,
  ...extra,
});
function engine({
  initial = [],
  status = "shipped",
  seller = "seller@example.com",
  failWrite = false,
} = {}) {
  let rows = structuredClone(initial),
    reports = [],
    messages = [],
    tail = Promise.resolve(),
    time = now,
    queries = [];
  const order = {
    id: "ORD-1",
    buyer_email: "buyer@example.com",
    seller_email: seller,
    item_title: "Phone",
    status,
  };
  const sql = (s, ...values) => ({
    text: s.join("?").replace(/\s+/g, " ").trim(),
    values,
  });
  const execute = async (q) => {
    queries.push(q);
    const t = q.text,
      v = q.values;
    if (t.startsWith("SELECT clock_timestamp"))
      return { rows: [{ server_now: new Date(time).toISOString() }] };
    if (t.startsWith("SELECT * FROM orders"))
      return { rows: v[0] === order.id ? [structuredClone(order)] : [] };
    if (t.startsWith("SELECT * FROM reviews WHERE order_id"))
      return { rows: structuredClone(rows.filter((r) => r.order_id === v[0])) };
    if (t.startsWith("SELECT * FROM reviews WHERE id"))
      return { rows: structuredClone(rows.filter((r) => r.id === v[0])) };
    if (t.startsWith("INSERT INTO reviews(")) {
      if (failWrite) throw Error("Write failed");
      if (rows.some((r) => r.order_id === v[0] && r.role === v[1]))
        return { rows: [] };
      const r = review({
        id: rows.length + 1,
        order_id: v[0],
        role: v[1],
        reviewer_email: v[2],
        reviewee_email: v[3],
        rating: v[4],
        comment: v[5],
        item_title: v[6],
        item_as_described: v[7],
        dispatch_rating: v[8],
        packaging_rating: v[9],
        created_at: new Date(time).toISOString(),
      });
      rows.push(r);
      return { rows: [{ id: r.id }] };
    }
    if (t.startsWith("UPDATE reviews SET rating")) {
      if (failWrite) throw Error("Write failed");
      const r = rows.find((r) => r.id === v[5]);
      Object.assign(r, {
        rating: v[0],
        comment: v[1],
        item_as_described: v[2],
        dispatch_rating: v[3],
        packaging_rating: v[4],
        edited_at: new Date(time).toISOString(),
      });
      return { rows: [] };
    }
    if (t.startsWith("UPDATE reviews SET deleted_by")) {
      rows.find((r) => r.id === v[0]).deleted_by_reviewer_at = new Date(
        time,
      ).toISOString();
      return { rows: [] };
    }
    if (t.startsWith("UPDATE reviews SET seller_reply")) {
      const r = rows.find((r) => r.id === v[1]);
      r.seller_reply = v[0];
      r.seller_replied_at = new Date(time).toISOString();
      return { rows: [{ seller_replied_at: r.seller_replied_at }] };
    }
    if (t.startsWith("INSERT INTO review_reports")) {
      if (reports.some((r) => r[0] === v[0] && r[1] === v[1]))
        return { rows: [] };
      reports.push(v);
      return { rows: [{ id: reports.length }] };
    }
    throw Error("Unexpected query " + t);
  };
  const db = {
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = structuredClone({ rows, reports });
      try {
        return await fn({ execute });
      } catch (e) {
        ({ rows, reports } = snapshot);
        throw e;
      } finally {
        release();
      }
    },
  };
  const api = load("artifacts/api-server/src/lib/reviewEngine.ts", {
    db,
    sql,
    ...rules,
    sendSystemMessage: async (...args) => messages.push(args),
  });
  return {
    ...api,
    order,
    queries,
    setTime: (x) => (time = x),
    get rows() {
      return rows;
    },
    get reports() {
      return reports;
    },
    get messages() {
      return messages;
    },
  };
}
const input = {
  orderId: "ORD-1",
  rating: 5,
  comment: "Great!",
  itemAsDescribed: 4,
  dispatchRating: 3,
  packagingRating: null,
};
test("ratings reject fractions, NaN and values outside 1–5 rather than rounding", () => {
  for (const rating of [0, 6, 2.5, "NaN", null])
    assert.throws(() =>
      rules.reviewInput({ ...input, rating }, "buyer_to_seller"),
    );
  assert.equal(rules.reviewInput(input, "buyer_to_seller").rating, 5);
});
test("optional aspect scores validate buyer input and are excluded from seller-to-buyer reviews", () => {
  assert.throws(() =>
    rules.reviewInput({ ...input, dispatchRating: 9 }, "buyer_to_seller"),
  );
  assert.equal(
    rules.reviewInput({ ...input, dispatchRating: 9 }, "seller_to_buyer")
      .dispatchRating,
    null,
  );
});
test("review text length and review IDs reject invalid requests", () => {
  assert.throws(() => rules.reviewText("a".repeat(1001)));
  assert.throws(() => rules.reviewText(5));
  assert.throws(() => rules.reviewText(" ", true));
  for (const id of ["a", 0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => rules.reviewId(id));
});
test("only actual transaction participants can view or create reviews", async () => {
  const e = engine();
  await assert.rejects(
    e.orderReviews("attacker@example.com", "ORD-1"),
    /not found/,
  );
  await assert.rejects(
    e.createReview("attacker@example.com", input),
    /not found/,
  );
  assert.equal(e.rows.length, 0);
});
test("identity, counterpart, role and item title come from the order, not body fields", async () => {
  const e = engine();
  await e.createReview("buyer@example.com", {
    ...input,
    email: "attacker",
    role: "seller_to_buyer",
    itemTitle: "Injected",
    reviewee: "attacker",
  });
  assert.equal(e.rows[0].reviewer_email, "buyer@example.com");
  assert.equal(e.rows[0].reviewee_email, "seller@example.com");
  assert.equal(e.rows[0].role, "buyer_to_seller");
  assert.equal(e.rows[0].item_title, "Phone");
  assert.equal(e.messages.length, 1);
});
test("seller can review a buyer without buyer-only aspect scores", async () => {
  const e = engine();
  await e.createReview("seller@example.com", input);
  assert.equal(e.rows[0].role, "seller_to_buyer");
  assert.equal(e.rows[0].item_as_described, null);
});
test("unsent/cancelled orders and self-purchases cannot be reviewed", async () => {
  for (const status of ["confirmed", "cancelled", "pending"]) {
    const e = engine({ status });
    assert.equal(
      (await e.orderReviews("buyer@example.com", "ORD-1")).canCreate,
      false,
    );
    await assert.rejects(e.createReview("buyer@example.com", input), /once/);
  }
  await assert.rejects(
    engine({ seller: "buyer@example.com" }).createReview(
      "buyer@example.com",
      input,
    ),
    /yourself/,
  );
});
test("concurrent submissions save one review and notify once", async () => {
  const e = engine();
  const r = await Promise.allSettled([
    e.createReview("buyer@example.com", input),
    e.createReview("buyer@example.com", input),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(e.rows.length, 1);
  assert.equal(e.messages.length, 1);
  assert.match(e.queries[0].text, /orders.*FOR UPDATE/);
});
test("creation failure rolls back and sends no review message", async () => {
  const e = engine({ failWrite: true });
  await assert.rejects(
    e.createReview("buyer@example.com", input),
    /Write failed/,
  );
  assert.equal(e.rows.length, 0);
  assert.equal(e.messages.length, 0);
});
test("only the author can edit; author edits retain order, role and reply", async () => {
  const e = engine({ initial: [review({ seller_reply: "Thanks" })] });
  await assert.rejects(
    e.editReview("seller@example.com", 1, input),
    /own review/,
  );
  await e.editReview("buyer@example.com", 1, {
    ...input,
    orderId: "ORD-other",
    role: "seller_to_buyer",
  });
  assert.equal(e.rows[0].order_id, "ORD-1");
  assert.equal(e.rows[0].role, "buyer_to_seller");
  assert.equal(e.rows[0].seller_reply, "Thanks");
  assert.equal(e.rows[0].rating, 5);
});
test("editing deadline uses database time and rejects the exact 30-day boundary", async () => {
  const e = engine({
    initial: [
      review({
        created_at: new Date(now - rules.EDIT_WINDOW + 1).toISOString(),
      }),
    ],
  });
  assert.equal(
    (await e.orderReviews("buyer@example.com", "ORD-1")).mine.canEdit,
    true,
  );
  e.setTime(now + 1);
  await assert.rejects(e.editReview("buyer@example.com", 1, input), /window/);
  assert.equal(
    (await e.orderReviews("buyer@example.com", "ORD-1")).mine.canEdit,
    false,
  );
});
test("reviewer removal hides received review and prevents a replacement", async () => {
  const e = engine({ initial: [review()] });
  await assert.rejects(e.removeReview("seller@example.com", 1), /own review/);
  await e.removeReview("buyer@example.com", 1);
  const view = await e.orderReviews("buyer@example.com", "ORD-1");
  assert.equal(view.mine.removed, true);
  assert.equal(view.canCreate, false);
  assert.equal(
    (await e.orderReviews("seller@example.com", "ORD-1")).received,
    null,
  );
  await assert.rejects(e.createReview("buyer@example.com", input), /already/);
});
test("moderated or deleted reviews cannot be edited, replied to or reported", async () => {
  for (const extra of [
    { removed_at: new Date(now).toISOString() },
    { deleted_by_reviewer_at: new Date(now).toISOString() },
  ]) {
    const e = engine({ initial: [review(extra)] });
    for (const fn of [
      () => e.editReview("buyer@example.com", 1, input),
      () => e.replyReview("seller@example.com", 1, { reply: "Hi" }),
      () => e.reportReview("other", 1, { reason: "spam" }),
    ])
      await assert.rejects(fn(), /not found/);
  }
});
test("only the reviewed seller can reply and concurrent replies publish just one", async () => {
  const e = engine({ initial: [review()] });
  await assert.rejects(
    e.replyReview("buyer@example.com", 1, { reply: "Hello" }),
    /seller/,
  );
  const r = await Promise.allSettled([
    e.replyReview("seller@example.com", 1, { reply: "First" }),
    e.replyReview("seller@example.com", 1, { reply: "Second" }),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(e.rows[0].seller_reply, "First");
  await assert.rejects(
    engine({ initial: [review({ role: "seller_to_buyer" })] }).replyReview(
      "seller@example.com",
      1,
      { reply: "No" },
    ),
    /seller/,
  );
});
test("reports validate reason, reject self-report and deduplicate without removing the review", async () => {
  const e = engine({ initial: [review()] });
  await assert.rejects(
    e.reportReview("buyer@example.com", 1, { reason: "spam" }),
    /own/,
  );
  await assert.rejects(
    e.reportReview("other", 1, { reason: "invalid" }),
    /reason/,
  );
  await e.reportReview("other", 1, {
    reason: "personal_information",
    details: "Please check",
  });
  await assert.rejects(
    e.reportReview("other", 1, { reason: "spam" }),
    /already/,
  );
  assert.equal(e.reports.length, 1);
  assert.equal(e.rows[0].removed_at, null);
});
test("member review DTOs omit emails and server permission flags parse correctly", async () => {
  const e = engine({ initial: [review()] });
  const buyer = await e.orderReviews("buyer@example.com", "ORD-1"),
    seller = await e.orderReviews("seller@example.com", "ORD-1");
  assert.equal(JSON.stringify(buyer).includes("@"), false);
  assert.equal(native.parseOrderReviews(buyer).mine.canEdit, true);
  assert.equal(native.parseOrderReviews(seller).received.canReply, true);
});
test("native review parser rejects invalid ratings, malformed replies, timestamps and failed saves", () => {
  const dto = rules.reviewDto(review());
  for (const extra of [
    { rating: 6 },
    { id: -1 },
    { createdAt: "bad" },
    { reply: 5 },
    { itemAsDescribed: 0 },
    { verifiedPurchase: false },
  ])
    assert.throws(() => native.parseReview({ ...dto, ...extra }));
  assert.throws(() => native.parseReviewSaved({ ok: false }));
  assert.throws(() =>
    native.parseOrderReviews({
      orderId: "1",
      title: "A",
      status: "shipped",
      role: "buyer_to_seller",
      canCreate: false,
      mine: null,
      received: { ...dto, canReply: true },
    }),
  );
});
test("native reputation parser rejects inconsistent counts and nonfinite scores", () => {
  const reputation = {
    reviews: { total: 3, positive: 2, neutral: 1, negative: 0, average: 4 },
    positivePercent: 67,
    successfulSales: 4,
    repeatBuyers: 1,
    dispatchMedianHours: null,
    dispatchSampleSize: 2,
    replyMedianHours: null,
    memberSince: null,
    profile: { name: "Seller", username: null, verified: false },
  };
  assert.equal(
    native.parseSellerReviews({ reputation, reviews: [] }).reputation
      .positivePercent,
    67,
  );
  for (const extra of [
    { successfulSales: "4" },
    { positivePercent: 101 },
    { reviews: { ...reputation.reviews, positive: 4 } },
    { dispatchMedianHours: -1 },
  ])
    assert.throws(() =>
      native.parseSellerReviews({
        reputation: { ...reputation, ...extra },
        reviews: [],
      }),
    );
});
function route(method, url) {
  let handler,
    guarded = false,
    status = 200,
    result,
    called;
  const guard = () => {},
    router = {
      get: (p, ...h) => {
        if (method === "GET" && url === p) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
      post: (p, ...h) => {
        if (method === "POST" && url === p) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
      patch: (p, ...h) => {
        if (method === "PATCH" && url === p) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
      delete: (p, ...h) => {
        if (method === "DELETE" && url === p) {
          handler = h.at(-1);
          guarded = h.includes(guard);
        }
      },
    };
  const stub = async (...args) => {
    called = args;
    return { ok: true };
  };
  load("artifacts/api-server/src/routes/reviews.ts", {
    Router: () => router,
    sql: () => null,
    requireMobileMember: guard,
    requireAdmin: () => {},
    logger: { error: () => {} },
    ...rules,
    orderReviews: stub,
    createReview: stub,
    editReview: stub,
    removeReview: stub,
    replyReview: stub,
    reportReview: stub,
  });
  return async () => {
    const res = {
      locals: { mobileAccount: { email: "verified@example.com" } },
      setHeader: () => {},
      status: (n) => {
        status = n;
        return res;
      },
      json: (x) => (result = x),
    };
    await handler(
      {
        params: { id: "1" },
        body: { email: "attacker@example.com", rating: 5 },
      },
      res,
    );
    return { guarded, called, status, result };
  };
}
test("all shared website/native review mutations and order access use verified account guard", async () => {
  for (const [method, url] of [
    ["GET", "/reviews/mobile/order/:id"],
    ["POST", "/reviews"],
    ["PATCH", "/reviews/:id"],
    ["DELETE", "/reviews/:id/mine"],
    ["POST", "/reviews/:id/reply"],
    ["POST", "/reviews/:id/report"],
  ]) {
    const r = await route(method, url)();
    assert.equal(r.guarded, true);
    assert.equal(r.called[0], "verified@example.com");
  }
});
async function publicRoute({ status = "active", offset = "0" } = {}) {
  let handler,
    response,
    code = 200,
    queries = [];
  const sql = (s, ...values) => ({
      text: s.join("?").replace(/\s+/g, " ").trim(),
      values,
    }),
    router = {
      get: (p, ...h) => {
        if (p === "/reviews/mobile/listing/:id") handler = h.at(-1);
      },
      post: () => {},
      patch: () => {},
      delete: () => {},
    };
  const db = {
    execute: async (q) => {
      queries.push(q);
      if (q.text.startsWith("SELECT seller_email"))
        return {
          rows: ["active", "sold"].includes(status)
            ? [{ seller_email: "seller@example.com" }]
            : [],
        };
      if (q.text.startsWith("SELECT * FROM reviews"))
        return { rows: [review()] };
      if (q.text.startsWith("SELECT u.name"))
        return {
          rows: [
            {
              name: "Seller",
              username: "seller123",
              verification_status: "verified",
            },
          ],
        };
      if (q.text.includes("AS total"))
        return {
          rows: [
            { total: 3, positive: 2, neutral: 1, negative: 0, average: 4 },
          ],
        };
      return { rows: [{ n: 3, median_hours: 8 }] };
    },
  };
  load("artifacts/api-server/src/routes/reviews.ts", {
    Router: () => router,
    db,
    sql,
    requireMobileMember: () => {},
    requireAdmin: () => {},
    logger: { error: () => {} },
    ...rules,
  });
  const res = {
    setHeader: () => {},
    status: (n) => {
      code = n;
      return res;
    },
    json: (x) => (response = x),
  };
  await handler({ params: { id: "1" }, query: { offset } }, res);
  return { code, response, queries };
}
test("public listing-based profile masks identities, pages ten reviews and excludes hidden records", async () => {
  const r = await publicRoute();
  assert.equal(r.code, 200);
  assert.equal(JSON.stringify(r.response).includes("@"), false);
  assert.equal(
    native.parseSellerReviews(r.response).reputation.profile.verified,
    true,
  );
  assert.match(
    r.queries.find((q) => q.text.startsWith("SELECT * FROM reviews")).text,
    /removed_at IS NULL AND deleted_by_reviewer_at IS NULL.*LIMIT 10/,
  );
  assert.equal((await publicRoute({ status: "draft" })).code, 404);
  assert.equal((await publicRoute({ offset: "1.5" })).code, 400);
});
test("admin reviews switch blocks native public and member review paths", async () => {
  const gate = load("artifacts/api-server/src/middlewares/featureGate.ts", {
    featureEnabled: async (name) => {
      assert.equal(name, "reviews");
      return false;
    },
  });
  for (const pathname of [
    "/reviews/mobile/listing/1",
    "/reviews/mobile/order/ORD-1",
    "/reviews/1/reply",
  ]) {
    let status,
      called = false;
    await gate.featureGate(
      { path: pathname },
      {
        status: (n) => {
          status = n;
          return { json: () => {} };
        },
      },
      () => (called = true),
    );
    assert.equal(status, 503);
    assert.equal(called, false);
  }
});
test("legacy website zero optional scores mean unrated, and authors can remove moderated reviews", async () => {
  const e = engine({
    initial: [review({ removed_at: new Date(now).toISOString() })],
  });
  assert.equal(
    rules.reviewInput({ ...input, dispatchRating: 0 }, "buyer_to_seller")
      .dispatchRating,
    null,
  );
  assert.equal(
    native.parseOrderReviews(await e.orderReviews("buyer@example.com", "ORD-1"))
      .mine.canDelete,
    true,
  );
  await e.removeReview("buyer@example.com", 1);
  assert.ok(e.rows[0].deleted_by_reviewer_at);
});
