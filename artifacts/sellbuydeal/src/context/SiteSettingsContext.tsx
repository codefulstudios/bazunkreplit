import { createContext, useContext, useEffect, useState } from "react";
import { designSettingKey, parseDesignPalette, type DesignArea, type DesignMode } from "@/design-system/palette";
import {installDesignPreviewBridge} from "@/design-system/previewBridge";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

export interface SiteSettings {
  site_name: string;
  site_logo_url: string;
  site_favicon_url: string;
  hero_image_url: string;
  seo_og_image_url: string;
  icon_overrides: string;
  header_search_placeholder: string;
  home_sections_layout: string;
  site_tagline: string;
  primary_color: string;
  secondary_color: string;
  maintenance_mode: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  announcement_enabled: string;
  announcement_text: string;
  announcement_color: string;
  features_title: string;
  features_subtitle: string;
  categories_title: string;
  categories_subtitle: string;
  footer_about: string;
  footer_facebook: string;
  footer_twitter: string;
  footer_instagram: string;
  footer_youtube: string;
  footer_copyright: string;
  contact_email: string;
  contact_phone: string;
  seo_title: string;
  seo_description: string;
}

export interface SiteSettingsContextValue {
  settings: SiteSettings;
  rawSettings: Record<string, string>;
  settingsLoaded: boolean;
}

const DEFAULTS: SiteSettings = {
  site_name: "Bazunk",
  site_logo_url: "",
  site_favicon_url: "",
  hero_image_url: "",
  seo_og_image_url: "",
  icon_overrides: "",
  header_search_placeholder: "Search listings...",
  home_sections_layout: "",
  site_tagline: "Buy and sell anything, locally.",
  primary_color: "#F26B21",
  secondary_color: "#4A5CE8",
  maintenance_mode: "false",
  hero_title: "Buy, Make an Offer & List for Free!",
  hero_subtitle: "The smarter way to buy and sell — fixed prices, open offers, and free listings. Find great deals or start earning today.",
  hero_cta_primary: "Start Shopping",
  hero_cta_secondary: "Become a Seller",
  announcement_enabled: "false",
  announcement_text: "🎉 Welcome to Bazunk — buy and sell anything locally!",
  announcement_color: "#F26B21",
  features_title: "Why Bazunk?",
  features_subtitle: "A marketplace built around trust — secure payments, real reviews, and support when you need it",
  categories_title: "Shop by Category",
  categories_subtitle: "Find exactly what you're looking for in our organised categories",
  footer_about: "Buy, Sell, and Save More — The Feature-Packed Marketplace with Low Fees, Big Deals, and Endless Possibilities.",
  footer_facebook: "#",
  footer_twitter: "#",
  footer_instagram: "#",
  footer_youtube: "#",
  footer_copyright: "Bazunk Marketplace",
  contact_email: "support@bazunk.com",
  contact_phone: "",
  seo_title: "Bazunk - Buy & Sell Anything Locally",
  seo_description: "The smarter way to buy and sell locally. Free listings, secure checkout, real reviews.",
};

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULTS,
  rawSettings: {},
  settingsLoaded: false,
});

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  useEffect(()=>installDesignPreviewBridge(),[]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [rawSettings, setRawSettings] = useState<Record<string, string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = () => {
      fetch(`${API_BASE}/api/settings/public`, { cache: "no-store" })
        .then(r => { if (!r.ok) throw new Error(`Settings HTTP ${r.status}`); return r.json(); })
        .then((data: Record<string, string>) => {
          setSettings({ ...DEFAULTS, ...data });
          setRawSettings(data);
          setSettingsLoaded(true);
        })
        .catch(() => { setSettingsLoaded(true); });
    };
    loadSettings();
    const refreshOnFocus = () => { if (document.visibilityState === "visible") loadSettings(); };
    window.addEventListener("bazunk-settings-updated", loadSettings);
    window.addEventListener("focus", loadSettings);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {window.removeEventListener("bazunk-settings-updated", loadSettings);window.removeEventListener("focus", loadSettings);document.removeEventListener("visibilitychange", refreshOnFocus);};
  }, []);

  // A draft preview can update this iframe only. Never apply cross-origin
  // messages or draft values to a visitor's normal browsing session.
  useEffect(()=>{
    if(!new URLSearchParams(window.location.search).has("bazunk-theme-preview")||window.parent===window)return;
    const listener=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==window.parent||
        event.data?.type!=="bazunk:theme-preview-settings")return;
      const proposed=event.data?.settings;
      if(!proposed||typeof proposed!=="object"||Array.isArray(proposed))return;
      const keys=["site_name","site_tagline","site_logo_url","site_favicon_url","hero_image_url","seo_og_image_url","home_sections_layout","hero_title","hero_subtitle",
        "hero_cta_primary","hero_cta_secondary","footer_about","footer_copyright",
        "footer_facebook","footer_twitter","footer_instagram","footer_youtube",
        "announcement_enabled","announcement_text","announcement_color",
        "categories_title","categories_subtitle","features_title","features_subtitle",
        "header_search_placeholder","seo_title","seo_description","icon_overrides"];
      if(!keys.every(k=>typeof proposed[k]==="string"&&proposed[k].length<=800))return;
      const safe=Object.fromEntries(keys.map(k=>[k,proposed[k]]));
      setSettings(prev=>({...prev,...safe}));
      setRawSettings(prev=>({...prev,...safe,theme_studio_enabled:"true"}));
    };
    window.addEventListener("message",listener);
    return()=>window.removeEventListener("message",listener);
  },[]);

  // Click-to-edit events are emitted ONLY inside the same-origin private
  // Theme Studio preview iframe. Public storefront clicks stay unchanged.
  useEffect(()=>{
    if(!new URLSearchParams(window.location.search).has("bazunk-theme-preview")||window.parent===window)return;
    const choose=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const element=target.closest<HTMLElement>("[data-theme-edit],[data-theme-section]");
      if(!element)return;
      const field=element.dataset.themeEdit,section=element.dataset.themeSection;
      if(!field&&!section)return;
      event.preventDefault();event.stopPropagation();
      element.style.outline="3px solid #2563eb";element.style.outlineOffset="3px";
      window.parent.postMessage({type:"bazunk:theme-preview-select",field,section},window.location.origin);
    };
    document.addEventListener("click",choose,true);
    return()=>document.removeEventListener("click",choose,true);
  },[]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.primary_color);
    root.style.setProperty("--brand-secondary", settings.secondary_color);
    if (settings.seo_title) document.title = settings.seo_title;
  }, [settings.primary_color, settings.secondary_color, settings.seo_title]);

  // SEO metadata is edited through Design Center, but only replaces the
  // homepage's metadata. Product/listing pages retain their own SEO.
  useEffect(()=>{
    if(window.location.pathname!=="/")return;
    const ensure=(key:string,value:string,property=false)=>{
      const attr=property?"property":"name";
      let meta=document.head.querySelector<HTMLMetaElement>('meta['+attr+'="'+key+'"]');
      if(!meta){meta=document.createElement("meta");meta.setAttribute(attr,key);document.head.appendChild(meta);}
      meta.content=value;
    };
    document.title=settings.seo_title||DEFAULTS.seo_title;
    ensure("description",settings.seo_description||DEFAULTS.seo_description);
    ensure("og:title",settings.seo_title||DEFAULTS.seo_title,true);
    ensure("og:description",settings.seo_description||DEFAULTS.seo_description,true);
    const image=settings.seo_og_image_url;
    if(/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(image)){
      ensure("og:image",API_BASE+image,true);
    }else{
      const tag=document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      if(tag?.content.startsWith(API_BASE+"/api/site-media/"))tag.remove();
    }
  },[settings.seo_title,settings.seo_description,settings.seo_og_image_url]);

  // Theme Studio favicons are sourced from the authenticated media library
  // after publication, or inside the private preview iframe.
  useEffect(()=>{
    const asset=settings.site_favicon_url;
    const selector='link[data-bazunk-theme-favicon="true"]';
    let icon=document.head.querySelector<HTMLLinkElement>(selector);
    if(!asset||!/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(asset)){
      icon?.remove();return;
    }
    if(!icon){icon=document.createElement("link");icon.rel="icon";icon.dataset.bazunkThemeFavicon="true";document.head.appendChild(icon);}
    icon.href=API_BASE+asset;
    return()=>{icon?.remove()};
  },[settings.site_favicon_url]);

  useEffect(() => {
    const apply=()=>{
      const isAdmin=window.location.pathname.startsWith("/admin");
      const area:DesignArea=isAdmin?"admin":window.matchMedia("(max-width: 767px)").matches?"mobile":"storefront";
      const mode:DesignMode=document.documentElement.classList.contains("dark")?"dark":"light";
      const source:DesignArea=area==="mobile"&&rawSettings.design_mobile_inherit_web==="true"?"storefront":area;
      const p=parseDesignPalette(rawSettings[designSettingKey(source,mode)],source,mode);
      const root=document.documentElement;
      root.dataset.bzDesignArea=area;
      root.style.setProperty("--bz-protected-page",p.background);
      root.style.setProperty("--bz-protected-card",p.surface);
      root.style.setProperty("--bz-protected-text",p.text);
      root.style.setProperty("--bz-protected-secondary",p.secondaryText);
      root.style.setProperty("--bz-protected-field",p.field);
      root.style.setProperty("--bz-protected-button",p.action);
      root.style.setProperty("--bz-protected-button-text",p.actionText);
      const customized=Boolean(rawSettings[designSettingKey(source,mode)]);
      const remap:Record<string,string>={
        "--bz-surface-page":p.background,"--bz-surface-card":p.surface,
        "--bz-surface-raised":p.field,"--bz-surface-field":p.field,
        "--bz-text-primary":p.text,"--bz-text-secondary":p.secondaryText,
        "--bz-text-muted":p.secondaryText,"--bz-action-primary":p.action,
        "--bz-action-primary-text":p.actionText
      };
      for(const [key,value] of Object.entries(remap)){
        if(customized)root.style.setProperty(key,value);
        else root.style.removeProperty(key);
      }

    };
    apply();
    const observer=new MutationObserver(apply);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("resize",apply);
    window.addEventListener("popstate",apply);
    window.addEventListener("bazunk-design-route-change",apply);
    window.addEventListener("bazunk-settings-updated",apply);
    return ()=>{observer.disconnect();window.removeEventListener("resize",apply);window.removeEventListener("popstate",apply);window.removeEventListener("bazunk-design-route-change",apply);window.removeEventListener("bazunk-settings-updated",apply)};
  },[rawSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, rawSettings, settingsLoaded }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext).settings;
}

export function useRawSettings() {
  return useContext(SiteSettingsContext).rawSettings;
}

export function useSettingsLoaded() {
  return useContext(SiteSettingsContext).settingsLoaded;
}
