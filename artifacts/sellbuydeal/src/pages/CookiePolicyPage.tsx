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
    <div className="bz-cookie-policy min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Deliberately match the Terms and Privacy layout in BOTH themes. */}
        <section className="bz-policy-surface bg-white border-b py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <Link href="/" className="bz-policy-back inline-flex items-center gap-1.5 text-sm font-semibold mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <div className="bz-policy-icon-box w-10 h-10 rounded-xl flex items-center justify-center">
                <Cookie className="bz-policy-icon w-5 h-5" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold">Cookie Policy</h1>
            </div>
            <p className="text-sm">Last updated: 20 October 2026</p>
          </div>
        </section>
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <article className="bz-policy-surface bg-white rounded-2xl border shadow-sm p-5 sm:p-8 space-y-8">
            <section aria-labelledby="bz-cookie-intro">
              <h2 id="bz-cookie-intro" className="text-xl font-bold">How Bazunk uses cookies</h2>
              <p className="mt-3 text-sm sm:text-base leading-7">
                Cookies are small files that websites store in your browser. Bazunk also uses
                browser storage and third-party scripts for shopping, authentication, payments
                and preferences. Optional tools may provide support chat, analytics and advertising.
                Some technologies are set by Bazunk; others are controlled by our providers.
                Your location may affect your legal rights and the providers available.
              </p>
              <div className="bz-policy-highlight mt-5 rounded-xl border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                  <div className="flex gap-3 items-start min-w-0">
                    <ShieldCheck className="bz-policy-icon mt-0.5 w-5 h-5 shrink-0" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-bold">Your current choices</h3>
                      <p className="mt-1 text-sm leading-6">
                        {hasSaved ? "Preferences saved." : "No optional cookie consent recorded."}{" "}
                        Live chat: {choices.functional ? "on" : "off"} · Analytics: {choices.analytics ? "allowed" : "off"} · Advertising: {choices.marketing ? "on" : "off"}.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={openCookieSettings}
                    className="bz-policy-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
                    <Settings2 className="w-4 h-4" aria-hidden="true" /> Manage cookies
                  </button>
                </div>
              </div>
            </section>
            {groups.map(group => (
              <section key={group.title} className="bz-policy-section border-t pt-6" aria-label={group.title}>
                <h2 className="text-lg font-bold">{group.title}</h2>
                <p className="mt-2 text-sm leading-7">{group.description}</p>
                <div className="mt-4 space-y-3">
                  {group.entries.map(([provider, technology, purpose, duration]) => (
                    <div key={provider + technology} className="bz-policy-entry rounded-xl border p-4">
                      <h3 className="text-base font-bold">{provider}</h3>
                      <dl className="mt-2 space-y-2 text-sm leading-6">
                        <div><dt className="inline font-bold">Technology: </dt><dd className="inline">{technology}</dd></div>
                        <div><dt className="inline font-bold">Purpose: </dt><dd className="inline">{purpose}</dd></div>
                        <div><dt className="inline font-bold">Duration: </dt><dd className="inline">{duration}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">Change or withdraw your consent</h2>
              <p className="mt-3 text-sm leading-7">
                The first-visit banner offers Accept all, Reject optional and Customise.
                You can reopen Cookie Settings at any time using the footer or the button above.
                Bazunk only loads optional scripts it controls when the corresponding choice is enabled.
                Withdrawing permission reloads the page to stop running optional scripts, but it does not
                automatically remove cookies already set by external providers. Clearing site data in
                your browser may also sign you out or remove local shopping preferences.
                Where a browser sends Global Privacy Control, we disable marketing tracking in these controls.
              </p>
              <p className="mt-3 text-sm leading-7">
                Authentication and payment providers may use necessary security technologies when requested.
                Exact cookie names and expiry dates set by third parties depend on their current systems,
                region and browser. The categories above describe the integrations identified in Bazunk's
                reviewed storefront; they are not an exhaustive live cookie scan.
              </p>
            </section>
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">More information</h2>
              <p className="mt-3 text-sm leading-7">
                Learn about personal data and your rights in our{" "}
                <Link href="/privacy" className="bz-policy-link font-semibold underline">Privacy Policy</Link>.
                For questions or concerns visit our{" "}
                <Link href="/support" className="bz-policy-link font-semibold underline">Support Centre</Link>.
                Bazunk LLC, 2709 N Hayden Island Dr, STE 872346, Portland, Oregon, 97217, USA.
              </p>
            </section>
          </article>
          <nav aria-label="Related legal pages" className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
            <Link className="bz-policy-link" href="/terms">Terms of Service</Link>
            <span aria-hidden="true">·</span>
            <Link className="bz-policy-link" href="/privacy">Privacy Policy</Link>
            <span aria-hidden="true">·</span>
            <Link className="bz-policy-link" href="/support">Support Centre</Link>
          </nav>
        </div>
      </main>
      <Footer />
    </div>
  );
}
