import { Cookie, ArrowLeft, ShieldCheck, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { openCookieSettings, useCookieConsent } from "@/components/CookieConsent";

const groups = [
  {
    title: "1. Essential cookies",
    description: "Always active. These technologies support services you request and protect the marketplace. Where strictly necessary, separate cookie consent is not required.",
    items: ["Secure registration, sign-in and authentication", "Shopping baskets, checkout and payment security", "Session security, fraud prevention and misuse protection", "Remembering cookie preferences and providing core marketplace services"],
  },
  {
    title: "2. Preferences and personalisation",
    description: "Bazunk may remember your settings and help tailor your marketplace experience. Some requested preferences can be necessary; other personalisation technologies require appropriate permission.",
    items: ["Language, currency, regional and display preferences", "Recently viewed products and personalised recommendations", "Saved searches, product discovery and personal buying assistance", "Other optional browsing and marketplace preferences"],
  },
  {
    title: "3. Customer support and communication",
    description: "When enabled or requested, these tools support assistance and communication. Non-essential support technologies follow your optional functionality choice.",
    items: ["Live customer support chat and ongoing conversations", "Support history for signed-in customers", "Optional communication and notification features", "Support service quality and reliability"],
  },
  {
    title: "4. Analytics and marketplace improvements",
    description: "Where enabled, measurement helps us understand marketplace use and improve its services. Non-essential analytics will require your permission unless an applicable legal exemption applies.",
    items: ["Website navigation and technical performance", "Search, discovery and feature improvements", "Checkout usability, accessibility and speed", "Evaluation of newly introduced marketplace functionality"],
  },
  {
    title: "5. Advertising and marketing",
    description: "Where advertising technologies require consent, they are enabled only when you allow advertising. Rejecting optional advertising cookies does not necessarily remove contextual advertisements.",
    items: ["Displaying relevant advertisements and sponsored listings", "Measuring campaign effectiveness", "Limiting repetitive advertisements", "Personalising advertising where permitted"],
  },
] as const;

const technicalDetails = [
  { name: "Bazunk - consent preferences", category: "Essential", purpose: "Stores your cookie choices and date in browser local storage.", duration: "Until you update preferences or clear browser storage." },
  { name: "Bazunk - shopping state", category: "Essential / requested preferences", purpose: "Stores cart, regional and other core browser state where used.", duration: "Session or persistent browser storage, according to the feature." },
  { name: "Clerk - authentication", category: "Essential", purpose: "Manages sign-in sessions and account security.", duration: "Provider-controlled session or persistent cookies; values vary by configuration." },
  { name: "Stripe - payments", category: "Essential when checkout is requested", purpose: "Supports payment security and anti-fraud controls.", duration: "Provider-controlled; varies with the payment flow." },
  { name: "Chatwoot - live support", category: "Optional functionality", purpose: "Keeps support chats available when enabled.", duration: "Provider-controlled session and persistent storage." },
  { name: "Google AdSense and configured ad services", category: "Optional advertising", purpose: "Advertising delivery and measurement where the integration is active.", duration: "Provider-controlled; varies by region, device and implementation." },
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
                <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7">
                  {group.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ))}
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">6. New features and services</h2>
              <p className="mt-3 text-sm leading-7">
                Bazunk continues to introduce and improve tools for buyers, sellers and visitors.
                New features may use additional cookies, browser storage or trusted technology providers.
                We review new technologies before activation, update relevant disclosures and request
                new permission when an additional purpose requires consent. This policy does not give
                blanket permission for future tracking.
              </p>
            </section>
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">7. Third-party services and detailed cookie information</h2>
              <p className="mt-3 text-sm leading-7">
                Technology partners may help with secure accounts, payment processing, support,
                advertising and future marketplace services. The details below describe currently
                identified integrations, not an exhaustive live scan. Exact third-party cookie names
                and storage periods may depend on their configuration, region and browser.
              </p>
              <details className="bz-policy-entry mt-4 rounded-xl border p-4">
                <summary className="cursor-pointer text-base font-bold">Detailed Cookie Information - providers, purposes and storage</summary>
                <div className="mt-4 space-y-3">
                  {technicalDetails.map(detail => (
                    <div key={detail.name} className="bz-policy-entry rounded-xl border p-4">
                      <h3 className="text-base font-bold">{detail.name}</h3>
                      <dl className="mt-2 space-y-2 text-sm leading-6">
                        <div><dt className="inline font-bold">Category: </dt><dd className="inline">{detail.category}</dd></div>
                        <div><dt className="inline font-bold">Purpose: </dt><dd className="inline">{detail.purpose}</dd></div>
                        <div><dt className="inline font-bold">Duration: </dt><dd className="inline">{detail.duration}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </details>
            </section>
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">8. How long cookies are stored</h2>
              <p className="mt-3 text-sm leading-7">
                Session technologies generally expire at the end of a browsing session. Persistent
                cookies and browser storage may remain to remember choices or support disclosed functions.
                Actual expiry depends on the technology and the provider. The details above describe
                the integrations currently identified on the storefront.
              </p>
            </section>
            <section className="bz-policy-section border-t pt-6">
              <h2 className="text-lg font-bold">9. Change or withdraw your consent</h2>
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
              <h2 className="text-lg font-bold">10. Privacy, changes and contact</h2>
              <p className="mt-3 text-sm leading-7">
                This policy may change as Bazunk adds features or legal requirements evolve. We will seek new consent where required. Learn about your privacy rights in our{" "}
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
