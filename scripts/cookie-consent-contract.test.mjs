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
const css = read(src + "index.css");

test("homepage and other routes share persistent, user-controlled cookie preferences", () => {
  assert.match(app, /<CookieConsentProvider>/);
  assert.match(app, /<CookieConsentBanner \/>/);
  assert.match(app, /<Route path="\/cookies" component=\{CookiePolicyPage\}/);
  assert.match(footer, /href="https:\/\/bazunk\.com\/cookies" target="_blank" rel="noopener noreferrer"/);
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


test("cookie policy opens in a new tab without dismissing unsaved preferences", () => {
  assert.match(consent, /href="https:\/\/bazunk\.com\/cookies" target="_blank" rel="noopener noreferrer"/);
  assert.match(consent, /Read our Cookie Policy/);
  assert.match(consent, /bazunk-cookie-description/);
  assert.match(page, /bz-cookie-policy/);
  assert.match(page, /max-w-3xl/);
  assert.match(page, /Back to home/);
  assert.doesNotMatch(page, /\bdark:(?:text|bg)-/);
});

test("cookie policy and controls use deliberate light backgrounds and dark text in dark mode", () => {
  assert.match(consent, /bz-cookie-dialog/);
  assert.match(consent, /bz-cookie-banner/);
  assert.match(consent, /bz-cookie-essential-badge/);
  assert.match(consent, /bz-cookie-actions sticky bottom-0/);
  assert.match(css, /\.dark \.bz-cookie-policy main/);
  assert.match(css, /\.dark \.bazunk-cookie-consent\.bz-cookie-dialog/);
  assert.match(css, /\.bz-cookie-policy main \.bz-policy-surface/);
  assert.match(css, /background-color: #ffffff !important;/);
  assert.match(css, /color: #111827 !important;/);
  assert.match(css, /background-color: #d1fae5 !important;/);
  assert.match(css, /color: #064e3b !important;/);
  assert.match(css, /color-scheme: light;/);
  assert.match(css, /\.bazunk-cookie-consent \.bz-cookie-description,/);
  assert.match(css, /\.bz-cookie-policy main :is\(p,dd\)/);
});

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(x => Number.parseInt(x, 16) / 255);
  const linear = channels.map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrastRatio(textColor, backgroundColor) {
  const values = [relativeLuminance(textColor), relativeLuminance(backgroundColor)].sort((a,b) => b-a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test("cookie foregrounds meet WCAG AA 4.5:1 even on bright surfaces", () => {
  for (const [label, fg, bg] of [
    ["page headings", "#111827", "#ffffff"],
    ["body on white", "#334155", "#ffffff"],
    ["body on pale panels", "#334155", "#f8fafc"],
    ["notice body on orange", "#334155", "#fff7ed"],
    ["Always on badge", "#064e3b", "#d1fae5"],
    ["consent links", "#9a3412", "#ffffff"],
    ["accept button", "#111827", "#f97316"],
    ["manage cookies button", "#ffffff", "#9a3412"],
  ]) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, label + " contrast ratio: " + contrastRatio(fg,bg).toFixed(2));
  }
});
