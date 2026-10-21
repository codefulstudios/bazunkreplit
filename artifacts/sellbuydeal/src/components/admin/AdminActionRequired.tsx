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
    {data&&<div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#34435b] dark:bg-[#15243b]" data-testid="admin-action-compact-panel">
      <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-[#34435b] md:grid-cols-2 xl:grid-cols-4 xl:divide-y-0 xl:divide-x">
        {data.queues.map(q=>{
          const Icon=icons[q.key as keyof typeof icons]||AlertTriangle;
          const open=!!expanded[q.key];
          return <div key={q.key} className="min-w-0">
            <div className="flex min-h-[98px] items-start gap-3 p-4">
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-[#243c5b] dark:text-blue-200"><Icon className="h-4 w-4"/></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{q.label}</h3>
                  <span className={`min-w-7 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-extrabold tabular-nums ${q.count===null?"bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white":q.count>0?"bg-amber-100 text-amber-900 dark:bg-amber-300 dark:text-amber-950":"bg-emerald-100 text-emerald-900 dark:bg-emerald-300 dark:text-emerald-950"}`}>{q.count===null?"—":q.count}</span>
                </div>
                <p className="mt-1 text-xs font-medium leading-4 text-slate-600 dark:text-slate-300">{q.count===0?"No actions currently pending":q.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" aria-expanded={open} aria-controls={`admin-review-${q.key}`} onClick={()=>setExpanded(prev=>({...prev,[q.key]:!prev[q.key]}))} className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-200">{open?"Hide details":"View details"}</button>
                  <button type="button" onClick={()=>navigate(q.href)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline dark:text-blue-200">Open queue<ArrowRight className="h-3 w-3"/></button>
                </div>
              </div>
            </div>
            {q.warning&&<p role="note" className="mx-3 mb-3 rounded-lg bg-amber-100 p-2 text-xs font-bold text-amber-950 dark:bg-[#ffd078] dark:text-[#35200a]">{q.warning}</p>}
            {open&&<div id={`admin-review-${q.key}`} className="border-t border-slate-200 p-3 dark:border-[#34435b]">
              {q.items.length?q.items.map(item=><button key={q.key+item.id} type="button" onClick={()=>navigate(item.href)} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-blue-50 dark:hover:bg-[#213b5a]">
                <span className="block break-words text-xs font-bold text-slate-950 dark:text-white">{item.title}</span>
                <span className="mt-1 block break-words text-xs font-medium text-slate-700 dark:text-slate-200">{item.detail}</span>
                <span className="mt-1 block text-xs font-bold capitalize text-orange-800 dark:text-orange-200">{item.status.replaceAll("_"," ")}</span>
              </button>):<p className="py-2 text-xs font-medium text-slate-600 dark:text-slate-300">{q.count===null?"Records could not be checked.":"No records currently need action."}</p>}
            </div>}
          </div>;
        })}
      </div>
    </div>}
    {data&&<p className="text-xs font-medium text-slate-600 dark:text-slate-300">{data.note} Updated: {new Date(data.updatedAt).toLocaleString("en-GB")}.</p>}
  </section>;
}
