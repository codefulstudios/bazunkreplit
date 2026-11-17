import { Link } from "wouter";
import { Cookie, FileText, Headphones, Mail, ShieldCheck } from "lucide-react";
import { useSiteSettings, useRawSettings } from "@/context/SiteSettingsContext";
import { parseIconOverrides, iconForPlacement } from "@/design-system/designCenterFields";
import { openCookieSettings } from "@/components/CookieConsent";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

export function Footer() {
  const s=useSiteSettings();
  const raw=useRawSettings();
  const studioIcons=parseIconOverrides(raw.icon_overrides);
  const social=[
    {url:s.footer_youtube,Icon:iconForPlacement(studioIcons,"footer_youtube"),label:"YouTube"},
    {url:s.footer_instagram,Icon:iconForPlacement(studioIcons,"footer_instagram"),label:"Instagram"},
    {url:s.footer_twitter,Icon:iconForPlacement(studioIcons,"footer_twitter"),label:"X / Twitter"},
    {url:s.footer_facebook,Icon:iconForPlacement(studioIcons,"footer_facebook"),label:"Facebook"}
  ].filter(item=>item.url&&item.url!=="#");
  return (
    <footer className="bazunk-site-footer bz-compact-footer" aria-label="Bazunk footer">
      <div className="bz-compact-footer-inner">
        <div className="bz-compact-footer-main">
          <Link href="/" className="bz-compact-footer-brand" aria-label="Bazunk home">
            <img src={s.site_logo_url?.startsWith("/api/site-media/")?API_BASE+s.site_logo_url:"/bazunk-brand-dark.png"} alt={s.site_name||"Bazunk"} data-theme-edit="site_logo_url"/>
          </Link>
          <nav className="bz-compact-footer-links" aria-label="Footer links">
            <Link href="/privacy"><ShieldCheck size={20}/> <span>Privacy</span></Link>
            <Link href="/terms"><FileText size={20}/> <span>Terms</span></Link>
            <Link href="/cookies"><Cookie size={20}/> <span>Cookies</span></Link>
            <Link href="/support"><Headphones size={20}/> <span>Help</span></Link>
            <Link href="/support"><Mail size={20}/> <span>Contact</span></Link>
          </nav>
          <div className="bz-compact-footer-social" aria-label="Bazunk social media">
            {social.map(({url,Icon,label})=><a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={19}/></a>)}
          </div>
        </div>
        <div className="bz-compact-footer-bottom">
          <p>&copy; {new Date().getFullYear()} {s.footer_copyright||"Bazunk Marketplace USA LLC."} All rights reserved.</p>
          <button type="button" onClick={openCookieSettings}>Cookie Settings</button>
        </div>
        <div className="bz-compact-footer-wave" aria-hidden="true"><span/></div>
      </div>
    </footer>
  );
}
