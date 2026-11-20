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
const { legalDocuments } = load(
    "artifacts/api-server/src/lib/legalDocuments.ts",
  ),
  client = load("apps/bazunk-android/src/legal.ts");
function route() {
  let handler;
  load("artifacts/api-server/src/routes/legal.ts", {
    Router: () => ({
      get: (p, ...h) => {
        assert.equal(p, "/legal/:kind/:region");
        assert.equal(h.length, 1);
        handler = h[0];
      },
    }),
    legalDocuments,
  });
  return (kind, region) => {
    let status = 200,
      body,
      cache;
    const res = {
      setHeader: (k, v) => (cache = v),
      status: (n) => {
        status = n;
        return res;
      },
      json: (d) => (body = d),
    };
    handler({ params: { kind, region } }, res);
    return { status, body, cache };
  };
}
test("all six public documents validate without account context and include complete shared/regional content", () => {
  const get = route();
  for (const kind of ["terms", "privacy"])
    for (const region of ["uk", "eu", "usa"]) {
      const r = get(kind, region);
      assert.equal(r.status, 200);
      assert.equal(r.cache, "no-store");
      const doc = client.parseLegalDocument(r.body, kind, region);
      assert.deepEqual(doc.sharedSections, legalDocuments[kind].sections);
      assert.deepEqual(
        doc.regionalSections.map((s) => [s.title, s.body]),
        legalDocuments[kind].regions[region].sections,
      );
      assert.equal(doc.summary, legalDocuments[kind].summary);
    }
});
test("unsupported document and region paths return 404 instead of default legal content", () => {
  const get = route();
  for (const [kind, region] of [
    ["terms", "unknown"],
    ["privacy", "UK"],
    ["__proto__", "uk"],
    ["other", "usa"],
  ]) {
    const r = get(kind, region);
    assert.equal(r.status, 404);
    assert.equal("sharedSections" in r.body, false);
  }
});
test("wrong document or region responses are rejected, preventing stale selection content", () => {
  const d = route()("terms", "uk").body;
  assert.throws(() => client.parseLegalDocument(d, "terms", "eu"));
  assert.throws(() => client.parseLegalDocument(d, "privacy", "uk"));
});
test("incomplete/malformed/oversized policies cannot appear as complete content", () => {
  const d = route()("privacy", "usa").body;
  for (const bad of [
    null,
    {},
    { ...d, updatedAt: "bad" },
    { ...d, sharedSections: [] },
    { ...d, regionalSections: [{ title: "Title", body: null }] },
    { ...d, sharedSections: [{ title: "Title", body: "x".repeat(20001) }] },
    { ...d, summary: "" },
  ])
    assert.throws(() => client.parseLegalDocument(bad, "privacy", "usa"));
});
test("search matches title/body case-insensitively and clearing restores all sections", () => {
  const sections = [
    { title: "Account", body: "Sign-in details" },
    { title: "Credits", body: "Payment restrictions" },
  ];
  assert.deepEqual(client.searchLegalSections(sections, "PAYMENT"), [
    sections[1],
  ]);
  assert.deepEqual(client.searchLegalSections(sections, "  account "), [
    sections[0],
  ]);
  assert.deepEqual(client.searchLegalSections(sections, "missing"), []);
  assert.equal(client.searchLegalSections(sections, " "), sections);
});
test("website pages consume the canonical source for body, region, summary and date", () => {
  for (const name of ["Terms", "Privacy"]) {
    const page = fs.readFileSync(
      path.join(root, `artifacts/sellbuydeal/src/pages/${name}Page.tsx`),
      "utf8",
    );
    assert.match(page, /legalDocuments/);
    assert.match(page, /SECTIONS = DOCUMENT.sections/);
    assert.match(page, /REGIONS = DOCUMENT.regions/);
    assert.match(page, /\{DOCUMENT.summary\}/);
    assert.match(page, /\{DOCUMENT.updatedLabel\}/);
    assert.equal(page.includes("const SECTIONS = ["), false);
  }
});
