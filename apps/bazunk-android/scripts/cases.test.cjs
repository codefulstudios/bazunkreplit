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
const rules = load("artifacts/api-server/src/lib/caseRules.ts"),
  native = load("apps/bazunk-android/src/cases.ts");
const buyer = "buyer@example.com",
  seller = "seller@example.com",
  at = "2026-10-06T10:00:00.000Z";
const body = {
  orderId: "O1",
  reason: "damaged",
  condition: "damaged",
  description: "Arrived broken",
};
function engine({
  status = "shipped",
  inWindow = true,
  failMessage = false,
  seed = [],
  messages = [],
} = {}) {
  let cases = structuredClone(seed),
    msgs = structuredClone(messages),
    tail = Promise.resolve(),
    seq = 0;
  const queries = [];
  const order = {
    id: "O1",
    buyer_email: buyer,
    seller_email: seller,
    item_title: "Camera",
    status,
    in_window: inWindow,
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
  const table = (t) => (/\breturns\b/.test(t) ? "return" : "dispute");
  const closed = (c) =>
    c.kind === "return"
      ? ["declined", "refund_issued", "closed"].includes(c.status)
      : rules.CLOSED_DISPUTES.includes(c.status);
  async function execute(q) {
    queries.push(q);
    const t = q.text,
      v = q.values;
    let rows = [];
    if (t.startsWith("SELECT *,created_at"))
      rows = v[0] === order.id ? [structuredClone(order)] : [];
    else if (t.startsWith("SELECT c.*")) {
      const all = cases.filter(
        (c) => c.kind === table(t) && c.order_id === order.id,
      );
      rows = (
        t.includes("WHERE c.id=")
          ? all.filter((c) => c.id === v[0])
          : all.filter(() => [buyer, seller].includes(v[0])).slice(v.at(-1))
      ).map((c) => ({
        ...structuredClone(c),
        order_buyer_email: buyer,
        order_seller_email: seller,
      }));
    } else if (t.startsWith("SELECT * FROM"))
      rows = cases
        .filter((c) => c.kind === table(t) && c.order_id === v[0])
        .slice(-1);
    else if (t.startsWith("SELECT EXISTS"))
      rows = [
        { blocked: cases.some((c) => c.order_id === v[0] && !closed(c)) },
      ];
    else if (t.startsWith("SELECT o.id")) rows = [];
    else if (
      t.startsWith("INSERT INTO returns") ||
      t.startsWith("INSERT INTO disputes")
    ) {
      const kind = table(t);
      cases.push({
        id: v[0],
        order_id: v[1],
        buyer_email: v[2],
        seller_email: v[3],
        item_title: v[4],
        reason: v[5],
        condition: kind === "return" ? v[6] : null,
        description: v[kind === "return" ? 7 : 6],
        kind,
        status: kind === "return" ? "requested" : "open",
        created_at: at,
        updated_at: at,
      });
    } else if (t.startsWith("INSERT INTO dispute_messages")) {
      if (failMessage) throw Error("message write failed");
      const explicit = t.includes("client_ref");
      msgs.push({
        id: v[0],
        dispute_id: v[1],
        author_email: v[2],
        author_role: explicit ? v[3] : "buyer",
        body: explicit ? v[4] : v[3],
        evidence_url: explicit ? v[5] : null,
        client_ref: explicit ? v[6] : null,
        created_at: at,
      });
    } else if (t.startsWith("SELECT body,evidence_url"))
      rows = msgs.filter(
        (m) =>
          m.dispute_id === v[0] &&
          m.author_email === v[1] &&
          m.client_ref === v[2],
      );
    else if (t.startsWith("SELECT id,author_role"))
      rows = msgs
        .filter((m) => m.dispute_id === v[0])
        .slice()
        .reverse()
        .slice(v[1], v[1] + 50);
    else if (t.startsWith("UPDATE disputes SET seller_response")) {
      const c = cases.find((c) => c.id === v.at(-1));
      if (v[0]) c.seller_response = v[1];
      if (c.status === "awaiting_" + v[2]) c.status = "under_review";
    } else if (
      t.startsWith("UPDATE returns") ||
      t.startsWith("UPDATE disputes")
    ) {
      const c = cases.find((c) => c.id === v[3]);
      c.status = v[0];
      c.return_tracking = v[1];
      c.return_carrier = v[2];
    } else throw Error("Unexpected SQL: " + t);
    return { rows: structuredClone(rows) };
  }
  const db = {
    execute,
    transaction: async (fn) => {
      const prev = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await prev;
      const snapshot = structuredClone([cases, msgs]);
      try {
        return await fn({ execute });
      } catch (e) {
        [cases, msgs] = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  return {
    ...load("artifacts/api-server/src/lib/caseEngine.ts", {
      db,
      sql,
      randomUUID: () => `ID${++seq}`,
      ensureCaseSchema: async () => {},
      ...rules,
    }),
    queries,
    get cases() {
      return cases;
    },
    get messages() {
      return msgs;
    },
  };
}
function seed(kind = "dispute", status = "open", extra = {}) {
  return {
    id: "C1",
    order_id: "O1",
    buyer_email: buyer,
    seller_email: seller,
    item_title: "Camera",
    reason: "damaged",
    condition: "damaged",
    description: "Arrived broken",
    kind,
    status,
    created_at: at,
    updated_at: at,
    ...extra,
  };
}
test("verified order participants override historical case emails; outsiders and orphan cases are denied", async () => {
  const e = engine({
    seed: [seed("dispute", "open", { buyer_email: "attacker" })],
  });
  await assert.rejects(e.getCase("dispute", "attacker", "C1"), /not found/);
  assert.equal((await e.getCase("dispute", buyer, "C1")).role, "buyer");
  await assert.rejects(
    engine({
      seed: [seed("dispute", "open", { order_id: "missing" })],
    }).getCase("dispute", buyer, "C1"),
    /not found/,
  );
});
test("case DTO omits identities and unsafe historic links; explicit return instructions are visible", async () => {
  const e = engine({
    seed: [
      seed("return", "approved", {
        admin_email: "private",
        admin_notes: "Use the supplied address",
        return_label_url: "javascript:alert(1)",
      }),
    ],
  });
  const dto = await e.getCase("return", buyer, "C1");
  assert.equal(dto.returnInstructions, "Use the supplied address");
  assert.equal(dto.labelUrl, null);
  assert.equal(JSON.stringify(dto).includes("@"), false);
  assert.equal("admin_email" in dto, false);
  assert.equal(native.parseCase(dto).canShip, true);
});
test("list uses actual order owners and validated bounded paging", async () => {
  const e = engine({ seed: [seed()] });
  assert.equal((await e.listCases("dispute", buyer)).length, 1);
  assert.equal((await e.listCases("dispute", "other")).length, 0);
  await assert.rejects(e.listCases("dispute", buyer, -1), /Invalid page/);
  assert.match(e.queries[0].text, /LIMIT 25 OFFSET/);
});
test("creation ignores forged participant/title fields and locks the order", async () => {
  const e = engine();
  const { id } = await e.createCase("return", buyer, {
    ...body,
    buyerEmail: "fake",
    sellerEmail: "fake",
    itemTitle: "fake",
  });
  assert.equal(e.cases[0].buyer_email, buyer);
  assert.equal(e.cases[0].seller_email, seller);
  assert.equal(e.cases[0].item_title, "Camera");
  assert.equal(id, e.cases[0].id);
  assert.match(e.queries[0].text, /FOR UPDATE/);
  await assert.rejects(
    engine().createCase("return", seller, body),
    /not found/,
  );
});
test("concurrent exact retries create one case and return the same ID", async () => {
  const e = engine();
  const values = await Promise.all([
    e.createCase("dispute", buyer, body),
    e.createCase("dispute", buyer, body),
  ]);
  assert.equal(values[0].id, values[1].id);
  assert.equal(e.cases.length, 1);
  assert.equal(e.messages.length, 1);
});
test("concurrent return/dispute requests for one order cannot both open", async () => {
  const e = engine();
  const results = await Promise.allSettled([
    e.createCase("return", buyer, body),
    e.createCase("dispute", buyer, body),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(e.cases.length, 1);
});
test("changed repeat content cannot create a second return; resolved dispute does not silently reopen", async () => {
  await assert.rejects(
    engine({ seed: [seed("return", "closed")] }).createCase("return", buyer, {
      ...body,
      description: "Different",
    }),
    /already exists/,
  );
  await assert.rejects(
    engine({ seed: [seed("dispute", "resolved_refund")] }).createCase(
      "dispute",
      buyer,
      { ...body, description: "Different" },
    ),
    /already exists/,
  );
});
test("pending/cancelled/refunded orders and expired dispute windows are ineligible", async () => {
  for (const status of ["pending", "cancelled", "refunded"]) {
    await assert.rejects(engine({ status }).createCase("return", buyer, body));
    await assert.rejects(engine({ status }).createCase("dispute", buyer, body));
  }
  await assert.rejects(
    engine({ inWindow: false }).createCase("dispute", buyer, body),
    /window/,
  );
});
test("invalid reason/condition/oversized description fail before creation", async () => {
  for (const changed of [
    { reason: "invented" },
    { condition: "invented" },
    { description: "x".repeat(4001) },
    { orderId: 4 },
  ]) {
    const e = engine();
    await assert.rejects(
      e.createCase("return", buyer, { ...body, ...changed }),
    );
    assert.equal(e.cases.length, 0);
  }
});
test("first message failure rolls back dispute creation", async () => {
  const e = engine({ failMessage: true });
  await assert.rejects(e.createCase("dispute", buyer, body), /write failed/);
  assert.equal(e.cases.length, 0);
  assert.equal(e.messages.length, 0);
});
test("thread reads reject outsiders and remove unsafe evidence URLs and author emails", async () => {
  const e = engine({
    seed: [seed()],
    messages: [
      {
        id: "M1",
        dispute_id: "C1",
        author_email: buyer,
        author_role: "buyer",
        body: "x",
        evidence_url: "http://unsafe",
        created_at: at,
      },
    ],
  });
  await assert.rejects(e.caseThread("other", "C1"), /not found/);
  const m = (await e.caseThread(seller, "C1"))[0];
  assert.equal(m.evidenceUrl, null);
  assert.equal("author_email" in m, false);
  assert.equal(native.parseThread([m]).length, 1);
});
test("same message request ID retries once, while changed content is rejected", async () => {
  const e = engine({ seed: [seed()] });
  const msg = {
    message: "Photo attached",
    evidenceUrl: "https://example.com/proof",
    requestId: "r1",
  };
  await Promise.all([
    e.sendCaseMessage(buyer, "C1", msg),
    e.sendCaseMessage(buyer, "C1", msg),
  ]);
  assert.equal(e.messages.length, 1);
  await assert.rejects(
    e.sendCaseMessage(buyer, "C1", { ...msg, message: "Changed" }),
    /reference already used/,
  );
});
test("closed case rejects new messages but confirms a previously committed retry", async () => {
  const e = engine({
    seed: [seed("dispute", "closed")],
    messages: [
      {
        dispute_id: "C1",
        author_email: buyer,
        client_ref: "r1",
        body: "Done",
        evidence_url: null,
      },
    ],
  });
  assert.deepEqual(
    await e.sendCaseMessage(buyer, "C1", { message: "Done", requestId: "r1" }),
    { ok: true },
  );
  await assert.rejects(
    e.sendCaseMessage(buyer, "C1", { message: "New", requestId: "r2" }),
    /closed/,
  );
});
test("only the awaited participant advances the case; seller-response route requires seller", async () => {
  const e = engine({ seed: [seed("dispute", "awaiting_seller")] });
  await e.sendCaseMessage(buyer, "C1", {
    message: "Buyer note",
    requestId: "b",
  });
  assert.equal(e.cases[0].status, "awaiting_seller");
  await assert.rejects(
    e.sendCaseMessage(buyer, "C1", { response: "spoof" }, true),
    /seller/,
  );
  await e.sendCaseMessage(
    seller,
    "C1",
    { response: "Seller note", requestId: "s" },
    true,
  );
  assert.equal(e.cases[0].status, "under_review");
  assert.equal(e.cases[0].seller_response, "Seller note");
});
test("evidence validation blocks non-HTTPS, credentials and oversized URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:secret@example.com",
    "x".repeat(2049),
  ])
    assert.throws(() => rules.evidenceUrl(url));
  assert.equal(rules.evidenceUrl(""), null);
});
test("only buyer can ship an approved return; exact replay preserves one update", async () => {
  const e = engine({ seed: [seed("return", "approved")] });
  const payload = { tracking: "TRACK", carrier: "Carrier" };
  await assert.rejects(e.shipCase("return", seller, "C1", payload), /buyer/);
  await e.shipCase("return", buyer, "C1", payload);
  await e.shipCase("return", buyer, "C1", payload);
  assert.equal(e.cases[0].status, "return_shipped");
  assert.equal(e.queries.filter((q) => q.text.startsWith("UPDATE")).length, 1);
  await assert.rejects(
    e.shipCase("return", buyer, "C1", { ...payload, tracking: "different" }),
    /approved/,
  );
});
test("unapproved/closed return or missing tracking cannot change state", async () => {
  for (const status of ["requested", "declined", "closed"])
    await assert.rejects(
      engine({ seed: [seed("return", status)] }).shipCase(
        "return",
        buyer,
        "C1",
        { tracking: "T" },
      ),
      /approved/,
    );
  await assert.rejects(
    engine({ seed: [seed("return", "approved")] }).shipCase(
      "return",
      buyer,
      "C1",
      { tracking: "" },
    ),
  );
});
test("dispute shipment requires approval flag and rolls back when timeline write fails", async () => {
  await assert.rejects(
    engine({ seed: [seed("dispute", "return_required")] }).shipCase(
      "dispute",
      buyer,
      "C1",
      { tracking: "T" },
    ),
    /approved/,
  );
  const e = engine({
    seed: [seed("dispute", "return_required", { return_required: true })],
    failMessage: true,
  });
  await assert.rejects(
    e.shipCase("dispute", buyer, "C1", { tracking: "T" }),
    /write failed/,
  );
  assert.equal(e.cases[0].status, "return_required");
  assert.equal(e.messages.length, 0);
});
test("eligible order search is server-owned, paged and uses configured status/time rules", async () => {
  const e = engine();
  await e.eligibleCases("dispute", buyer, 25, "O1");
  const q = e.queries[0];
  assert.match(q.text, /LOWER\(o.buyer_email\)/);
  assert.match(q.text, /30 days/);
  assert.match(q.text, /NOT EXISTS/);
  assert.equal(q.values.at(-1), 25);
  assert.equal(q.values.includes(buyer), true);
});
test("web/native validators agree; malformed responses never look like success", async () => {
  assert.equal(
    fs.readFileSync(
      path.join(root, "apps/bazunk-android/src/cases.ts"),
      "utf8",
    ),
    fs.readFileSync(
      path.join(root, "artifacts/sellbuydeal/src/lib/memberCases.ts"),
      "utf8",
    ),
  );
  for (const raw of [null, {}, { error: "failed" }, Array(26).fill({})])
    assert.throws(() => native.parseCases(raw));
  assert.throws(() => native.caseCreated({ ok: true }));
  assert.throws(() => native.caseSaved({ ok: false }));
  assert.throws(() =>
    native.parseEligible([
      { id: "1", title: "x", createdAt: "bad", daysLeft: 3 },
    ]),
  );
  assert.throws(() =>
    native.parseThread([
      {
        id: "1",
        body: "x",
        role: "intruder",
        createdAt: at,
        evidenceUrl: null,
      },
    ]),
  );
});
test("every member case route is behind verified guard and ignores supplied identity", async () => {
  for (const kind of ["return", "dispute"]) {
    const handlers = [],
      middleware = [],
      guard = () => {},
      calls = [];
    const router = { use: (...h) => middleware.push(...h) };
    for (const method of ["get", "post", "patch"])
      router[method] = (path, ...h) =>
        handlers.push({ method, path, fn: h.at(-1) });
    const deps = {
      Router: () => router,
      requireMobileMember: guard,
      CaseError: rules.CaseError,
    };
    for (const name of [
      "listCases",
      "getCase",
      "eligibleCases",
      "createCase",
      "caseThread",
      "sendCaseMessage",
      "shipCase",
    ])
      deps[name] = async (...args) => {
        calls.push({ name, args });
        return { ok: true };
      };
    load("artifacts/api-server/src/routes/memberCases.ts", deps).memberCases(
      kind,
    );
    assert.equal(middleware.includes(guard), true);
    for (const h of handlers) {
      const res = {
        locals: { mobileAccount: { email: buyer } },
        status: () => res,
        json: () => {},
      };
      await h.fn(
        {
          params: { id: "C1" },
          query: { email: "fake" },
          body: { email: "fake" },
        },
        res,
      );
      const last = calls.at(-1);
      assert.equal(last.args.includes(buyer), true);
      assert.equal(last.args.includes("fake"), false);
    }
  }
});
test("legacy order reads require verified account and ignore email query; status uses checked workflow", async () => {
  const routes = [],
    guard = () => {},
    queries = [],
    actions = [];
  const router = {};
  for (const method of ["get", "post", "patch"])
    router[method] = (path, ...handlers) =>
      routes.push({ method, path, handlers });
  load("artifacts/api-server/src/routes/orders.ts", {
    Router: () => router,
    requireMobileMember: guard,
    requireAdmin: () => {},
    db: {
      execute: async (q) => {
        queries.push(q);
        return { rows: [] };
      },
    },
    sql: (s, ...values) => ({ text: s.join("?"), values }),
    manageOrder: async (...args) => {
      actions.push(args);
      return { ok: true };
    },
    OrderActionError: class extends Error {},
  });
  for (const path of ["/orders", "/orders/:id", "/orders/:id/status"]) {
    const route = routes.find((r) => r.path === path && r.method !== "post");
    assert.equal(route.handlers.includes(guard), true);
    let status = 200;
    const res = {
      locals: { mobileAccount: { email: buyer } },
      setHeader: () => {},
      status: (n) => {
        status = n;
        return res;
      },
      json: () => {},
    };
    await route.handlers.at(-1)(
      {
        query: { email: "spoof" },
        params: { id: "O1" },
        body: { status: "delivered", buyerEmail: "spoof" },
      },
      res,
    );
    if (path.endsWith("status"))
      assert.deepEqual(actions[0], [
        buyer,
        "O1",
        "delivered",
        { status: "delivered", buyerEmail: "spoof" },
      ]);
    else {
      assert.equal(queries.at(-1).values.includes(buyer), true);
      assert.equal(queries.at(-1).values.includes("spoof"), false);
    }
  }
});
test("member failures return retryable JSON and non-success status", async () => {
  let handler;
  const router = {
    use: () => {},
    get: (p, fn) => {
      if (p === "/") handler = fn;
    },
    post: () => {},
    patch: () => {},
  };
  load("artifacts/api-server/src/routes/memberCases.ts", {
    Router: () => router,
    requireMobileMember: () => {},
    CaseError: rules.CaseError,
    listCases: async () => {
      throw Error("DB secret");
    },
  }).memberCases("return");
  let status, body;
  const res = {
    locals: { mobileAccount: { email: buyer } },
    status: (n) => {
      status = n;
      return res;
    },
    json: (x) => (body = x),
  };
  await handler({ query: {} }, res);
  assert.equal(status, 500);
  assert.match(body.error, /retry/);
  assert.equal(body.error.includes("secret"), false);
});
