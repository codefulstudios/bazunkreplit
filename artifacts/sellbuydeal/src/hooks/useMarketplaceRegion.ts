import { useEffect, useState } from "react";

export type MarketplaceRegion = "uk" | "us";
export const MARKETPLACE_REGION_STORAGE_KEY = "bazunk-market-region";
export const MARKETPLACE_REGION_EVENT = "bazunk:market-region";

export function getMarketplaceRegion(): MarketplaceRegion {
  if (typeof window === "undefined") return "uk";
  try {
    return window.localStorage.getItem(MARKETPLACE_REGION_STORAGE_KEY) === "us" ? "us" : "uk";
  } catch {
    return "uk";
  }
}

export function setMarketplaceRegion(region: MarketplaceRegion): void {
  try { window.localStorage.setItem(MARKETPLACE_REGION_STORAGE_KEY, region); } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(MARKETPLACE_REGION_EVENT, { detail: region }));
}

export function useMarketplaceRegion(): [MarketplaceRegion, (region: MarketplaceRegion) => void] {
  const [region, setRegion] = useState<MarketplaceRegion>(getMarketplaceRegion);
  useEffect(() => {
    const onChange = () => setRegion(getMarketplaceRegion());
    const onRegion = (event: Event) => {
      const selected = (event as CustomEvent<MarketplaceRegion>).detail;
      setRegion(selected === "us" ? "us" : "uk");
    };
    window.addEventListener("storage", onChange);
    window.addEventListener(MARKETPLACE_REGION_EVENT, onRegion);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(MARKETPLACE_REGION_EVENT, onRegion);
    };
  }, []);
  return [region, setMarketplaceRegion];
}
