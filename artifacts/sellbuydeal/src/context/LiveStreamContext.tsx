import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { type LiveSession, type FeaturedItem, FEATURED_KEY } from "@/data/livestreams";
import { useFeature } from "@/components/FeatureGate";

interface LiveStreamContextValue {
  sessions: LiveSession[];
  liveSessions: LiveSession[];
  mySession: LiveSession | null;
  goLive: (session: Omit<LiveSession, "id" | "startedAt" | "viewerCount">) => Promise<LiveSession>;
  endSession: (id: string) => Promise<void>;
  featureProduct: (sessionId: string, productId: number, opts?: { discount?: number; stockAlert?: number; flashDeal?: boolean }) => void;
  clearFeatured: (sessionId: string) => void;
  getFeatured: (sessionId: string) => FeaturedItem | null;
}

const LiveStreamContext = createContext<LiveStreamContextValue | null>(null);

const STORAGE_KEY = "sbd_live_sessions_v1";
const MY_SESSION_KEY = "sbd_my_live_session_v1";

function loadSessions(): LiveSession[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

function loadMySession(): LiveSession | null {
  try { const s = localStorage.getItem(MY_SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function loadFeaturedMap(): Record<string, FeaturedItem> {
  try { const s = localStorage.getItem(FEATURED_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const liveEnabled = useFeature("live");
  const [userSessions, setUserSessions] = useState<LiveSession[]>(loadSessions);
  const [remoteSessions, setRemoteSessions] = useState<LiveSession[]>([]);
  const [mySession, setMySession] = useState<LiveSession | null>(loadMySession);
  const [featuredMap, setFeaturedMap] = useState<Record<string, FeaturedItem>>(loadFeaturedMap);
  const [serverFeatured, setServerFeatured] = useState<Record<string, FeaturedItem>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSessions));
  }, [userSessions]);

  useEffect(() => {
    if (mySession) {
      localStorage.setItem(MY_SESSION_KEY, JSON.stringify(mySession));
    } else {
      localStorage.removeItem(MY_SESSION_KEY);
    }
  }, [mySession]);

  useEffect(() => {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredMap));
  }, [featuredMap]);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === FEATURED_KEY && e.newValue) {
        try { setFeaturedMap(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setUserSessions(JSON.parse(e.newValue)); } catch {}
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);


  useEffect(() => {
    if (!liveEnabled) { setRemoteSessions([]); return; }
    let cancelled = false;
    const load = () => fetch("/api/live/sessions").then(r => r.ok ? r.json() : null).then(d => { if (!cancelled && Array.isArray(d?.sessions)) setRemoteSessions(d.sessions); }).catch(() => {});
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [liveEnabled]);

  // The server is authoritative for active streams. Never advertise mock or stale
  // browser-local sessions as live to other buyers.
  const remoteIds = new Set(remoteSessions.map(s => s.id));
  const sessions: LiveSession[] = liveEnabled ? [
    ...remoteSessions,
    ...userSessions.filter(s => !s.isLive && !remoteIds.has(s.id)),
  ] : [];

  // Poll the shared spotlight for all active sessions. Local state is only
  // an immediate seller preview; buyers use the server's persisted selection.
  useEffect(() => {
    if (!liveEnabled) { setServerFeatured({}); return; }
    let cancelled = false;
    const refresh = async () => {
      const active = remoteSessions.filter(s => s.isLive).slice(0, 30);
      const entries = await Promise.all(active.map(async s => {
        try {
          const r = await fetch(`/api/live/session/${encodeURIComponent(s.id)}/featured`);
          if (!r.ok) return [s.id, null] as const;
          const d = await r.json();
          const f = d.featured;
          return [s.id, f ? {productId:Number(f.productId),featuredAt:new Date(f.featuredAt).getTime()} as FeaturedItem : null] as const;
        } catch { return [s.id, null] as const; }
      }));
      if (!cancelled) {
        const next:Record<string,FeaturedItem> = {};
        for (const [id,featured] of entries) if(featured) next[id]=featured;
        setServerFeatured(next);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [liveEnabled, remoteSessions.map(s=>s.id).join(",")]);

  const liveSessions = sessions.filter((s) => s.isLive);

  async function goLive(data: Omit<LiveSession, "id" | "startedAt" | "viewerCount">): Promise<LiveSession> {
    if (!liveEnabled) throw new Error("Live streaming is currently unavailable.");
    const session: LiveSession = {
      ...data,
      id: `live_user_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      startedAt: new Date().toISOString(),
      viewerCount: 0,
    };
    // Do not publish local state until the server confirms persistence.
    const token = await getToken();
    if (!token) throw new Error("Please sign in before starting a live stream.");
    let response: Response;
    try {
      response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(session),
      });
    } catch {
      throw new Error("Could not reach the live streaming server. Check your connection and try again.");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      throw new Error(typeof result?.error === "string" ? result.error : "The live session could not be registered. Please try again.");
    }
    setUserSessions(prev => [session, ...prev.filter(s => s.sellerId !== data.sellerId)]);
    setMySession(session);
    setRemoteSessions(prev => [session, ...prev.filter(s => s.id !== session.id && s.sellerId !== data.sellerId)]);
    return session;
  }

  async function endSession(id: string): Promise<void> {
    const token = await getToken();
    if (!token) throw new Error("Please sign in to end your broadcast.");
    let response: Response;
    try {
      response = await fetch(`/api/live/session/${encodeURIComponent(id)}/end`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Could not reach the server to end your stream. It may still be live; please retry.");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      // A timed-out earlier request may already have ended the stream.
      // Only treat that as success after independently verifying server state.
      if (response.status === 404) {
        try {
          const check = await fetch(`/api/live/session/${encodeURIComponent(id)}`, {cache:"no-store"});
          if (check.ok && (await check.json())?.isLive === false) {
            setUserSessions(prev => prev.map(s => s.id === id ? {...s,isLive:false} : s));
            setRemoteSessions(prev => prev.filter(s => s.id !== id));
            setMySession(prev => prev?.id === id ? null : prev);
            return;
          }
        } catch {}
      }
      throw new Error(typeof result?.error === "string" ? result.error : "Could not confirm the broadcast ended. Please retry.");
    }
    setUserSessions(prev => prev.map(s => s.id === id ? {...s,isLive:false} : s));
    setRemoteSessions(prev => prev.filter(s => s.id !== id));
    setMySession(prev => prev?.id === id ? null : prev);
    setFeaturedMap(prev => {const next={...prev};delete next[id];return next;});
  }

  function featureProduct(
    sessionId: string,
    productId: number,
    opts?: { discount?: number; stockAlert?: number; flashDeal?: boolean }
  ) {
    setFeaturedMap((prev) => ({
      ...prev,
      [sessionId]: { productId, ...opts, featuredAt: Date.now() },
    }));
    void getToken().then(async token => {
      const r = await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/featured`, {
        method:"PUT",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({productId}),
      });
      if(!r.ok) console.error("Could not persist featured live product", await r.text());
    }).catch(err=>console.error("Could not persist featured live product",err));
  }

  function clearFeatured(sessionId: string) {
    setFeaturedMap((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
    void getToken().then(token=>fetch(`/api/live/session/${encodeURIComponent(sessionId)}/featured`,{method:"DELETE",headers:token?{Authorization:`Bearer ${token}`}:{}})).catch(console.error);
  }

  function getFeatured(sessionId: string): FeaturedItem | null {
    return serverFeatured[sessionId] ?? (mySession?.id===sessionId ? featuredMap[sessionId] ?? null : null);
  }

  return (
    <LiveStreamContext.Provider value={{
      sessions, liveSessions, mySession,
      goLive, endSession,
      featureProduct, clearFeatured, getFeatured,
    }}>
      {children}
    </LiveStreamContext.Provider>
  );
}

export function useLiveStream() {
  const ctx = useContext(LiveStreamContext);
  if (!ctx) throw new Error("useLiveStream must be used inside LiveStreamProvider");
  return ctx;
}
