import { createRoot } from "react-dom/client";
import App from "./App";
import { loadCategoryPresentation } from "./data/categories";
import "./index.css";
import "./design-system/protected.css";

// The production frontend is a static Render site, so Vite's dev /api proxy
// does not exist after deployment. Keep all legacy and future relative API
// calls on the real marketplace API without requiring every component to
// duplicate the production hostname.
const runtimeConfig = (window as Window & { __BAZUNK_CONFIG__?: { apiBaseUrl?: string } }).__BAZUNK_CONFIG__;
const API_BASE = (runtimeConfig?.apiBaseUrl || "").replace(/\/$/, "");
if (API_BASE !== "https://bazunk-api-test.apps.bazunk.com") {
  throw new Error("Test storefront API URL is not configured safely");
}
// Test-only isolation: redirect both relative and hard-coded production API fetches.
// Never allow the test storefront to read or mutate live Render API data.
const nativeFetch = window.fetch.bind(window);
const TEST_API = new URL(API_BASE);
const LIVE_API_HOSTS = new Set([
  "bazunk-api.onrender.com",
  "bazunk-platform-core-api.onrender.com",
]);
function testApiUrl(input: string | URL): string | null {
  const raw = String(input);
  const parsed = new URL(raw, window.location.origin);
  if (!parsed.pathname.startsWith("/api/")) return null;
  if (parsed.origin === window.location.origin || LIVE_API_HOSTS.has(parsed.hostname)) {
    return new URL(parsed.pathname + parsed.search + parsed.hash, TEST_API).toString();
  }
  return null;
}
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (input instanceof Request) {
    const rewritten = testApiUrl(input.url);
    return nativeFetch(rewritten ? new Request(rewritten, input) : input, init);
  }
  const rewritten = testApiUrl(input);
  return nativeFetch(rewritten ?? input, init);
}) as typeof window.fetch;

// Clerk production keys are restricted to bazunk.com. Render's default
// hostname is not an authorized authentication origin; preserve the path,
// query and hash while directing visitors to the canonical site.
if (window.location.hostname === "bazunk-web.onrender.com") {
  window.location.replace(`https://bazunk.com${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  // Do not hold the entire storefront behind a potentially sleeping free-tier API.
  // Keep a short window for category presentation settings, then render using
  // the bundled taxonomy if the API is slow or unavailable.
  const categoryController = new AbortController();
  const categoryTimeout = window.setTimeout(() => categoryController.abort(), 1000);
  void loadCategoryPresentation(categoryController.signal).finally(() => {
    window.clearTimeout(categoryTimeout);
    createRoot(document.getElementById("root")!).render(<App />);
  });
}
