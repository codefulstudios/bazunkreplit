import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useCookieConsent } from "@/components/CookieConsent";

type SlotKey = "home_bottom" | "browse_top" | "browse_bottom" | "auctions_mid" | "flash_sales_mid" | "categories_top" | "classifieds_mid" | "support_mid" | "live_left" | "live_bottom";

interface AdSlotProps {
  slotKey: SlotKey;
  className?: string;
}

function AdSenseBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !code.trim()) return;
    const container = ref.current;
    container.innerHTML = code;
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }, [code]);

  return <div ref={ref} className="overflow-hidden w-full" />;
}

export function AdSlot({ slotKey, className = "" }: AdSlotProps) {
  const raw = useSiteSettings() as unknown as Record<string, string>;
  const { choices } = useCookieConsent();

  const enabled = raw[`ad_${slotKey}_enabled`] === "true";
  if (!enabled) return null;

  const type = raw[`ad_${slotKey}_type`] || "text";
  // Never execute configurable third-party ads before marketing consent.
  if ((type === "custom" || type === "adsense") && !choices.marketing) return null;
  const code = raw[`ad_${slotKey}_code`] || "";
  const customHtml = raw[`ad_${slotKey}_custom_html`] || "";
  const textTitle = raw[`ad_${slotKey}_text_title`] || "";
  const textBody = raw[`ad_${slotKey}_text_body`] || "";
  const textUrl = raw[`ad_${slotKey}_text_url`] || "";
  const textCta = raw[`ad_${slotKey}_text_cta`] || "Learn More";

  if (type === "custom") {
    if (!customHtml.trim()) return null;
    return (
      <div className={`w-full bg-gray-50 border-y border-gray-100 py-2 flex flex-col items-center ${className}`}>
        <span className="text-[9px] text-gray-300 font-semibold tracking-widest uppercase mb-1 self-end mr-4">Advertisement</span>
        <div className="w-full max-w-[728px] min-h-[90px] mx-auto overflow-hidden">
          <AdSenseBlock code={customHtml} />
        </div>
      </div>
    );
  }

  if (type === "adsense") {
    if (!code.trim()) return null;
    return (
      <div className={`w-full bg-gray-50 border-y border-gray-100 py-2 flex flex-col items-center ${className}`}>
        <span className="text-[9px] text-gray-300 font-semibold tracking-widest uppercase mb-1 self-end mr-4">Advertisement</span>
        <div className="w-full max-w-[728px] min-h-[90px] mx-auto">
          <AdSenseBlock code={code} />
        </div>
      </div>
    );
  }

  // All native promotional placements share the Browse-top creative.
  // The Live sidebar uses the same visual language in a narrower space.
  if (!textTitle && !textBody) return null;
  const isSidebar = slotKey === "live_left";
  const safeUrl = textUrl.trim();
  const validUrl = safeUrl.startsWith("/") && !safeUrl.startsWith("//")
    ? safeUrl
    : /^https?:\/\//i.test(safeUrl) ? safeUrl : "";
  const external = /^https?:\/\//i.test(validUrl);
  return (
    <div className={`w-full px-4 py-4 ${className}`}>
      <div className={`mx-auto w-full ${isSidebar ? "" : "max-w-6xl"}`}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4A4FF3] via-[#8B4FE8] to-[#EC3CB8] px-4 sm:px-6 py-4 sm:py-5 shadow-lg shadow-purple-950/15">
          <div className="pointer-events-none absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10" />
          <div className={`relative flex gap-4 ${isSidebar ? "flex-col" : "flex-col md:flex-row md:items-center"}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <span className="rounded-md bg-yellow-300 px-2 py-1 text-[10px] font-black tracking-wide text-slate-900 flex-shrink-0">AD</span>
              <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 flex-shrink-0">
                <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </span>
              <div className="min-w-0 text-white">
                {textTitle && <p className="text-lg sm:text-xl font-black leading-tight">{textTitle}</p>}
                {textBody && <p className="mt-1 text-sm font-semibold text-white/90">{textBody}</p>}
              </div>
            </div>
            {validUrl && (
              <a href={validUrl} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
                className="inline-flex min-h-12 flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#101C38] px-5 sm:px-7 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#17264a]">
                {textCta} <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
