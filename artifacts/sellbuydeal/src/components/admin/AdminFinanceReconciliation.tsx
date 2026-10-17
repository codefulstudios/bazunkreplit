import { useEffect,useRef,useState } from "react";
import { Link } from "wouter";
import { useAdmin } from "@/context/AdminContext";
import { AlertTriangle,RefreshCw,ShieldCheck } from "lucide-react";
type Issue={id:string;kind:string;severity:string;title:string;detail:string;href:string};
type Report={generatedAt:string;stripeAvailable:boolean;stripeError:string|null;totals:{total:number;delivered_not_transferred:number;reversal_pending:number;transfers_recorded:number};scope:{ordersSampled:number;totalOrderCount:number;sessionsSampled:number;sessionsVerified:number;sessionsUnverified:number;transfersChecked:number;transferChecksFailed:number};issues:Issue[];limits:string};
export function AdminFinanceReconciliation(){
 const {authFetch}=useAdmin();
 const fetchRef=useRef(authFetch);fetchRef.current=authFetch;
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[filter,setFilter]=useState("all");
 async function load(){
  setLoading(true);setError("");
  try{
   const r=await fetchRef.current("/api/admin/finance/reconciliation",{cache:"no-store"});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Reconciliation unavailable");
   setReport(d);
  }catch(e){setError(e instanceof Error?e.message:"Unable to check finance exceptions");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 const issues=(report?.issues||[]).filter(i=>filter==="all"||i.severity===filter);
 return <section className="space-y-3 rounded-2xl border-2 border-orange-200 bg-white p-4 shadow-sm dark:border-orange-800 dark:bg-[#182841]" aria-label="Stripe payment reconciliation">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><ShieldCheck className="h-5 w-5 text-orange-600"/>Stripe reconciliation & payout exceptions</h2>
   <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Read-only checks. No refunds, transfers, charges or payouts are issued here.</p></div>
   <button type="button" onClick={()=>void load()} disabled={loading} className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-300 bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><RefreshCw className="h-4 w-4"/>{loading?"Checking…":"Refresh"}</button>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {report&&<>
   {!report.stripeAvailable&&<p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">Stripe unavailable — cross-check incomplete. {report.stripeError}</p>}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[
      ["Exceptions flagged",report.issues.length],
      ["Delivered, not transferred",report.totals.delivered_not_transferred],
      ["Refund / reversal pending",report.totals.reversal_pending],
      ["Stripe sessions verified",report.scope.sessionsVerified]
    ].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800">
     <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>)}
   </div>
   <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Orders checked: {report.scope.ordersSampled} of {report.scope.totalOrderCount}. Stripe transfers verified: {report.scope.transfersChecked}. {report.limits}</p>
   <div className="flex flex-wrap gap-2">{["all","critical","warning","info"].map(x=><button type="button" key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)} className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${filter===x?"border-orange-500 bg-orange-600 text-white":"border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"}`}>{x==="all"?"All exceptions":x}</button>)}</div>
   {issues.length===0?<p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-white">{report.issues.length===0?"No exceptions detected within the checked sample. This is not an all-time reconciliation.":"No exceptions match this filter."}</p>
   :<div className="max-h-[440px] space-y-2 overflow-y-auto">{issues.map(i=><div key={i.id} className="rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
    <p className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><AlertTriangle className={`h-4 w-4 ${i.severity==="critical"?"text-red-600":"text-amber-600"}`}/>{i.title}</p>
    <p className="mt-1 break-words text-xs text-slate-700 dark:text-slate-200">{i.detail}</p>
    <Link href={i.href} className="mt-2 inline-block text-xs font-black text-blue-700 underline dark:text-blue-200">Review order →</Link>
   </div>)}</div>}
   <p className="text-xs text-slate-600 dark:text-slate-300">Checked {new Date(report.generatedAt).toLocaleString("en-GB")}. Investigate discrepancies before changing records.</p>
  </>}
 </section>;
}
