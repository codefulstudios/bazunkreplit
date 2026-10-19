import { useEffect } from "react";
import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

/** The /messages bookmark now opens the same message centre as the navbar. */
export function MessagesPage() {
 useEffect(() => {
   // Navbar installs the handler during the same commit before this child effect runs.
   window.dispatchEvent(new Event("bazunk-open-inbox"));
 }, []);
 return <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1425] dark:text-white">
  <Navbar />
  <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-20 text-center">
   <MessageSquare className="mx-auto h-12 w-12 text-indigo-500"/>
   <h1 className="mt-4 text-2xl font-bold">Your messages</h1>
   <p className="mt-2 text-base text-slate-700 dark:text-slate-200">Use the Bazunk message centre to see your conversations and notifications.</p>
   <button type="button" className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white" onClick={()=>window.dispatchEvent(new Event("bazunk-open-inbox"))}>Open message centre</button>
   <div className="mt-4"><Link href="/dashboard" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">Return to dashboard</Link></div>
  </main>
  <Footer />
 </div>;
}
