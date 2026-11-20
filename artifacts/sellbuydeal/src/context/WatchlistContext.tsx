import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Product } from "@/data/products";
import { useUser, useAuth } from "@clerk/react";

export interface WatchlistItem {
  product: Product;
  addedAt: string;
  priceAtAdd: number;
  alertEnabled: boolean;
}

interface WatchlistContextValue {
  items: WatchlistItem[];
  addToWatchlist: (product: Product) => void;
  removeFromWatchlist: (id: number) => void;
  toggleAlert: (id: number) => void;
  isWatched: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// Never simulate price drops with hard-coded data. Real events come from the API.
export function getCurrentPrice(product: Product): number { return Number(product.price)||0; }

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const userId = clerkUser?.id ?? null;
  const storageKey = userId ? `sbd_watchlist_${userId}` : null;

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      setLoadedKey(null);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      setItems(stored ? JSON.parse(stored) : []);
    } catch {
      setItems([]);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!loadedKey) return;
    localStorage.setItem(loadedKey, JSON.stringify(items));
  }, [items, loadedKey]);

  function addToWatchlist(product: Product) {
    void getToken().then(token => token ? fetch(`/api/listings/${product.id}/watch`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }) : null).catch(() => null);
    setItems((prev) => {
      if (prev.some((i) => i.product.id === product.id)) return prev;
      return [
        ...prev,
        {
          product,
          addedAt: new Date().toISOString(),
          priceAtAdd: product.price,
          alertEnabled: true,
        },
      ];
    });
  }

  function removeFromWatchlist(id: number) {
    void getToken().then(token => token ? fetch(`/api/listings/${id}/watch`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }) : null).catch(() => null);
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  }

  function toggleAlert(id: number) {
    const item=items.find(i=>i.product.id===id);
    if(item){
      void getToken().then(async token=>{
        if(!token)return;
        const r=await fetch("/api/watch-alerts/"+id,{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
         body:JSON.stringify({priceDrop:!item.alertEnabled,restock:!item.alertEnabled})});
        if(!r.ok)console.warn("Watch preference was not saved; retry from the Watch Alerts panel.");
      }).catch(()=>console.warn("Watch preference could not sync"));
    }
    setItems((prev) =>
      prev.map((i) => i.product.id === id ? { ...i, alertEnabled: !i.alertEnabled } : i)
    );
  }

  function isWatched(id: number) {
    return items.some((i) => i.product.id === id);
  }

  return (
    <WatchlistContext.Provider value={{ items, addToWatchlist, removeFromWatchlist, toggleAlert, isWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
}
