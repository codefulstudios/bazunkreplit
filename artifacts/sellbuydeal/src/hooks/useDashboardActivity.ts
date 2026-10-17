import { useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";

export type DashboardActivity = {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "order" | "sale" | "offer" | "bid" | "message";
  href: string;
  unread: boolean;
};

export function useDashboardActivity(email?: string) {
  const { getToken } = useClerkAuth();
  const [notifications, setNotifications] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!email) { setNotifications([]); return; }
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in to view your notifications");
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Notifications are unavailable");
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
    }
  }, [email, getToken]);

  useEffect(() => {
    if (!email) { setNotifications([]); return; }
    let active = true;
    setLoading(true);
    void refresh().finally(() => { if (active) setLoading(false); });
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onFocus);
    const interval = window.setInterval(() => {
      if(document.visibilityState === "visible") void refresh();
    },60000);
    return () => {
      active = false;
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onFocus);
      window.clearInterval(interval);
    };
  }, [email,refresh]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length || !email) return;
    const unique = [...new Set(ids)].slice(0, 100);
    setNotifications(prev => prev.map(n => unique.includes(n.id) ? {...n,unread:false} : n));
    try {
      const token=await getToken();
      if(!token)throw new Error("Sign in required");
      const response=await fetch("/api/notifications/read",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({ids:unique})
      });
      if(!response.ok)throw new Error("Could not save read status");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as read");
      void refresh();
    }
  },[email,getToken,refresh]);

  return {notifications,loading,error,markRead,refresh};
}
