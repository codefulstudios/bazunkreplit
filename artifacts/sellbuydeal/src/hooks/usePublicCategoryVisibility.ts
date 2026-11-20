import { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://bazunk-api.onrender.com").replace(/\/$/, "");
type Visibility = { hidden: string[]; display: Record<string,string> };
const EMPTY: Visibility = { hidden: [], display: {} };

const aliases: Record<string,string> = {
  fashion:"clothing-shoes-jewelry", gaming:"video-games", home:"home-kitchen",
  sports:"sports-outdoors", health:"health-household", beauty:"beauty-personal-care",
  office:"office-products", toys:"toys-games", "arts-crafts":"arts-crafts-sewing",
};

export function usePublicCategoryVisibility() {
  const [visibility,setVisibility] = useState<Visibility>(EMPTY);
  const [ready,setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      // Read both the public visibility endpoint and the canonical taxonomy
      // overrides. The latter is the source saved by Admin > Categories.
      const [settingsResponse,overridesResponse] = await Promise.all([
        fetch(`${API_BASE}/api/settings/category-visibility`,{cache:"no-store"}),
        fetch(`${API_BASE}/api/taxonomy/category-overrides`,{cache:"no-store"}),
      ]);
      if (!settingsResponse.ok || !overridesResponse.ok) throw new Error("Category visibility unavailable");
      const [settings,overrides] = await Promise.all([settingsResponse.json(),overridesResponse.json()]);
      const hidden = new Set<string>(Array.isArray(settings.hidden)?settings.hidden:[]);
      const display: Record<string,string> = {...(settings.display||{})};
      for (const item of (overrides.overrides||[])) {
        const slug = String(item.category_slug||"");
        const sub = String(item.subcategory_slug||"");
        if (!slug) continue;
        const key = slug+(sub?"__"+sub:"");
        if (item.visible === false) { hidden.add(key); display[key]="hidden"; }
        else if (item.visible === true && !display[key]) display[key]="active";
      }
      setVisibility({hidden:[...hidden],display});
      setReady(true);
    } catch {
      // Fail closed: never briefly show a category whose status could not be read.
      setVisibility(EMPTY);
      setReady(false);
    }
  },[]);
  useEffect(()=>{
    void refresh();
    window.addEventListener("bazunk-settings-updated",refresh);
    window.addEventListener("focus",refresh);
    return ()=>{window.removeEventListener("bazunk-settings-updated",refresh);window.removeEventListener("focus",refresh);};
  },[refresh]);
  const isActive = (slug:string,sub?:string) => {
    if (!ready) return false;
    const parent = aliases[slug] || slug;
    const parentState = visibility.display[parent] || (visibility.hidden.includes(parent)?"hidden":"active");
    if (parentState !== "active") return false;
    if (!sub) return true;
    const key = parent+"__"+sub;
    return (visibility.display[key] || (visibility.hidden.includes(key)?"hidden":"active")) === "active";
  };
  return {isActive,ready,visibility,refresh};
}
