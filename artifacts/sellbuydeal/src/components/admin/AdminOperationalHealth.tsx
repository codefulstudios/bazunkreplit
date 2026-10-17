import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
import {Activity,Database,RefreshCw,Webhook,AlertTriangle} from "lucide-react";
type Hook={key:string;name:string;configured:boolean;state:string;received24h:number;failed24h:number;lastSuccess:string|null;detail:string};
type Payload={checkedAt:string;api:{status:string;dbStatus:string;dbLatencyMs:number;recentOrders:number;openSupportCases:number};
 webhooks:Hook[];alerts:Array<{severity:string;message:string}>;note:string};
export function AdminOperationalHealth(){
 const {authFetch}=useAdmin();
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await authFetch("/api/admin/system-operations",{cache:"no-store"});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Operations monitoring unavailable");
   setData(d);
  }catch(e){setError(e instanceof Error?e.message:"Monitoring unavailable");}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 return <section className="space-y-4 rounded-2xl border-2 border-orange-300 bg-white p-4 dark:border-orange-700 dark:bg-[#172541]" aria-label="API database webhook operations">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><Activity className="h-5 w-5 text-orange-600"/>API, database & webhook delivery</h2>
    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Real processing records, not just configured API keys</p></div>
   <button type="button" disabled={loading} onClick={()=>void load()} className="flex min-h-10 items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Refresh operations</button>
  </div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {data&&<>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[
     {name:"API",value:data.api.status,icon:Activity},
     {name:"Database",value:data.api.dbStatus,icon:Database},
     {name:"DB response",value:data.api.dbLatencyMs+" ms",icon:Database},
     {name:"Open support cases",value:data.api.openSupportCases,icon:AlertTriangle}
    ].map(x=>{const Icon=x.icon;return <div key={x.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
     <Icon className="mb-2 h-4 w-4 text-orange-600"/><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{x.name}</p><p className="mt-1 text-lg font-black capitalize text-slate-950 dark:text-white">{x.value}</p>
    </div>})}
   </div>
   {data.alerts.length>0&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
    <h3 className="font-black text-amber-900 dark:text-amber-100">Action required</h3>
    {data.alerts.map((a,i)=><p key={i} className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">{a.message}</p>)}
   </div>}
   <div className="grid gap-3 md:grid-cols-3">{data.webhooks.map(h=><div key={h.key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
     <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><Webhook className="h-4 w-4 text-orange-600"/>{h.name}</h3>
     <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-black capitalize ${h.state==="receiving"?"bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100":h.state==="attention"?"bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100":"bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>{h.state.replaceAll("_"," ")}</span>
     <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{h.received24h} deliveries · {h.failed24h} failures (24h)</p>
     <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{h.detail}</p>
     <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Last processed: {h.lastSuccess?new Date(h.lastSuccess).toLocaleString("en-GB"):"Not recorded"}</p>
    </div>)}</div>
   <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{data.note} Checked {new Date(data.checkedAt).toLocaleString("en-GB")}.</p>
  </>}
 </section>;
}
