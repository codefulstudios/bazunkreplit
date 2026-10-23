import {useCallback,useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
type Status={used:number;remaining:number;limit:number;configured:boolean};
export function OLXAdminImporter(){
 const {authFetch}=useAdmin();
 const [status,setStatus]=useState<Status|null>(null);
 const [q,setQ]=useState("");
 const [city,setCity]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [items,setItems]=useState<any[]>([]);
 const load=useCallback(async()=>{try{const r=await authFetch("/api/admin/olx/status");if(r.ok)setStatus(await r.json());}catch{}},[authFetch]);
 useEffect(()=>{void load()},[load]);
 async function search(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setItems([]);
  try{const p=new URLSearchParams({q,city});const r=await authFetch("/api/admin/olx/search?"+p);const d=await r.json();
   if(!r.ok)throw Error(d.error||"Search failed");
   const data=d.data;const found=Array.isArray(data)?data:Array.isArray(data?.results)?data.results:Array.isArray(data?.listings)?data.listings:Array.isArray(data?.data)?data.data:[];
   setItems(found);if(!found.length)setError("The API responded but returned no recognised listing array. Check provider response mapping.");
  }catch(e){setError(e instanceof Error?e.message:"Search failed")}finally{setBusy(false);void load()}
 }
 return <section className="rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-5 mb-6 space-y-4 text-slate-900 dark:text-white">
  <div><h2 className="text-xl font-bold">OLX importer · Admin</h2><p className="text-sm">Search OLX via your server-side RapidAPI subscription. Preview records before any listing transfer.</p></div>
  <p className="text-sm font-semibold">Monthly RapidAPI safety cap: {status?status.used+" / "+status.limit+" requests used · "+status.remaining+" remaining":"Checking usage…"}</p>
  {!status?.configured&&<p className="text-sm text-amber-800 dark:text-amber-200">Setup required: subscribe to the OLX API and configure OLX_RAPIDAPI_HOST and OLX_RAPIDAPI_SEARCH_URL on the API service. Uses the existing server RAPIDAPI_KEY.</p>}
  <form onSubmit={search} className="flex flex-wrap gap-2"><input aria-label="Search OLX" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search keyword" className="rounded-lg border border-slate-400 bg-white text-slate-950 p-2 flex-1 min-w-40"/><input aria-label="OLX city" value={city} onChange={e=>setCity(e.target.value)} placeholder="City (optional)" className="rounded-lg border border-slate-400 bg-white text-slate-950 p-2"/><button className="bg-orange-600 text-white rounded-lg px-5 py-2 font-bold disabled:opacity-50" disabled={busy||!q.trim()||!status?.remaining||!status?.configured}>{busy?"Searching…":"Search (1 request)"}</button></form>
  {error&&<p role="alert" className="text-red-700 dark:text-red-300 text-sm">{error}</p>}
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{items.map((x,i)=><article key={String(x.id||x.url||i)} className="p-3 border rounded-xl border-slate-300 dark:border-slate-600 space-y-2">
   <strong>{String(x.title||x.name||"Untitled listing")}</strong><p className="text-sm">{String(x.price||"Price not provided")} · {String(x.location||x.city||"Location not specified")}</p>{typeof x.url==="string"&&/^https:\/\//.test(x.url)&&<a target="_blank" rel="noreferrer" href={x.url} className="text-orange-700 dark:text-orange-300 underline">View original listing</a>}
  </article>)}</div>
  <p className="text-xs">Read-only preview. Republishing another person's advert requires permission. No automatic listing creation or synchronisation is enabled.</p>
 </section>
}
