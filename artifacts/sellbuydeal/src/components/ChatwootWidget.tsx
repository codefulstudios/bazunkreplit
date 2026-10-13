import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useCurrency } from "@/context/CurrencyContext";
import { useRawSettings, useSettingsLoaded } from "@/context/SiteSettingsContext";
import { useFeature } from "@/components/FeatureGate";

declare global {
  interface Window {
    chatwootSettings?: { position: string; type: string; launcherTitle: string };
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
    $chatwoot?: {
      setUser?: (identifier: string, details: { name: string; email: string; identifier_hash: string }) => void;
      reset?: () => void;
      toggle: (state?: "open" | "close") => void;
      setCustomAttributes?: (attributes: Record<string, string>) => void;
      setLabel?: (label: string) => void;
    };
  }
}
const BASE_URL = "https://app.chatwoot.com";
const WEBSITE_TOKEN = "gu46ahHNS8MPiQ4zJwK7PjnU";
const SCRIPT_ID = "bazunk-chatwoot-sdk";
const STYLE_ID = "bazunk-chatwoot-brand-style";

function pageGroup(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/browse") || path.startsWith("/search") || path.startsWith("/categories")) return "browse";
  if (path.startsWith("/listing/")) return "listing";
  if (path.startsWith("/checkout")) return "checkout";
  if (path.startsWith("/dashboard") || path.startsWith("/my-store")) return "dashboard";
  if (path.startsWith("/support")) return "support";
  return "other";
}

export function openChatwootSupport() {
  if (document.documentElement.classList.contains("bazunk-chatwoot-disabled")) return;
  if (window.$chatwoot) window.$chatwoot.toggle("open");
  else window.addEventListener("chatwoot:ready", () => {
    if (!document.documentElement.classList.contains("bazunk-chatwoot-disabled")) window.$chatwoot?.toggle("open");
  }, { once: true });
}

/** Keep the widget mounted once while applying live admin settings. */
export function ChatwootWidget() {
  const identifiedUser = useRef<string | null>(null);
  const enabled = useFeature("chatwoot_support");
  const { getToken, isSignedIn, userId } = useClerkAuth();
  const loaded = useSettingsLoaded();
  const settings = useRawSettings();
  const [path] = useLocation();
  const { countryCode } = useCurrency();
  const pages = (settings.chatwoot_pages ?? "home,browse,listing,checkout,dashboard,support,other").split(",");
  const allowed = enabled && loaded && (settings.chatwoot_hide_admin !== "true" || !path.startsWith("/admin")) && pages.includes(pageGroup(path));
  const position = settings.chatwoot_position === "left" ? "left" : "right";
  const title = (settings.chatwoot_launcher_title || "Chat with support").slice(0, 60);
  const color = /^#[0-9a-fA-F]{6}$/.test(settings.chatwoot_brand_color || "") ? settings.chatwoot_brand_color : "#F26B21";

  useEffect(() => {
    document.documentElement.classList.toggle("bazunk-chatwoot-disabled", !allowed);
    if (!allowed) return;
    window.chatwootSettings = { position, type: "standard", launcherTitle: title };
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    const style = document.getElementById(STYLE_ID);
    if (style) style.textContent = `:root { --chatwoot-brand-color: ${color}; --chatwoot-primary-color: ${color}; }`;
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => window.chatwootSDK?.run({ websiteToken: WEBSITE_TOKEN, baseUrl: BASE_URL });
    document.head.appendChild(script);
  }, [allowed, position, title, color]);

  useEffect(() => {
    if (!allowed || !window.$chatwoot) return;
    const attributes: Record<string,string> = { bazunk_page: pageGroup(path) };
    if (settings.chatwoot_region_context !== "false") attributes.bazunk_region = countryCode === "GB" ? "UK" : countryCode === "US" ? "US" : countryCode;
    if (settings.chatwoot_order_context !== "false") {
      const match = path.match(/^\/(?:orders?|disputes?|returns?)\/([a-zA-Z0-9_-]{1,80})/);
      if (match) attributes.bazunk_case_reference = match[1];
    }
    const apply = () => window.$chatwoot?.setCustomAttributes?.(attributes);
    apply();
    window.addEventListener("chatwoot:ready", apply);
    return () => window.removeEventListener("chatwoot:ready", apply);
  }, [allowed, path, countryCode, settings.chatwoot_region_context, settings.chatwoot_order_context]);
  useEffect(() => {
    if (!isSignedIn && identifiedUser.current) {
      identifiedUser.current = null;
      window.$chatwoot?.reset?.();
    }
  }, [isSignedIn]);
  useEffect(() => {
    if (!allowed || settings.chatwoot_identify !== "true" || !isSignedIn || !userId) return;
    let cancelled = false;
    const identify = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\/$/, "");
        const response = await fetch(`${base}/api/chatwoot/identity`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data.identifier_hash) return;
        const apply = () => {
          if (cancelled || !window.$chatwoot?.setUser) return;
          if (identifiedUser.current !== data.identifier) {
            identifiedUser.current = data.identifier;
            window.$chatwoot.reset?.();
          }
          window.$chatwoot.setUser(data.identifier, {
            name: data.name, email: data.email, identifier_hash: data.identifier_hash,
          });
        };
        if (window.$chatwoot?.setUser) apply();
        else window.addEventListener("chatwoot:ready", apply, { once: true });
      } catch { /* Visitor can still use anonymous support chat. */ }
    };
    void identify();
    return () => { cancelled = true; };
  }, [allowed, isSignedIn, userId, getToken, settings.chatwoot_identify]);
  return null;
}
