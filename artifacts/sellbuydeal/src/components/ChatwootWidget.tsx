import { useEffect } from "react";

declare global {
  interface Window {
    chatwootSettings?: { position: string; type: string; launcherTitle: string };
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
    $chatwoot?: { toggle: (state?: "open" | "close") => void };
  }
}

const BASE_URL = "https://app.chatwoot.com";
const WEBSITE_TOKEN = "gu46ahHNS8MPiQ4zJwK7PjnU";
const SCRIPT_ID = "bazunk-chatwoot-sdk";

export function openChatwootSupport() {
  if (window.$chatwoot) window.$chatwoot.toggle("open");
  else window.addEventListener("chatwoot:ready", () => window.$chatwoot?.toggle("open"), { once: true });
}

/** Load the support widget once, even across React strict-mode remounts. */
export function ChatwootWidget() {
  useEffect(() => {
    window.chatwootSettings = {
      position: "right",
      type: "standard",
      launcherTitle: "Chat with support",
    };

    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => {
      window.chatwootSDK?.run({ websiteToken: WEBSITE_TOKEN, baseUrl: BASE_URL });
    };
    document.head.appendChild(script);
  }, []);
  return null;
}
