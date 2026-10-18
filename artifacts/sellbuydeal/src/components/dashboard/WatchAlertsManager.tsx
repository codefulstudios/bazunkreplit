import { useCallback,useEffect,useState } from "react";
import {useAuth as useClerkAuth} from "@clerk/react";
import {Link} from "wouter";
import {Bell,BellOff,RefreshCw,TrendingDown,PackageCheck} from "lucide-react";
type Item={id:number;public_id:string|null;title:string;price:string;currency:string;status:string;price_drop:boolean;restock:boolean};
export function WatchAlertsManager(){
 const {getToken,isSignedIn}=useClerkAuth();
 const [items,setItems]=useState<Item[]>([]),[busy,setBusy]=useState(""),[error,setError]=useState(""),[loaded,setLoaded]=useState(false);
 const query=useCallback(async(path:string,init?:RequestInit)=>{
  const token=await getToken();if(!token)throw Error("Sign in to manage watched-item alerts.");
  const r=await fetch("/api/watch-alerts"+path,{...init,headers:{Authorization:`Bearer ${token}`,...(init?.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Watch alerts unavailable");
  return data;
 },[getToken]);
 const refresh=useCallback(async()=>{
  try{const data=await query("");setItems(data.items||[]);setLoaded(true);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Unable to load alert preferences");}
 },[query]);
 useEffect(()=>{if(isSignedIn)void refresh();},[isSignedIn,refresh]);
 async function change(item:Item,field:"price_drop"|"restock"){
  setBusy(item.id+":"+field);setError("");
  const next={...item,[field]:!item[field]};
  try{await query("/"+item.id,{method:"PATCH",body:JSON.stringify({priceDrop:next.price_drop,restock:next.restock})});
   setItems(items=>items.map(x=>x.id===item.id?next:x));}
  catch(e){setError(e instanceof Error?e.message:"Could not save preferences");}
  finally{setBusy("");}
 }
 if(!isSignedIn)return null;
 return <section className="mt-5 rounded-2xl border border-orange-200 bg-white p-5 text-slate-900 shadow-sm dark:border-orange-700 dark:bg-[#102541] dark:text-white" data-testid="watch-alerts-manager">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-lg font-black"><Bell className="h-5 w-5 text-orange-600"/>Price-drop & restock alerts</h2>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Stored on your account and synced between devices. Events appear in your Dashboard Notifications.</p></div>
    <button type="button" disabled={!!busy} onClick={()=>void refresh()} className="flex items-center gap-2 rounded-lg border border-slate-400 px-3 py-2 text-xs font-bold hover:bg-orange-50 dark:border-slate-600 dark:hover:bg-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
  </div>
  {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {loaded&&!items.length&&<p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">No watched marketplace listings yet. <Link href="/browse" className="font-black text-orange-700 underline dark:text-orange-300">Browse items</Link> and choose Watch to activate alerts.</p>}
  {items.length>0&&<div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
    {items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/listing/${item.public_id||item.id}`} className="block truncate text-sm font-black text-blue-700 underline dark:text-blue-200">{item.title}</Link>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.currency==="USD"?"$":"£"}{Number(item.price).toFixed(2)} · {item.status}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[{key:"price_drop" as const,label:"Price drop",icon:TrendingDown},{key:"restock" as const,label:"Restock",icon:PackageCheck}].map(ctrl=>{
          const Icon=ctrl.icon,on=item[ctrl.key];
          return <button key={ctrl.key} type="button" onClick={()=>void change(item,ctrl.key)} disabled={!!busy}
            aria-label={`${ctrl.label} alerts ${on?"on":"off"} for ${item.title}`}
            aria-pressed={on}
            className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-60 ${on?"border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100":"border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"}`}>
            {on?<Icon className="h-4 w-4"/>:<BellOff className="h-4 w-4"/>}{ctrl.label}: {on?"On":"Off"}
          </button>;
        })}
      </div>
    </div>)}
  </div>}
  <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Alerts are in-app notifications, not email or mobile push. Listings must be watched before a change occurs to qualify.</p>
 </section>;
}
