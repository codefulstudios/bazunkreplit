import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, Loader2, X } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

type Result={id:string;title:string;subtitle:string;href:string};
type SearchGroup={kind:string;label:string;results:Result[]};
type Payload={groups:SearchGroup[];total:number;query:string};

export function AdminGlobalSearch({compact=false}:{compact?:boolean}){
  const {authFetch,isAdmin}=useAdmin();
  const requestRef=useRef(authFetch);requestRef.current=authFetch;
  const [,go]=useLocation();
  const [query,setQuery]=useState("");
  const [payload,setPayload]=useState<Payload|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [expanded,setExpanded]=useState(false);
  const container=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const onOutside=(e:PointerEvent)=>{if(e.target instanceof Node&&!container.current?.contains(e.target))setExpanded(false);};
    document.addEventListener("pointerdown",onOutside);
    return()=>document.removeEventListener("pointerdown",onOutside);
  },[]);
  useEffect(()=>{
    if(!isAdmin||query.trim().length<2){setPayload(null);setError("");setLoading(false);return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const response=await requestRef.current("/api/admin/global-search?q="+encodeURIComponent(query.trim()),{signal:controller.signal});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(data.error||"Admin search failed");
        if(!controller.signal.aborted)setPayload(data);
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Search is unavailable");}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },300);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,isAdmin]);
  const items=payload?.groups.flatMap(g=>g.results)||[];
  function choose(result:Result){go(result.href);setExpanded(false);setQuery("");setPayload(null);}
  return <div ref={container} className={`relative w-full ${compact?"":"max-w-lg"}`}>
    <form role="search" onSubmit={e=>{e.preventDefault();if(items[0])choose(items[0]);else setExpanded(true);}} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-300"/>
      <input
        value={query} onChange={e=>{setQuery(e.target.value);setExpanded(true);}}
        onFocus={()=>setExpanded(true)} onKeyDown={e=>{if(e.key==="Escape")setExpanded(false);}}
        aria-label="Search users, listings, orders, payments and cases"
        aria-expanded={expanded && query.trim().length>=2} aria-controls="admin-global-search-results"
        placeholder={compact?"Search admin records…":"Search users, listings, orders, payments, cases…"}
        className="h-11 w-full rounded-xl border-2 border-slate-300 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-600 focus:border-orange-500 dark:border-slate-600 dark:bg-[#20304f] dark:text-white dark:placeholder:text-slate-300"
        autoComplete="off"/>
      {query&&<button type="button" onClick={()=>{setQuery("");setPayload(null);setExpanded(false);}} aria-label="Clear admin search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-600 dark:text-white"><X className="h-4 w-4"/></button>}
    </form>
    {expanded&&query.trim().length>=2&&<div id="admin-global-search-results" role="region" aria-label="Admin search results" className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-[65vh] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-3 text-slate-950 shadow-2xl dark:border-slate-600 dark:bg-[#172541] dark:text-white">
      {loading&&<p role="status" className="flex items-center gap-2 px-2 py-3 text-sm font-semibold"><Loader2 className="h-4 w-4 animate-spin"/>Searching account records…</p>}
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
      {!loading&&!error&&payload?.total===0&&<p className="px-2 py-4 text-sm font-semibold text-slate-600 dark:text-slate-200">No matching users, listings, orders, payments or cases.</p>}
      {!loading&&!error&&payload?.groups.filter(g=>g.results.length).map(g=><section key={g.kind} className="mb-2">
        <h3 className="sticky top-0 bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-800 dark:bg-[#273c61] dark:text-blue-100">{g.label} ({g.results.length})</h3>
        {g.results.map(item=><button type="button" key={g.kind+item.id} onClick={()=>choose(item)}
          className="w-full rounded-lg border-b border-slate-100 px-3 py-2 text-left hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 dark:border-slate-700 dark:hover:bg-slate-700">
          <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">{item.title}</span>
          <span className="block truncate text-xs font-medium text-slate-600 dark:text-slate-200">{item.subtitle}</span>
        </button>)}
      </section>)}
      <p className="mt-2 px-2 text-xs text-slate-500 dark:text-slate-300">Choose a result to open its admin section. Up to 8 matches per main category.</p>
    </div>}
  </div>;
}
