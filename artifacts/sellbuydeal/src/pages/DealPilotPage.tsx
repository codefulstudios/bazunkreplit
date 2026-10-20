import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DealPilotPanel } from "@/components/DealPilotPanel";
export function DealPilotPage(){
 return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0d1427] dark:text-white"><Navbar/><main className="mx-auto max-w-7xl px-4 py-8"><DealPilotPanel/></main><Footer/></div>;
}
