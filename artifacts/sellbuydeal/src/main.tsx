import { createRoot } from "react-dom/client";
import App from "./App";
import { loadCategoryPresentation } from "./data/categories";
import "./index.css";
import "./design-system/protected.css";

// The production frontend is a static Render site, so Vite's dev /api proxy
// does not exist after deployment. Keep all legacy and future relative API
// calls on the real marketplace API without requiring every component to
// duplicate the production hostname.
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\/$/, "");
const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    return nativeFetch(`${API_BASE}${input}`, init);
  }
  if (input instanceof Request) {
    const url = new URL(input.url, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      const target = `${API_BASE}${url.pathname}${url.search}${url.hash}`;
      return nativeFetch(new Request(target, input), init);
    }
  }
  return nativeFetch(input, init);
}) as typeof window.fetch;

// Clerk production keys are restricted to bazunk.com. Render's default
// hostname is not an authorized authentication origin; preserve the path,
// query and hash while directing visitors to the canonical site.
if (window.location.hostname === "bazunk-web.onrender.com") {
  window.location.replace(`https://bazunk.com${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  void loadCategoryPresentation().finally(()=>createRoot(document.getElementById("root")!).render(<App />));
}
