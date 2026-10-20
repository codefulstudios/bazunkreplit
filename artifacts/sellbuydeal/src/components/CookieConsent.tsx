import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Cookie, Settings2, ShieldCheck, X } from "lucide-react";

export type CookieCategory = "necessary" | "functional" | "analytics" | "marketing";
export type CookieChoices = Record<CookieCategory, boolean>;
type SavedChoices = CookieChoices & { version: 1; updatedAt: string };

export const COOKIE_PREFERENCES_KEY = "bazunk_cookie_preferences_v1";
const OPEN_SETTINGS_EVENT = "bazunk:open-cookie-settings";
const STORAGE_VERSION = 1;
const optionalDisabled: CookieChoices = {
  necessary: true, functional: false, analytics: false, marketing: false,
};

function globalPrivacyControlActive() {
  return typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function readChoices(): SavedChoices | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const saved = parsed as Record<string, unknown>;
    if (saved.version !== STORAGE_VERSION || typeof saved.updatedAt !== "string" ||
      typeof saved.functional !== "boolean" || typeof saved.analytics !== "boolean" ||
      typeof saved.marketing !== "boolean") return null;
    return {
      version: 1,
      updatedAt: saved.updatedAt,
      necessary: true,
      functional: saved.functional,
      analytics: saved.analytics,
      marketing: globalPrivacyControlActive() ? false : saved.marketing,
    };
  } catch {
    return null;
  }
}

export function getCookieChoices(): CookieChoices {
  return readChoices() ?? { ...optionalDisabled };
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

type CookieContextValue = {
  choices: CookieChoices;
  hasSaved: boolean;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  save: (choices: CookieChoices) => void;
};

const CookieContext = createContext<CookieContextValue | null>(null);

export function useCookieConsent(): CookieContextValue {
  const context = useContext(CookieContext);
  if (!context) throw new Error("useCookieConsent requires CookieConsentProvider");
  return context;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedChoices | null>(readChoices);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== COOKIE_PREFERENCES_KEY && event.key !== null) return;
      const next = readChoices();
      setSaved(previous => {
        if (previous && (!next ||
          (previous.marketing && !next.marketing) ||
          (previous.functional && !next.functional) ||
          (previous.analytics && !next.analytics))) {
          window.location.reload(); // Stop already-running optional third-party code.
        }
        return next;
      });
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, open);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (choices: CookieChoices) => {
    const next: SavedChoices = {
      version: 1,
      updatedAt: new Date().toISOString(),
      necessary: true,
      functional: choices.functional,
      analytics: choices.analytics,
      marketing: globalPrivacyControlActive() ? false : choices.marketing,
    };
    const revoked = !!saved && (
      (saved.marketing && !next.marketing) ||
      (saved.functional && !next.functional) ||
      (saved.analytics && !next.analytics)
    );
    try { window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(next)); }
    catch { /* Consent is still respected for this session if storage is blocked. */ }
    setSaved(next);
    setSettingsOpen(false);
    if (revoked) window.location.reload();
  };

  return (
    <CookieContext.Provider value={{
      choices: saved ?? optionalDisabled,
      hasSaved: saved !== null,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      save,
    }}>
      {children}
    </CookieContext.Provider>
  );
}

/** Google advertising code is never requested until marketing consent is recorded. */
export function CookieMarketingScripts() {
  const { choices } = useCookieConsent();
  useEffect(() => {
    if (!choices.marketing || document.getElementById("bazunk-adsense-sdk")) return;
    const script = document.createElement("script");
    script.id = "bazunk-adsense-sdk";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8557219206338725";
    document.head.appendChild(script);
  }, [choices.marketing]);
  return null;
}

const categories: Array<{
  key: Exclude<CookieCategory, "necessary">; title: string; description: string;
}> = [
  { key: "functional", title: "Optional functionality", description: "Enables Chatwoot live support and its browser storage. Core shopping and account access work without it." },
  { key: "analytics", title: "Analytics", description: "Permission for optional usage-measurement cookies if an analytics integration is enabled in future. No dedicated analytics tag was found in the reviewed storefront." },
  { key: "marketing", title: "Advertising", description: "Allows Google advertising code and any administrator-configured advertising scripts that may use tracking technologies." },
];

const choiceButton = "min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";

export function CookieConsentBanner() {
  const { choices, hasSaved, settingsOpen, openSettings, closeSettings, save } = useCookieConsent();
  const [draft, setDraft] = useState<CookieChoices>(choices);
  const gpc = globalPrivacyControlActive();
  useEffect(() => { if (settingsOpen) setDraft(choices); }, [settingsOpen, choices]);
  if (hasSaved && !settingsOpen) return null;

  const reject = () => save({ ...optionalDisabled });
  const accept = () => save({ necessary: true, functional: true, analytics: true, marketing: !gpc });
  return (
    <>
      {settingsOpen && (
        <div className="fixed inset-0 z-[99] bg-slate-950/65 backdrop-blur-[2px]" aria-hidden="true" onClick={hasSaved ? closeSettings : undefined} />
      )}
      <section
        role={settingsOpen ? "dialog" : "region"}
        aria-modal={settingsOpen ? true : undefined}
        aria-labelledby="bazunk-cookie-heading"
        className={settingsOpen
          ? "fixed left-1/2 top-1/2 z-[100] w-[min(96vw,600px)] max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-600 bg-[#10223e] p-5 text-white shadow-2xl sm:p-7"
          : "fixed bottom-0 left-0 right-0 z-[90] border-t-2 border-orange-500 bg-[#07172c] px-4 py-4 text-white shadow-[0_-8px_35px_rgba(0,0,0,.35)] sm:px-6"}
      >
        <div className={settingsOpen ? "" : "mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <Cookie className="h-6 w-6 shrink-0 text-orange-400" aria-hidden="true" />
              <h2 id="bazunk-cookie-heading" className="text-lg font-extrabold text-white">
                {settingsOpen ? "Your cookie preferences" : "Your privacy matters"}
              </h2>
              {settingsOpen && hasSaved && (
                <button type="button" onClick={closeSettings} aria-label="Close cookie preferences"
                  className="ml-auto rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-100">
              We use essential cookies and browser storage for shopping, security and accounts.
              With your permission, we can enable optional live chat, analytics and advertising.
              You can refuse optional cookies and still browse and buy.
              {" "}<Link href="/cookies" className="font-bold text-orange-300 underline underline-offset-2 hover:text-white">Read our Cookie Policy</Link>.
            </p>
            {settingsOpen && (
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-600 bg-white/5 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <div className="flex-1"><h3 className="font-bold text-white">Strictly necessary</h3>
                    <p className="mt-1 text-sm text-slate-200">Required for login, security, checkout, cart and recording these choices.</p></div>
                  <span className="rounded-lg bg-emerald-900 px-3 py-1 text-xs font-bold text-emerald-100">Always on</span>
                </div>
                {categories.map(category => (
                  <label key={category.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-600 bg-white/5 p-4">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-orange-500"
                      checked={category.key === "marketing" && gpc ? false : draft[category.key]}
                      disabled={category.key === "marketing" && gpc}
                      onChange={event => setDraft(previous => ({ ...previous, [category.key]: event.target.checked }))} />
                    <span className="flex-1">
                      <span className="block font-bold text-white">{category.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-slate-200">{category.description}</span>
                      {category.key === "marketing" && gpc && <span className="mt-1 block text-xs text-orange-200">Your browser's Global Privacy Control signal disables advertising tracking.</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className={settingsOpen ? "mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" : "flex shrink-0 flex-col gap-2 sm:flex-row lg:justify-end"}>
            <button type="button" onClick={reject}
              className={choiceButton + " border-white/50 bg-[#253958] text-white hover:bg-[#334969]"}>
              Reject optional
            </button>
            {settingsOpen ? (
              <button type="button" onClick={() => save(draft)}
                className={choiceButton + " border-white/50 bg-[#253958] text-white hover:bg-[#334969]"}>
                Save choices
              </button>
            ) : (
              <button type="button" onClick={openSettings}
                className={choiceButton + " inline-flex items-center justify-center gap-2 border-white/50 bg-[#253958] text-white hover:bg-[#334969]"}>
                <Settings2 className="h-4 w-4" aria-hidden="true" /> Customise
              </button>
            )}
            <button type="button" onClick={accept}
              className={choiceButton + " border-orange-500 bg-orange-500 text-slate-950 hover:bg-orange-400"}>
              Accept all
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
