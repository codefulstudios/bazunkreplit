import { useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Link } from "wouter";
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Notice={id:string;title:string;desc:string;time:string;href:string;type:string;unread:boolean};
export function MobileNotificationsPage(){
 const {isSignedIn,isLoaded,getToken}=useClerkAuth();
 const [data,setData]=useState<Notice[]>([]);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!isSignedIn)return;
  setLoading(true);setError("");
  try{
   const token=await getToken();if(!token)throw Error("Please sign in.");
   const response=await fetch("/api/notifications",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   const json=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(json.error||"Notifications unavailable");
   setData(Array.isArray(json.notifications)?json.notifications:[]);
  }catch(e){setError(e instanceof Error?e.message:"Notifications unavailable");}
  finally{setLoading(false);}
 },[isSignedIn,getToken]);
 useEffect(()=>{if(isLoaded&&isSignedIn)void load();},[isLoaded,isSignedIn,load]);
 const mark=async(ids:string[])=>{
  if(!ids.length)return;
  setBusy(true);setError("");
  try{
   const token=await getToken();if(!token)throw Error("Please sign in.");
   const response=await fetch("/api/notifications/read",{method:"POST",
     headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({ids})});
   if(!response.ok)throw Error("Could not mark notifications as read");
   setData(old=>old.map(n=>ids.includes(n.id)?{...n,unread:false}:n));
  }catch(e){setError(e instanceof Error?e.message:"Unable to update notifications");}
  finally{setBusy(false);}
 };
 const unseen=data.filter(n=>n.unread);
 return <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-[#0b1930] dark:text-white">
  <Navbar/>
  <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="flex items-center gap-2 text-2xl font-black"><Bell className="h-6 w-6 text-orange-500"/> Notifications</h1>
    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Order updates, offers, messages and matches in one place.</p></div>
    <button type="button" disabled={loading} onClick={()=>void load()}
     className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:border-slate-600 dark:bg-[#192c49] dark:text-white">
     <RefreshCw className="h-4 w-4"/> Refresh</button>
   </div>
   {!isLoaded?<p>Loading your account…</p>:!isSignedIn?
    <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center dark:border-slate-700 dark:bg-[#192c49]">
     <p className="font-semibold">Sign in to see your private notifications.</p>
     <Link href="/sign-in" className="mt-4 inline-block rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">Sign in</Link>
    </div>:<>
    <div className="flex items-center justify-between gap-3">
     <p className="text-sm font-bold">{unseen.length} unread</p>
     <button type="button" disabled={!unseen.length||busy} onClick={()=>void mark(unseen.map(n=>n.id))}
       className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50 dark:text-indigo-200">
      <CheckCheck className="h-4 w-4"/> Mark all read</button>
    </div>
    {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 font-bold text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p>}
    {loading&&<p role="status" className="flex items-center gap-2 text-sm font-bold"><Loader2 className="h-4 w-4 animate-spin"/> Checking updates…</p>}
    {!loading&&data.length===0&&<p className="rounded-2xl border border-slate-200 bg-white p-8 text-center font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#192c49] dark:text-slate-200">No notifications yet. New activity will appear here.</p>}
    <div className="space-y-2">{data.map(n=><div key={n.id} className={`rounded-xl border p-4 ${n.unread?"border-indigo-400 bg-indigo-50 dark:border-indigo-400 dark:bg-[#1d335b]":"border-slate-200 bg-white dark:border-slate-700 dark:bg-[#192c49]"}`}>
     <div className="flex items-start justify-between gap-3">
      <Link href={n.href||"/dashboard"} onClick={()=>{if(n.unread)void mark([n.id]);}}
       className="min-w-0 flex-1">
       <p className="text-sm font-black text-slate-950 dark:text-white">{n.title}</p>
       <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{n.desc}</p>
       <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{new Date(n.time).toLocaleString()}</p>
      </Link>
      {n.unread&&<button type="button" onClick={()=>void mark([n.id])} disabled={busy}
       className="shrink-0 rounded-lg border border-indigo-300 px-2 py-2 text-xs font-bold text-indigo-800 dark:text-indigo-200">Mark read</button>}
     </div>
    </div>)}</div>
   </>}
  </main><Footer/>
 </div>;
}
