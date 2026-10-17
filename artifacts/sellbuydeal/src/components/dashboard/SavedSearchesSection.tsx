import { CATEGORIES } from "@/data/categories";
import { useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useMarketplaceRegion } from "@/hooks/useMarketplaceRegion";
import { Bell, BellOff, Search, Trash2, Plus, ArrowRight, RefreshCw, Pencil, Check, X } from "lucide-react";

type SavedSearch = {
  id:string; name:string; filters:Record<string,string>; alertEnabled:boolean;
  createdAt:string;lastCheckedAt:string|null;matchCount:number;newMatches:number;
};
export function SavedSearchesSection() {
  const { getToken }=useClerkAuth();
  const [,setRegion]=useMarketplaceRegion();
  const [items,setItems]=useState<SavedSearch[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [creating,setCreating]=useState(false);
  const [name,setName]=useState("");
  const [term,setTerm]=useState("");
  const [region,setNewRegion]=useState<"uk"|"us">("uk");
  const [category,setCategory]=useState("");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const [alertEnabled,setAlertEnabled]=useState(true);
  const [renaming,setRenaming]=useState("");
  const [renameValue,setRenameValue]=useState("");
  const request=useCallback(async(path:string,method="GET",body?:unknown)=>{
    const token=await getToken();
    if(!token)throw new Error("Sign in to manage saved searches");
    const r=await fetch("/api/saved-searches"+path,{
      method,headers:{"Authorization":`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||"Saved search request failed");
    return data;
  },[getToken]);
  const reload=useCallback(async()=>{
    const data=await request("");
    setItems(Array.isArray(data)?data:[]);
    setError("");
  },[request]);
  useEffect(()=>{
    let mounted=true;
    setLoading(true);
    void reload().catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Could not load saved searches");})
      .finally(()=>{if(mounted)setLoading(false);});
    return()=>{mounted=false;};
  },[reload]);
  async function change(id:string,patch:unknown){
    setBusy(id);setError("");
    try{await request("/"+encodeURIComponent(id),"PATCH",patch);await reload();}
    catch(e){setError(e instanceof Error?e.message:"Could not update saved search");}
    finally{setBusy("");}
  }
  async function remove(id:string){
    if(!window.confirm("Delete this saved search and its alerts?"))return;
    setBusy(id);setError("");
    try{await request("/"+encodeURIComponent(id),"DELETE");await reload();}
    catch(e){setError(e instanceof Error?e.message:"Could not delete saved search");}
    finally{setBusy("");}
  }
  async function create(){
    setBusy("create");setError("");
    try{
      await request("","POST",{name:name.trim()||term.trim()||"Saved search",
        filters:{region,q:term,categories:category,minPrice,maxPrice,sort:"newest"},alertEnabled});
      setCreating(false);setName("");setTerm("");setCategory("");setMinPrice("");setMaxPrice("");
      await reload();
    }catch(e){setError(e instanceof Error?e.message:"Could not save search");}
    finally{setBusy("");}
  }
  function run(search:SavedSearch){
    setRegion(search.filters.region==="us"?"us":"uk");
    const params=new URLSearchParams();
    Object.entries(search.filters).forEach(([key,value])=>{if(value&&key!=="sort")params.set(key,value);});
    params.set("sort",search.filters.sort||"newest");
    window.location.assign("/browse?"+params.toString());
  }
  const field="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 dark:border-blue-600 dark:bg-[#0b2342] dark:text-white";
  return <section className="rounded-2xl border border-blue-200 bg-white text-slate-950 shadow-lg dark:border-blue-600 dark:bg-[#0b2141] dark:text-white" data-testid="saved-searches-section">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 p-5 dark:border-blue-700">
      <div><h2 className="text-xl font-black">Saved Searches & Alerts</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-blue-100">{items.length} saved · {items.filter(s=>s.alertEnabled).length} alerts on</p>
      </div>
      <button type="button" onClick={()=>setCreating(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 font-black text-white hover:bg-orange-700">
        <Plus className="h-4 w-4"/>{creating?"Close form":"New saved search"}
      </button>
    </div>
    {error&&<p role="alert" className="m-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    {creating&&<form onSubmit={e=>{e.preventDefault();void create();}} className="grid gap-3 border-b border-blue-200 bg-blue-50 p-5 dark:border-blue-700 dark:bg-[#092447] sm:grid-cols-2">
      <label className="text-sm font-bold">Search name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} className={field} placeholder="e.g. Retro consoles"/></label>
      <label className="text-sm font-bold">Search terms<input value={term} maxLength={150} onChange={e=>setTerm(e.target.value)} className={field} placeholder="e.g. PlayStation"/></label>
      <label className="text-sm font-bold">Marketplace<select value={region} onChange={e=>setNewRegion(e.target.value as "uk"|"us")} className={field}><option value="uk">🇬🇧 United Kingdom</option><option value="us">🇺🇸 United States</option></select></label>
      <label className="text-sm font-bold">Category (optional)<select value={category} onChange={e=>setCategory(e.target.value)} className={field}>
        <option value="">All categories</option>{CATEGORIES.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select></label>
      <label className="text-sm font-bold">Minimum price<input type="number" min="0" step="0.01" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className={field}/></label>
      <label className="text-sm font-bold">Maximum price<input type="number" min="0" step="0.01" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className={field}/></label>
      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={alertEnabled} onChange={e=>setAlertEnabled(e.target.checked)} className="h-4 w-4"/>Alert me when new matching listings appear</label>
      <div className="sm:col-span-2"><button disabled={busy==="create"} type="submit" className="rounded-xl bg-orange-600 px-5 py-2.5 font-black text-white disabled:opacity-50">{busy==="create"?"Saving…":"Save search"}</button></div>
    </form>}
    {loading?<p className="p-8 text-center text-slate-700 dark:text-blue-100">Loading your searches…</p>:
     items.length===0?<div className="p-10 text-center"><Search className="mx-auto mb-3 h-9 w-9 text-blue-600"/><p className="font-black">No saved searches yet</p><p className="mt-2 text-sm text-slate-600 dark:text-blue-100">Save a search from Browse or create one here. Alerts show new matching listings in Notifications.</p></div>:
     <div className="divide-y divide-blue-100 dark:divide-blue-800">{items.map(s=><div key={s.id} className="flex flex-wrap items-start gap-3 p-4 hover:bg-blue-50/50 dark:hover:bg-[#10345b]">
       <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900"><Search className="h-5 w-5 text-blue-700 dark:text-blue-100"/></div>
       <div className="min-w-[180px] flex-1">
        {renaming===s.id?<form onSubmit={e=>{e.preventDefault();void change(s.id,{name:renameValue});setRenaming("");}} className="flex gap-2">
          <input maxLength={80} value={renameValue} onChange={e=>setRenameValue(e.target.value)} className={field} aria-label="Rename search"/>
          <button type="submit" aria-label="Save name"><Check className="h-5 w-5 text-emerald-600"/></button><button type="button" onClick={()=>setRenaming("")} aria-label="Cancel rename"><X className="h-5 w-5"/></button>
         </form>:<div className="flex items-center gap-2"><h3 className="font-black text-slate-950 dark:text-white">{s.name}</h3><button title="Rename search" aria-label={`Rename ${s.name}`} onClick={()=>{setRenaming(s.id);setRenameValue(s.name);}}><Pencil className="h-4 w-4 text-blue-700 dark:text-blue-200"/></button></div>}
        <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-blue-100">{s.filters.region==="us"?"🇺🇸 USA":"🇬🇧 UK"} · {s.filters.q||"All listings"}{s.filters.categories?" · "+s.filters.categories:""}</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-blue-100">{s.matchCount} current matches · {s.newMatches} new matches since alert activation</p>
       </div>
       <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy===s.id} type="button" onClick={()=>void change(s.id,{alertEnabled:!s.alertEnabled})} aria-label={s.alertEnabled?"Turn off alerts":"Turn on alerts"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-50 ${s.alertEnabled?"border-amber-400 bg-amber-100 text-amber-900":"border-slate-400 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-white"}`}>
          {s.alertEnabled?<Bell className="h-4 w-4"/>:<BellOff className="h-4 w-4"/>}{s.alertEnabled?"Alerts on":"Alerts off"}
        </button>
        <button onClick={()=>run(s)} className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">Browse <ArrowRight className="h-4 w-4"/></button>
        <button disabled={busy===s.id} onClick={()=>void remove(s.id)} aria-label={`Delete ${s.name}`} className="rounded-lg border border-red-300 p-2 text-red-700 hover:bg-red-50 dark:text-red-300"><Trash2 className="h-4 w-4"/></button>
       </div>
     </div>)}</div>}
    <p className="border-t border-blue-200 px-5 py-3 text-xs font-semibold text-slate-600 dark:border-blue-700 dark:text-blue-100">
      Matching-new-listing alerts appear in Dashboard → Notifications when you visit Bazunk. Alerts are not email or push notifications.
    </p>
  </section>;
}
