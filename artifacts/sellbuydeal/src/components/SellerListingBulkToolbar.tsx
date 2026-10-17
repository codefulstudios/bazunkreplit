import { useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Copy, PauseCircle, PlayCircle, RefreshCw, RotateCcw, Pencil, X } from "lucide-react";

export type SellerToolAction="pause"|"resume"|"renew"|"duplicate"|"relist"|"edit";
type ToolResponse={
  updated:Array<{id:number;status?:string}>;
  failures:Array<{id:number;error:string}>;
  error?:string;
};
export function SellerListingBulkToolbar({ selectedIds, onFinished, onClear }:{
  selectedIds:number[]; onFinished:()=>Promise<void>|void; onClear:()=>void;
}){
  const { getToken } = useClerkAuth();
  const [busy,setBusy]=useState<SellerToolAction|null>(null);
  const [editOpen,setEditOpen]=useState(false);
  const [adjustment,setAdjustment]=useState("");
  const [absolute,setAbsolute]=useState("");
  const [condition,setCondition]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const count=selectedIds.length;
  async function run(action:SellerToolAction){
    if(!count || busy)return;
    if(action==="duplicate" && !window.confirm(`Duplicate ${count} listing(s) as editable drafts?`))return;
    if(action==="relist" && !window.confirm(`Relist ${count} listing(s) as new live listings? Existing orders remain with the originals.`))return;
    if(action==="renew" && !window.confirm(`Renew ${count} active listing(s) and move them to the top of newest results?`))return;
    setError("");setMessage("");setBusy(action);
    try{
      const edit:Record<string,unknown>={};
      if(action==="edit"){
        if(absolute.trim() && adjustment.trim())throw new Error("Choose either a fixed price or percentage adjustment");
        if(absolute.trim()){
          const n=Number(absolute);if(!Number.isFinite(n)||n<0.01)throw new Error("Enter a valid price");
          edit.price=n;
        }else if(adjustment.trim()){
          const n=Number(adjustment);if(!Number.isFinite(n)||n< -90||n>500)throw new Error("Adjustment must be between -90% and +500%");
          edit.priceAdjustment=n;
        }
        if(condition)edit.condition=condition;
        if(!Object.keys(edit).length)throw new Error("Choose a condition or price change");
      }
      const token=await getToken();
      if(!token)throw new Error("Please sign in to manage your listings");
      const response=await fetch("/api/listings/seller-tools",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({action,ids:selectedIds,edit})
      });
      const data:ToolResponse=await response.json().catch(()=>({updated:[],failures:[]}));
      if(!response.ok && !data.failures?.length)throw new Error(data.error||"Listing action failed");
      const successes=data.updated?.length??0;
      const failures=data.failures??[];
      if(successes){
        await onFinished();onClear();setEditOpen(false);
        setMessage(`${successes} listing(s) ${action==="edit"?"updated":action==="duplicate"?"duplicated as drafts":action==="relist"?"relisted":action==="renew"?"renewed":action==="pause"?"paused":"activated"}.`);
      }
      if(failures.length)setError(`${failures.length} listing(s) skipped: ${failures.slice(0,3).map(f=>`#${f.id}: ${f.error}`).join("; ")}`);
    }catch(e){setError(e instanceof Error?e.message:"Could not update selected listings");}
    finally{setBusy(null);}
  }
  const buttonClass="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-orange-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700";
  return <div className="space-y-3" data-testid="seller-bulk-tools">
    {count>0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/50">
      <span className="mr-1 text-xs font-bold text-orange-900 dark:text-orange-100">{count} selected</span>
      <button type="button" disabled={!!busy} onClick={()=>void run("pause")} className={buttonClass}><PauseCircle className="h-4 w-4"/> Pause</button>
      <button type="button" disabled={!!busy} onClick={()=>void run("resume")} className={buttonClass}><PlayCircle className="h-4 w-4"/> Activate</button>
      <button type="button" disabled={!!busy} onClick={()=>void run("renew")} className={buttonClass}><RefreshCw className="h-4 w-4"/> Renew</button>
      <button type="button" disabled={!!busy} onClick={()=>void run("duplicate")} className={buttonClass}><Copy className="h-4 w-4"/> Duplicate drafts</button>
      <button type="button" disabled={!!busy} onClick={()=>void run("relist")} className={buttonClass}><RotateCcw className="h-4 w-4"/> Relist</button>
      <button type="button" disabled={!!busy} onClick={()=>setEditOpen(p=>!p)} aria-expanded={editOpen} className={buttonClass}><Pencil className="h-4 w-4"/> Bulk edit</button>
      <button type="button" disabled={!!busy} onClick={onClear} className="ml-auto rounded-lg p-2 text-slate-700 hover:bg-white dark:text-white" aria-label="Clear selected listings"><X className="h-4 w-4"/></button>
    </div>}
    {editOpen&&count>0&&<div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
      <label className="space-y-1 text-xs font-bold text-slate-900 dark:text-white">Set price (listing currency)
        <input aria-label="Set exact price" type="number" min="0.01" step="0.01" value={absolute} onChange={e=>{setAbsolute(e.target.value);setAdjustment("");}} placeholder="e.g. 25.00" className="block w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/>
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-900 dark:text-white">Or price adjustment (%)
        <input aria-label="Percentage price change" type="number" min="-90" max="500" step="1" value={adjustment} onChange={e=>{setAdjustment(e.target.value);setAbsolute("");}} placeholder="e.g. -10" className="block w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/>
      </label>
      <label className="space-y-1 text-xs font-bold text-slate-900 dark:text-white">Condition
        <select value={condition} onChange={e=>setCondition(e.target.value)} className="block w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
          <option value="">No change</option>
          {["brand-new","like-new","new","good","fair","poor"].map(c=><option key={c} value={c}>{c.replace("-"," ")}</option>)}
        </select>
      </label>
      <button type="button" disabled={!!busy} onClick={()=>void run("edit")} className="min-h-10 rounded-lg bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700 disabled:opacity-50">{busy==="edit"?"Saving…":"Apply edits"}</button>
    </div>}
    {busy&&<p role="status" className="text-sm font-semibold text-blue-700 dark:text-blue-200">Processing selected listings…</p>}
    {message&&<p role="status" className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{message}</p>}
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
  </div>;
}
