import { Link } from "wouter";
import { Radio, ExternalLink, Video, ShieldCheck } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
export function AdminGoLivePage(){
 return <AdminLayout><main className="space-y-5 p-5 text-slate-900 md:p-8">
 <header className="rounded-2xl border-2 border-orange-400 bg-white p-6"><span className="text-sm font-extrabold text-orange-700">BAZUNK LIVE</span><h1 className="mt-1 text-3xl font-black text-slate-900">Go Live · Creator Studio</h1><p className="mt-2 text-slate-700">Manage the live-selling experience and access Bazunk broadcasting tools. External-platform channels are managed separately.</p></header>
 <div className="grid gap-4 md:grid-cols-2">
 <section className="rounded-2xl border-2 border-blue-300 bg-white p-6"><Radio className="mb-3 text-blue-700"/><h2 className="text-xl font-extrabold">Bazunk Live & Go Live</h2><p className="mt-2 text-sm text-slate-700">Open the live marketplace to view streams and access the broadcaster flow using an eligible seller account.</p><Link href="/live" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Open Bazunk Live <ExternalLink size={16}/></Link></section>
 <section className="rounded-2xl border-2 border-orange-300 bg-white p-6"><Video className="mb-3 text-orange-600"/><h2 className="text-xl font-extrabold">External Live Channels</h2><p className="mt-2 text-sm text-slate-700">Add, edit and publish curated TikTok, eBay, YouTube and Twitch channel links, creators and affiliate products.</p><Link href="/admin/live-commerce" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white">Manage live channels <ExternalLink size={16}/></Link></section>
 </div><p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><ShieldCheck size={18} className="shrink-0"/>Broadcast creation and live-stream permissions are governed by the existing seller/broadcaster workflows. Admin broadcast moderation and analytics controls are not yet provided on this page.</p>
 </main></AdminLayout>;
}