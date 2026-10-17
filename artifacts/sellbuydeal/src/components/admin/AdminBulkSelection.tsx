import { useState } from "react";
import { ClipboardCopy, Download, X } from "lucide-react";

type RecordCell = string | number | boolean | null | undefined;
type DataRow = {id:string;cells:RecordCell[]};
export function AdminBulkSelection({selected,columns,rows,filename,onClear}:{
  selected:string[];columns:string[];rows:DataRow[];filename:string;onClear:()=>void;
}){
  const [message,setMessage]=useState("");
  const matching=rows.filter(r=>selected.includes(r.id));
  async function copyIds(){
    try{await navigator.clipboard.writeText(matching.map(r=>r.id).join("\n"));setMessage(`Copied ${matching.length} IDs`);}
    catch{setMessage("Clipboard was blocked; use Export CSV instead.");}
  }
  function exportCsv(){
    const esc=(x:RecordCell)=>'"'+String(x??"").replace(/^([=+\-@])/,"'$1").replace(/"/g,'""')+'"';
    const csv=[["ID",...columns].map(esc).join(","),...matching.map(r=>[r.id,...r.cells].map(esc).join(","))].join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename+".csv";document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),30000);setMessage(`Exported ${matching.length} records`);
  }
  if(!selected.length)return null;
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-orange-300 bg-orange-50 p-3 dark:border-orange-700 dark:bg-orange-950/40" aria-label="Bulk admin record actions">
    <span className="mr-2 text-sm font-black text-slate-950 dark:text-white">{matching.length} selected</span>
    <button type="button" onClick={()=>void copyIds()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><ClipboardCopy className="h-4 w-4"/>Copy IDs</button>
    <button type="button" onClick={exportCsv} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-700"><Download className="h-4 w-4"/>Export selected CSV</button>
    <button type="button" onClick={()=>{onClear();setMessage("");}} className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 hover:bg-orange-100 dark:text-white" aria-label="Clear admin selection"><X className="h-4 w-4"/>Clear</button>
    {message&&<p role="status" className="w-full text-xs font-bold text-slate-800 dark:text-slate-200">{message}</p>}
    <p className="w-full text-xs font-medium text-slate-700 dark:text-slate-200">Bulk export only; no accounts, orders or payments are changed.</p>
  </div>;
}
