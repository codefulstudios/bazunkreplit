import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const src = "artifacts/sellbuydeal/src/";
const app = read(src + "App.tsx");
const consent = read(src + "components/CookieConsent.tsx");
const ads = read(src + "components/AdSlot.tsx");
const chat = read(src + "components/ChatwootWidget.tsx");
const page = read(src + "pages/CookiePolicyPage.tsx");
const footer = read(src + "components/Footer.tsx");
const html = read("artifacts/sellbuydeal/index.html");

test("homepage and other routes share persistent, user-controlled cookie preferences", () => {
  assert.match(app, /<CookieConsentProvider>/);
  assert.match(app, /<CookieConsentBanner \/>/);
  assert.match(app, /<Route path="\/cookies" component=\{CookiePolicyPage\}/);
  assert.match(footer, /href="\/cookies"/);
  assert.match(footer, /onClick=\{openCookieSettings\}/);
  assert.match(consent, /bazunk_cookie_preferences_v1/);
  assert.match(consent, /Reject optional/);
  assert.match(consent, /Accept all/);
  assert.match(consent, /Save choices/);
  assert.match(consent, /Global Privacy Control/);
});

test("Google and administrator advertising scripts require marketing consent", () => {
  assert.doesNotMatch(html, /<script[^>]+googlesyndication/i);
  assert.match(consent, /if \(!choices\.marketing/);
  assert.match(ads, /type === "custom" \|\| type === "adsense"/);
  assert.match(ads, /!choices\.marketing/);
});

test("optional Chatwoot script waits for functional permission", () => {
  assert.match(chat, /loaded && choices\.functional/);
  assert.match(chat, /openCookieSettings\(\)/);
  assert.match(page, /Chatwoot/);
  assert.match(page, /Stripe/);
  assert.match(page, /Google AdSense/);
});
