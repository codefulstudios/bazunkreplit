import {useCallback,useEffect,useState} from "react";
import {useAuth} from "@clerk/react";
import {Link} from "wouter";
import {AccountSetupWizard} from "./AccountSetupWizard";
import {CheckCircle2, Circle, ShieldCheck, ClipboardList} from "lucide-react";

type Profile={onboarding_completed?:boolean;onboarding_step?:number;name?:string;username?:string;address_line1?:string;city?:string;postcode?:string;country?:string;seller_type?:string};
const labels=["Profile & username","Delivery address","Payments information","Seller type & compliance declaration","Notifications","Finish account setup"];
export function DashboardSetupProgress({fallbackName}:{fallbackName:string}){
 const {getToken,isSignedIn}=useAuth();
 const [profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(""),[open,setOpen]=useState(false),[revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  if(!isSignedIn)return;
  try{const token=await getToken();const r=await fetch("/api/listings/profile/me",{headers:token?{Authorization:"Bearer "+token}:{}});if(!r.ok)throw new Error("Could not load account setup progress");setProfile(await r.json());setError("");}
  catch(e:any){setError(e.message||"Unable to load progress");}
 },[getToken,isSignedIn]);
 useEffect(()=>{void load();},[load,revision]);
 const completed=profile?.onboarding_completed===true;
 const next=Math.max(1,Math.min(6,Number(profile?.onboarding_step)||1));
 const done=completed?6:next-1;
 return <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm mb-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><ClipboardList className="h-5 w-5 text-indigo-700"/>Account setup</h2><p className="text-sm text-gray-600">{profile?completed?"All six setup steps completed.":`${done} of 6 steps completed`:"Checking your account setup…"}</p></div>
   <div className="flex flex-wrap gap-2"><Link href="/seller-compliance" className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 bg-white px-3 py-2 text-sm font-semibold text-indigo-700"><ShieldCheck className="h-4 w-4"/>Seller Compliance</Link><button type="button" onClick={()=>setOpen(true)} disabled={!profile} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{completed?"Review setup":"Continue setup"}</button></div>
  </div>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} aria-label="Account setup progress"><div className="h-full bg-indigo-600 transition-all" style={{width:`${done/6*100}%`}}/></div>
  <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{labels.map((label,i)=><li key={label} className="flex items-center gap-2 text-sm text-gray-700">{i<done?<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600"/>:<Circle className="h-4 w-4 shrink-0 text-gray-400"/>}<span>{label}</span></li>)}</ol>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {open&&<AccountSetupWizard key={revision} fallbackName={fallbackName} forceOpen onComplete={()=>{setOpen(false);setRevision(x=>x+1);}}/>}
 </section>;
}
