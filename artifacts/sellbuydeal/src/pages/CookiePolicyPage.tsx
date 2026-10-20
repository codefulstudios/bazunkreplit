import { Cookie, ArrowLeft, ShieldCheck, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { openCookieSettings, useCookieConsent } from "@/components/CookieConsent";

const groups = [
  {
    title: "Strictly necessary",
    description: "These are needed to supply services you request and keep them secure. Consent is not required for strictly necessary technologies.",
    entries: [
      ["Bazunk", "Cookie preferences (bazunk_cookie_preferences_v1 in localStorage)", "Stores your choice and its date so you are not asked every visit.", "Until browser storage is cleared or preferences are updated."],
      ["Bazunk", "Cart, region, currency, language and other core browser state", "Retains your basket and shopping preferences across page visits.", "Local/session storage; until cleared or superseded, depending on the feature."],
      ["Clerk", "Sign-in, session and authentication cookies", "Maintains account access, protects login and helps prevent fraud.", "Session and persistent cookies; precise names and expiry depend on Clerk configuration."],
      ["Stripe", "Checkout and payment security cookies", "Protects payment processing and helps detect fraudulent transactions when you use checkout.", "Provider-controlled, depending on the Stripe payment flow."],
    ],
  },
  {
    title: "Optional functionality",
    description: "Only enabled when you choose optional functionality.",
    entries: [
      ["Chatwoot", "Live-chat cookies and local storage", "Keeps support conversations available and may link messages to a signed-in user when identification is enabled.", "Provider-controlled session or persistent storage; see Chatwoot's current documentation."],
    ],
  },
  {
    title: "Analytics",
    description: "Optional audience measurement, subject to your choice. No dedicated analytics tag was identified in the reviewed storefront code as of this update; this preference does not imply analytics tracking is active.",
    entries: [
      ["Optional providers", "Analytics cookies, if configured later", "Measure use of marketplace pages and feature performance.", "The provider, cookie names and expiry must be disclosed before activation."],
    ],
  },
  {
    title: "Advertising and marketing",
    description: "Only enabled when you allow advertising cookies, subject to your browser's privacy signals.",
    entries: [
      ["Google AdSense", "Advertising cookies and similar identifiers", "Delivers, measures or personalises advertising subject to Google's controls and settings.", "Google-controlled; names and duration can differ by device, region and user state."],
      ["Administrator-configured ad services", "Third-party advertising scripts, where enabled", "Display and measure third-party advertisements in configured slots.", "Varies by actual advertising provider; must be reviewed when scripts change."],
    ],
  },
] as const;

export function CookiePolicyPage() {
  const { choices, hasSaved } = useCookieConsent();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <main>
        <section className="border-b border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-4xl px-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-300">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <div className="mt-6 flex items-center gap-3">
              <span className="rounded-xl bg-orange-100 p-3 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                <Cookie className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="text-3xl font-extrabold">Cookie Policy</h1>
            </div>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Last updated: 20 October 2026</p>
          </div>
        </section>
        <div className="mx-auto max-w-4xl space-y-7 px-4 py-10">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold">How Bazunk uses cookies</h2>
            <p className="mt-3 leading-7 text-slate-700 dark:text-slate-200">
              Cookies are small files websites may store in your browser. We also use similar
              technologies such as localStorage and third-party scripts. They help run shopping,
              sign-in and payments; optional services may offer live chat, measurement or advertising.
              Some technologies are set by Bazunk and some by services we use. This policy applies
              to visitors in the UK, United States and other regions; local rules may give additional rights.
            </p>
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-orange-700 dark:text-orange-300" aria-hidden="true" />
                <div>
                  <p className="font-bold">Your current choices</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {hasSaved ? "Preferences saved." : "No optional cookie consent recorded."}{" "}
                    Live chat: {choices.functional ? "on" : "off"} · Analytics: {choices.analytics ? "allowed" : "off"} · Advertising: {choices.marketing ? "on" : "off"}.
                  </p>
                </div>
              </div>
              <button type="button" onClick={openCookieSettings}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">
                <Settings2 className="h-4 w-4" aria-hidden="true" /> Manage cookies
              </button>
            </div>
          </section>

          {groups.map(group => (
            <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <h2 className="text-xl font-bold">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{group.description}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-slate-300 text-slate-900 dark:border-slate-600 dark:text-white">
                    <th className="py-3 pr-3">Provider</th><th className="py-3 pr-3">Technology</th><th className="py-3 pr-3">Purpose</th><th className="py-3">Duration</th>
                  </tr></thead>
                  <tbody>{group.entries.map(entry => (
                    <tr key={entry[0] + entry[1]} className="border-b border-slate-200 align-top text-slate-700 last:border-0 dark:border-slate-700 dark:text-slate-200">
                      {entry.map((cell, i) => <td key={i} className="py-3 pr-3 leading-6">{cell}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold">Change or withdraw your consent</h2>
            <p className="mt-3 leading-7 text-slate-700 dark:text-slate-200">
              Choose Accept all, Reject optional or Customise when the banner appears. You can reopen
              Cookie Settings from the footer or the button above at any time. Optional scripts are not
              loaded by Bazunk before their corresponding consent is saved. When you withdraw permission,
              Bazunk reloads the page to stop scripts already running. Withdrawing permission does not
              automatically erase third-party cookies previously set. You can also clear cookies and
              site data in your browser; this may sign you out or empty locally saved shopping information.
              If your browser sends Global Privacy Control, Bazunk disables marketing tracking in these controls.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
              Payment providers and sign-in services may set necessary security cookies when their
              services are requested. Third-party cookies and storage can change with provider updates,
              your browser and active site features. We periodically review these integrations; exact
              third-party names and lifetimes should be checked in the providers' current notices.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold">More information</h2>
            <p className="mt-3 leading-7 text-slate-700 dark:text-slate-200">
              For personal data, international transfers and your rights, see our{" "}
              <Link href="/privacy" className="font-bold text-orange-700 underline dark:text-orange-300">Privacy Policy</Link>.
              For questions or to raise a concern, use our{" "}
              <Link href="/support" className="font-bold text-orange-700 underline dark:text-orange-300">Support Centre</Link>.
              Bazunk LLC, 2709 N Hayden Island Dr, STE 872346, Portland, Oregon, 97217, USA.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
