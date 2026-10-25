import { Link } from "wouter";

import { useSiteSettings, useRawSettings } from "@/context/SiteSettingsContext";
import {parseIconOverrides,iconForPlacement} from "@/design-system/designCenterFields";
import { useCurrency } from "@/context/CurrencyContext";
import { openCookieSettings } from "@/components/CookieConsent";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
const linkClass = "text-sm font-medium text-white/70 hover:text-white transition-colors";

export function Footer() {
  const { formatPrice, currency } = useCurrency();
  const s = useSiteSettings();
  const raw=useRawSettings();
  const studioIcons=parseIconOverrides(raw.icon_overrides);
  const FacebookIcon=iconForPlacement(studioIcons,"footer_facebook");
  const TwitterIcon=iconForPlacement(studioIcons,"footer_twitter");
  const InstagramIcon=iconForPlacement(studioIcons,"footer_instagram");
  const YoutubeIcon=iconForPlacement(studioIcons,"footer_youtube");

  return (
    <footer className="bg-[#07172c] text-white/80 border-t border-sky-400/20">
      <div className="container mx-auto px-4 py-9 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-[1.35fr_1fr_1fr_1.15fr_1fr] gap-x-8 gap-y-8">
          <div className="col-span-2 md:col-span-1 md:pr-5">
            <Link href="/" className="inline-block mb-3">
              <img
                src={s.site_logo_url?.startsWith("/api/site-media/")?API_BASE+s.site_logo_url : "/bazunk-brand-dark.png"}
                alt={s.site_name||"Bazunk"} data-theme-edit="site_logo_url"
                className="h-9 md:h-10 w-auto object-contain"
              />
            </Link>
            <p data-theme-edit="footer_about" className="max-w-xs text-sm leading-6 text-white/65">
              {raw.theme_studio_enabled==="true"?s.footer_about:"Buy. Sell. Deal. Get Rewarded."}<br />
              Private sellers list and sell for {formatPrice(0)}.
            </p>

            <div className="flex items-center gap-2.5 mt-4">
              {s.footer_facebook && s.footer_facebook !== "#" && (
                <a href={s.footer_facebook} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Facebook" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <FacebookIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_twitter && s.footer_twitter !== "#" && (
                <a href={s.footer_twitter} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Twitter" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <TwitterIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_instagram && s.footer_instagram !== "#" && (
                <a href={s.footer_instagram} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Instagram" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <InstagramIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_youtube && s.footer_youtube !== "#" && (
                <a href={s.footer_youtube} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on YouTube" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <YoutubeIcon className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Buy</h4>
            <ul className="space-y-2.5">
              <li><Link href="/browse" className={linkClass}>Browse</Link></li>
              <li><Link href="/categories" className={linkClass}>Categories</Link></li>
              <li><Link href="/dashboard" className={linkClass}>My Watchlist</Link></li>
              <li><Link href="/rewards" className={linkClass}>Rewards</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Sell</h4>
            <ul className="space-y-2.5">
              <li><Link href="/sell" className={linkClass}>Start Selling</Link></li>
              <li><Link href="/dashboard" className={linkClass}>Seller Dashboard</Link></li>
              <li><Link href="/buyer-protection#fees" className={linkClass}>Selling Fees</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Help & Bazunk</h4>
            <ul className="space-y-2.5">
              <li><Link href="/support" className={linkClass}>Help & FAQ</Link></li>
              <li><Link href="/buyer-protection" className={linkClass}>Buyer Protection</Link></li>
              <li><Link href="/dashboard" className={linkClass}>Returns & Refunds</Link></li>
              <li><Link href="/support" className={linkClass}>Contact Us</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Follow Us</h4>
            <div className="flex flex-wrap gap-2">
              {[
                {url:s.footer_facebook, Icon:FacebookIcon, label:"Facebook"},
                {url:s.footer_instagram, Icon:InstagramIcon, label:"Instagram"},
                {url:s.footer_youtube, Icon:YoutubeIcon, label:"YouTube"},
                {url:s.footer_twitter, Icon:TwitterIcon, label:"Twitter"}
              ].filter(item => item.url && item.url !== "#").map(({url,Icon,label}) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#203b63] text-white hover:bg-blue-600 transition-colors"><Icon className="w-4 h-4" /></a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-white/45">
            &copy; {new Date().getFullYear()} {s.footer_copyright||"Bazunk Marketplace"} · All rights reserved.
            <span className="block mt-1">2709 N Hayden Island Dr, STE 872346, Portland, Oregon, 97217, USA</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs md:text-sm text-white/80">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="https://bazunk.com/cookies" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cookie Policy<span className="sr-only"> (opens in a new tab)</span></a>
            <button type="button" onClick={openCookieSettings} className="font-medium text-white hover:text-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">Cookie Settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
