const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module"),
  test = require("node:test"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");
const esbuild = createRequire(
  path.join(root, "artifacts/api-server/package.json"),
)("esbuild");
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
const errors = load("artifacts/api-server/src/lib/communityErrors.ts", {
  logger: { error: () => {} },
});
const sql = (s, ...values) => ({
  text: s.join("?").replace(/\s+/g, " ").trim(),
  values,
});
function routerCapture() {
  const handlers = {};
  return {
    handlers,
    Router: () => ({
      get: (p, h) => (handlers["GET " + p] = h),
      post: (p, h) => (handlers["POST " + p] = h),
      delete: (p, h) => (handlers["DELETE " + p] = h),
      use: () => {},
    }),
  };
}
function watcherEngine({
  failCount = false,
  status = "active",
  seller = "seller@example.com",
} = {}) {
  let members = new Set(),
    count = 0,
    tail = Promise.resolve();
  const capture = routerCapture();
  const queries = [];
  async function execute(q) {
    queries.push(q);
    const { text: t, values: v } = q;
    if (t.startsWith("SELECT seller_email,status"))
      return { rows: [{ seller_email: seller, status }] };
    if (t.startsWith("INSERT INTO listing_watchers")) {
      members.add(v[1]);
      return { rows: [] };
    }
    if (t.startsWith("DELETE FROM listing_watchers")) {
      members.delete(v[1]);
      return { rows: [] };
    }
    if (t.startsWith("SELECT COUNT"))
      return { rows: [{ count: members.size }] };
    if (t.startsWith("UPDATE listings")) {
      if (failCount) throw Error("Database unavailable");
      count = v[0];
      return { rows: [] };
    }
    throw Error("Unexpected SQL " + t);
  }
  const db = {
    transaction: async (fn) => {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      const snapshot = [new Set(members), count];
      try {
        return await fn({ execute });
      } catch (e) {
        [members, count] = snapshot;
        throw e;
      } finally {
        release();
      }
    },
  };
  const api = load("artifacts/api-server/src/routes/watchers.ts", {
    ...capture,
    db,
    sql,
    ...errors,
  });
  return {
    ...api,
    queries,
    get members() {
      return members;
    },
    get count() {
      return count;
    },
  };
}
test("saved-item concurrent updates and duplicate saves preserve the exact count", async () => {
  const e = watcherEngine();
  await Promise.all([
    e.setWatched(1, "a", true),
    e.setWatched(1, "b", true),
    e.setWatched(1, "a", true),
  ]);
  assert.equal(e.count, 2);
  await Promise.all([e.setWatched(1, "a", false), e.setWatched(1, "c", true)]);
  assert.equal(e.count, 2);
  assert.deepEqual([...e.members].sort(), ["b", "c"]);
  assert.ok(
    e.queries
      .filter((q) => q.text.startsWith("SELECT seller"))
      .every((q) => q.text.endsWith("FOR UPDATE")),
  );
});
test("failed watcher count update rolls back the saved-item mutation", async () => {
  const e = watcherEngine({ failCount: true });
  await assert.rejects(e.setWatched(1, "buyer", true));
  assert.equal(e.members.size, 0);
  assert.equal(e.count, 0);
});
test("own/inactive listings cannot be newly saved; inactive items can be removed", async () => {
  await assert.rejects(
    watcherEngine({ seller: "buyer" }).setWatched(1, "buyer", true),
    /own listing/,
  );
  const e = watcherEngine({ status: "sold" });
  await assert.rejects(e.setWatched(1, "buyer", true), /no longer available/);
  assert.deepEqual(await e.setWatched(1, "buyer", false), {
    watched: false,
    count: 0,
  });
});
test("malformed, negative and unsafe route IDs fail before querying", () => {
  for (const id of [
    "0",
    "-1",
    "1.5",
    "1e2",
    "NaN",
    "9007199254740992",
    undefined,
    ["1"],
  ])
    assert.throws(
      () => errors.communityId(id),
      (e) => e.status === 400,
    );
  assert.equal(errors.communityId("123"), 123);
});
function messageEngine({ failUpdate = false, participant = true } = {}) {
  let messages = [],
    updated = false;
  const capture = routerCapture();
  async function execute({ text: t, values: v }) {
    if (t.startsWith("SELECT c.*"))
      return { rows: participant ? [{ id: 1 }] : [] };
    if (t.startsWith("INSERT INTO marketplace_messages")) {
      const row = {
        id: messages.length + 1,
        created_at: "2026-10-07T00:00:00Z",
      };
      messages.push({ ...row, text: v[2] });
      return { rows: [row] };
    }
    if (t.startsWith("UPDATE marketplace_conversations")) {
      if (failUpdate) throw Error("Update failed");
      updated = true;
      return { rows: [] };
    }
    throw Error("Unexpected SQL " + t);
  }
  const db = {
    execute,
    transaction: async (fn) => {
      const old = structuredClone([messages, updated]);
      try {
        return await fn({ execute });
      } catch (e) {
        [messages, updated] = old;
        throw e;
      }
    },
  };
  load("artifacts/api-server/src/routes/messages.ts", {
    ...capture,
    db,
    sql,
    ...errors,
    getAuth: () => ({ isAuthenticated: true, userId: "user_1" }),
    clerkClient: {
      users: {
        getUser: async () => ({
          primaryEmailAddress: { emailAddress: "buyer@example.com" },
        }),
      },
    },
  });
  return {
    get messages() {
      return messages;
    },
    get updated() {
      return updated;
    },
    send: async (text) => {
      let status = 200,
        body;
      const res = {
        status: (n) => {
          status = n;
          return res;
        },
        json: (x) => (body = x),
      };
      await capture.handlers["POST /messages/conversations/:id/messages"](
        { params: { id: "1" }, body: { text } },
        res,
      );
      return { status, body };
    },
  };
}
test("message and conversation timestamp commit together", async () => {
  const e = messageEngine();
  const r = await e.send("hello");
  assert.equal(r.status, 201);
  assert.equal(e.messages.length, 1);
  assert.equal(e.updated, true);
});
test("failed conversation update cannot leave a partially saved message", async () => {
  const e = messageEngine({ failUpdate: true });
  await assert.rejects(e.send("hello"));
  assert.equal(e.messages.length, 0);
  assert.equal(e.updated, false);
});
test("nonparticipants and nontext payloads do not create messages", async () => {
  const denied = messageEngine({ participant: false });
  assert.equal((await denied.send("hello")).status, 404);
  assert.equal(denied.messages.length, 0);
  const e = messageEngine();
  for (const input of [{ text: "forged" }, [], 42, "  "])
    assert.equal((await e.send(input)).status, 400);
  assert.equal(e.messages.length, 0);
});
test("unexpected provider/database failures return retryable JSON without leaking details", () => {
  let status, body, cache;
  const res = {
    headersSent: false,
    setHeader: (_k, v) => (cache = v),
    status: (n) => {
      status = n;
      return res;
    },
    json: (x) => (body = x),
  };
  errors.communityErrorHandler(
    Error("secret database address"),
    {},
    res,
    () => {},
  );
  assert.equal(status, 503);
  assert.equal(cache, "no-store");
  assert.ok(!body.error.includes("secret"));
  errors.communityErrorHandler(
    new errors.CommunityError("Not found", 404),
    {},
    res,
    () => {},
  );
  assert.equal(status, 404);
});
