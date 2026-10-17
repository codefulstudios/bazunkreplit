import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";

export type DashboardActivity = {
  id: string; title: string; desc: string; time: string; type: "order" | "sale"; unread: boolean;
};
type Order = { id:string; item_title?:string; status?:string; created_at?:string; buyer_name?:string };
export function useDashboardActivity(email?: string) {
  const { getToken } = useClerkAuth();
  const [events,setEvents] = useState<DashboardActivity[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const [readIds,setReadIds] = useState<string[]>([]);
  useEffect(() => {
    if (!email) {setEvents([]);return;}
    const key=`bazunk-notifications-read-${email.toLowerCase()}`;
    try {setReadIds(JSON.parse(localStorage.getItem(key)||"[]"));}catch{setReadIds([]);}
  },[email]);
  useEffect(()=>{
    if(!email)return;
    let cancelled=false;
    async function load(){
      setLoading(true);
      try {
        const token=await getToken();
        if(!token)throw new Error("Sign in to view notifications");
        const headers={Authorization:`Bearer ${token}`};
        const results=await Promise.all([
          fetch("/api/orders",{headers,cache:"no-store"}),
          fetch("/api/orders/seller",{headers,cache:"no-store"})
        ]);
        if(results.some(r=>!r.ok))throw new Error("Could not load marketplace activity");
        const [purchases,sales]=await Promise.all(results.map(r=>r.json())) as [Order[],Order[]];
        const make=(o:Order,type:"order"|"sale"):DashboardActivity=>({
          id:`${type}:${o.id}:${o.status||"new"}`,
          title:type==="order"?"Order update":"Sale update",
          desc:`${o.item_title||"Item"} — ${o.status||"new"}`,
          time:o.created_at||"",
          type,unread:true
        });
        const activity=[
          ...(Array.isArray(purchases)?purchases.map(o=>make(o,"order")):[]),
          ...(Array.isArray(sales)?sales.map(o=>make(o,"sale")):[])
        ].sort((a,b)=>Date.parse(b.time||"")-Date.parse(a.time||"")).slice(0,60);
        if(!cancelled){setEvents(activity);setError("");}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load activity");}
      finally{if(!cancelled)setLoading(false);}
    }
    void load();
    const onFocus=()=>{void load();};
    window.addEventListener("focus",onFocus);
    return()=>{cancelled=true;window.removeEventListener("focus",onFocus);};
  },[email,getToken]);
  const seen = new Set(readIds);
  const notifications=events.map(x=>({...x,unread:!seen.has(x.id)}));
  const markRead=(ids:string[])=>{
    if(!email)return;
    setReadIds(prev=>{
      const next=[...new Set([...prev,...ids])].slice(-500);
      try{localStorage.setItem(`bazunk-notifications-read-${email.toLowerCase()}`,JSON.stringify(next));}catch{}
      return next;
    });
  };
  return {notifications,loading,error,markRead};
}
