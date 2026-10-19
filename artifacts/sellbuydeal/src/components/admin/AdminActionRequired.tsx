import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ShieldAlert, CreditCard, RotateCcw, RefreshCw, ArrowRight, ClipboardList } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

type Item={id:string;title:string;detail:string;status:string;at:string;href:string};
type Queue={key:string;label:string;count:number|null;href:string;description:string;items:Item[];warning?:string};
type Payload={queues:Queue[];updatedAt:string;note:string};
const icons={refunds:RotateCcw,disputes:ShieldAlert,compliance:ClipboardList,payments:CreditCard};
export function AdminActionRequired(){
  const {authFetch}=useAdmin();
  const fetchRef=useRef(authFetch);fetchRef.current=authFetch;
  const [,navigate]=useLocation();
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const res=await fetchRef.current("/api/admin/action-required",{cache:"no-store"});
      const json=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(json.error||"Could not load admin action queues");
      if(!Array.isArray(json.queues))throw Error("Invalid action queue response");
      setData(json);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load actionable records");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();const onFocus=()=>{if(document.visibilityState==="visible")void refresh();};
    const timer=window.setInterval(onFocus,60000);window.addEventListener("focus",onFocus);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);};
  },[refresh]);
  return <section aria-label="Admin action required" className="space-y-4" data-testid="admin-action-required">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white"><AlertTriangle className="h-5 w-5 text-orange-600"/>Action required</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Unresolved refunds, disputes, seller compliance and payment failures from live records.</p></div>
      <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-orange-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 hover:bg-orange-50 disabled:opacity-60 dark:border-orange-600 dark:bg-slate-800 dark:text-white"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Refresh queues</button>
    </div>
    {error&&<p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-600 dark:bg-red-950 dark:text-red-100">{error} — older figures have not been presented as current.</p>}
    {loading&&!data&&<p role="status" className="rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-white">Checking admin queues and Stripe…</p>}
    {data&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data.queues.map(q=>{
        const Icon=icons[q.key as keyof typeof icons]||AlertTriangle;
        const open=!!expanded[q.key];
        return <div key={q.key} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-[#172541]">
          <button type="button" aria-expanded={open} aria-controls={`admin-review-${q.key}`}
            onClick={()=>setExpanded(prev=>({...prev,[q.key]:!prev[q.key]}))}
            className="w-full p-4 text-left hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 dark:hover:bg-[#22375b]">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl bg-orange-100 p-2.5 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"><Icon className="h-5 w-5"/></div>
              <span className={`rounded-full px-3 py-1 text-lg font-black tabular-nums ${q.count===null?"bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white":q.count>0?"bg-amber-100 text-amber-900 dark:!bg-[#ffd078] dark:!text-[#35200a]":"bg-emerald-100 text-emerald-900 dark:!bg-[#a7f3d0] dark:!text-[#052e24]"}`}>{q.count===null?"—":q.count}</span>
            </div>
            <h3 className="mt-3 font-black text-slate-950 dark:text-white">{q.label}</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{q.description}</p>
            <p className="mt-3 text-xs font-bold text-blue-700 dark:text-blue-200">{open?"Hide latest items":"View latest items"} ↓</p>
          </button>
          {q.warning&&<p className="mx-3 mb-3 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-950 dark:!bg-[#ffd078] dark:!text-[#35200a]">{q.warning}</p>}
          {open&&<div id={`admin-review-${q.key}`} className="border-t border-slate-200 p-3 dark:border-slate-700">
            {q.items.length?q.items.map(item=><button key={q.key+item.id} type="button" onClick={()=>navigate(item.href)}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-orange-50 dark:hover:bg-slate-700">
                <span className="block break-words text-xs font-black text-slate-950 dark:text-white">{item.title}</span>
                <span className="mt-0.5 block break-words text-xs font-medium text-slate-700 dark:text-slate-200">{item.detail}</span>
                <span className="mt-0.5 block text-xs font-semibold capitalize text-orange-700 dark:text-orange-200">{item.status.replaceAll("_"," ")}</span>
              </button>):<p className="px-2 py-3 text-sm font-semibold text-slate-600 dark:text-slate-200">{q.count===null?"Records could not be checked.":"No records currently need action."}</p>}
          </div>}
          <button type="button" onClick={()=>navigate(q.href)} className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm font-bold text-blue-800 hover:bg-blue-50 dark:border-slate-600 dark:text-blue-200 dark:hover:bg-slate-700">Open {q.key==="payments"?"payments":"review queue"}<ArrowRight className="h-4 w-4"/></button>
        </div>;
      })}
    </div>}
    {data&&<p className="text-xs font-medium text-slate-600 dark:text-slate-300">{data.note} Updated: {new Date(data.updatedAt).toLocaleString("en-GB")}.</p>}
  </section>;
}
