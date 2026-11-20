import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
import {RefreshCw,MessageCircle,AlertTriangle} from "lucide-react";
type Data={checkedAt:string;widgetEnabled:boolean;identificationEnabled:boolean;identityConfigured:boolean;signedInIdentityReady:boolean;
 pages:string;hideAdmin:boolean;cases:{total:number;open:number;last7d:number};casesSeparate:boolean;concerns:string[];liveInboxVerified:boolean;note:string};
export function AdminChatwootDiagnostics(){
 const {authFetch}=useAdmin();
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=async()=>{
  setBusy(true);setError("");
  try{const r=await authFetch("/api/admin/chatwoot/diagnostics",{cache:"no-store"});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Chatwoot diagnostics unavailable");
   setData(d);
  }catch(e){setError(e instanceof Error?e.message:"Cannot verify configuration");}
  finally{setBusy(false);}
 };
 useEffect(()=>{void load();},[]);
 return <section className="space-y-3 rounded-xl border-2 border-orange-200 bg-white p-5 dark:border-orange-700 dark:bg-[#172541]" aria-label="Chatwoot identity and support diagnostics">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white"><MessageCircle className="h-5 w-5 text-orange-600"/>Chatwoot integration checks</h2>
   <button type="button" disabled={busy} onClick={()=>void load()} className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{busy?"Checking…":"Check configuration"}</button>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
  {data&&<>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[
     ["Live chat feature",data.widgetEnabled?"Enabled":"Off"],
     ["Signed-in identification",data.identificationEnabled?"Enabled":"Off"],
     ["Server HMAC secret",data.identityConfigured?"Configured":"Missing"],
     ["Open Bazunk tickets",data.cases.open]
    ].map(([label,value])=><div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p><p className="mt-1 text-base font-black text-slate-950 dark:text-white">{value}</p></div>)}
   </div>
   <p className={`rounded-lg p-3 text-sm font-bold ${data.signedInIdentityReady?"bg-emerald-50 text-emerald-900 dark:!bg-[#a7f3d0] dark:!text-[#052e24]":"bg-amber-50 text-amber-900 dark:!bg-[#ffd078] dark:!text-[#35200a]"}`}>{data.signedInIdentityReady?"Identity prerequisites configured — live customer-to-contact test still required":"Signed-in customer identification is not fully configured."}</p>
   {data.concerns.map((v,i)=><p key={i} className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0"/>{v}</p>)}
   <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Bazunk support tickets: {data.cases.total} total, {data.cases.last7d} created in the last seven days. These are separate from Chatwoot conversations and are managed through Admin → Support.</p>
   <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{data.note} Checked {new Date(data.checkedAt).toLocaleString("en-GB")}.</p>
  </>}
 </section>;
}
