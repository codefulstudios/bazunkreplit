import { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\\/$/, "");
type Visibility = { hidden: string[]; display: Record<string,string> };
const ACTIVE: Visibility = { hidden: [], display: {} };

// Legacy promotional card slugs that represent the same departments.
const aliases: Record<string,string> = {
  "fashion":"clothing-shoes-jewelry",
  "gaming":"video-games",
  "home":"home-kitchen",
  "sports":"sports-outdoors",
  "health":"health-household",
  "beauty":"beauty-personal-care",
  "office":"office-products",
  "toys":"toys-games",
  "arts-crafts":"arts-crafts-sewing",
};
export function usePublicCategoryVisibility() {
  const [visibility, setVisibility] = useState<Visibility>(ACTIVE);
  const [ready,setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/category-visibility`,{cache:"no-store"});
      if (!response.ok) throw new Error("Category visibility unavailable");
      const data = await response.json();
      setVisibility({hidden:Array.isArray(data.hidden)?data.hidden:[],display:data.display||{}});
      setReady(true);
    } catch { setReady(false); }
  },[]);
  useEffect(()=>{
    void refresh();
    window.addEventListener("bazunk-settings-updated",refresh);
    window.addEventListener("focus",refresh);
    return ()=>{window.removeEventListener("bazunk-settings-updated",refresh);window.removeEventListener("focus",refresh);};
  },[refresh]);
  const isActive = (slug:string,sub?:string) => {
    if (!ready) return false; // do not briefly expose disabled categories while loading
    const parent = aliases[slug] || slug;
    const parentState = visibility.display[parent] || (visibility.hidden.includes(parent)?"coming_soon":"active");
    if (parentState !== "active") return false;
    if (!sub) return true;
    const key = parent+"__"+sub;
    return (visibility.display[key] || (visibility.hidden.includes(key)?"coming_soon":"active")) === "active";
  };
  return {isActive,ready,visibility,refresh};
}
