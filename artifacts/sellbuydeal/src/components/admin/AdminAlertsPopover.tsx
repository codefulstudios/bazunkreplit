import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell, RefreshCw, AlertTriangle } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

type Workload={id:string;label:string;href:string;count:number};
type Recent={id:string;type:string;title:string;time:string;href:string};
type Response={counts:Workload[];total:number;recent:Recent[];refreshedAt:string};
export function AdminAlertsPopover({mobile=false}:{mobile?:boolean}){
  const {authFetch,isAdmin}=useAdmin();
  const ref=useRef(authFetch);ref.current=authFetch;
  const [,go]=useLocation();
  const [open,setOpen]=useState(false);
  const [payload,setPayload]=useState<Response|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const container=useRef<HTMLDivElement|null>(null);
  const load=useCallback(async()=>{
    if(!isAdmin)return;
    setLoading(true);
    try{
      const res=await ref.current("/api/admin/alerts");
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(data.error||"Admin alerts unavailable");
      setPayload(data);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load alerts");}
    finally{setLoading(false);}
  },[isAdmin]);
  useEffect(()=>{
    void load();
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},60000);
    const focus=()=>{if(document.visibilityState==="visible")void load();};
    window.addEventListener("focus",focus);
    return()=>{window.clearInterval(interval);window.removeEventListener("focus",focus);};
  },[load]);
  useEffect(()=>{
    const close=(e:PointerEvent)=>{if(e.target instanceof Node&&!container.current?.contains(e.target))setOpen(false);};
    document.addEventListener("pointerdown",close);
    return()=>document.removeEventListener("pointerdown",close);
  },[]);
  function navigate(href:string){setOpen(false);go(href);}
  const total=payload?.total??0;
  return <div ref={container} className="relative">
    <button type="button" onClick={()=>{setOpen(x=>!x);if(!open)void load();}} aria-label={`Admin alerts, ${total} open items`} aria-expanded={open}
      aria-controls={mobile?"admin-mobile-alert-panel":"admin-desktop-alert-panel"}
      title="Live admin workload and alerts"
      className="relative flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-slate-950 hover:bg-orange-50 dark:border-slate-600 dark:bg-[#20304f] dark:text-white">
      <Bell className="h-5 w-5"/>
      {total>0&&<span className="rounded-full bg-red-700 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{total>99?"99+":total}</span>}
      {mobile&&<span className="text-sm font-bold">Alerts</span>}
    </button>
    {open&&<div id={mobile?"admin-mobile-alert-panel":"admin-desktop-alert-panel"} className={`admin-header-popover absolute top-12 z-[70] w-[min(88vw,390px)] overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-600 dark:bg-[#172541] dark:text-white ${mobile?"right-0":"right-0"}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-600">
        <div><h2 className="text-sm font-black">Admin alerts</h2><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{total} open items requiring review · live counts</p></div>
        <button type="button" onClick={()=>void load()} disabled={loading} aria-label="Refresh live alerts" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/></button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto p-3">
        {error&&<p role="alert" className="mb-2 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-100"><AlertTriangle className="mr-1 inline h-4 w-4"/>{error}</p>}
        {!payload&&loading&&<p role="status" className="p-4 text-sm font-semibold">Loading real admin records…</p>}
        {payload&&<>
          {payload.counts.map(c=><button type="button" key={c.id} onClick={()=>navigate(c.href)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-orange-50 dark:hover:bg-slate-700">
            <span className="text-sm font-semibold">{c.label}</span>
            <span className={`min-w-8 rounded-lg px-2 py-1 text-center text-sm font-black ${c.count>0?"bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-white":"bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"}`}>{c.count}</span>
          </button>)}
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
            <p className="px-3 pb-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200">Recent actionable events</p>
            {payload.recent.length?payload.recent.map(e=><button type="button" key={e.type+e.id} onClick={()=>navigate(e.href)}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-slate-700">
              <span className="block truncate text-sm font-bold">{e.title}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-300">{e.time?new Date(e.time).toLocaleString("en-GB"):""}</span>
            </button>):<p className="px-3 py-3 text-sm text-slate-600 dark:text-slate-200">No open events currently need attention.</p>}
          </div>
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-300">Counts reflect open records, not unread notifications. Automatically refreshed each minute.</p>
        </>}
      </div>
    </div>}
  </div>;
}
