import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sun, Moon, BarChart3, ShoppingCart, Settings2, Users, Heart, ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useAdmin } from "@/context/AdminContext";

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: "Secure Access", description: "Your data and marketplace are protected.", color: "text-orange-400" },
  { icon: BarChart3, title: "Real-time Analytics", description: "Track performance and key insights.", color: "text-blue-400" },
  { icon: ShoppingCart, title: "Manage Orders", description: "Keep your marketplace running smoothly.", color: "text-orange-400" },
  { icon: Settings2, title: "Full Marketplace Control", description: "Manage products, users, and more.", color: "text-blue-400" },
];

function DashboardIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-10 hidden h-72 w-full max-w-[440px] items-center justify-center xl:flex">
      <div className="absolute inset-6 rounded-full border border-orange-400/45 rotate-[-18deg]" />
      <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="relative w-[80%] -rotate-3 rounded-2xl border border-blue-400/60 bg-gradient-to-br from-[#163c84] via-[#0a1c43] to-[#050e26] p-4 shadow-[14px_20px_45px_rgba(0,0,0,.42),0_0_30px_rgba(255,135,39,.24)]">
        <div className="mb-4 flex items-center gap-2 text-xs font-black text-white"><span className="rounded-md bg-orange-500 p-1 text-white">B</span> Bazunk <span className="ml-auto h-2 w-14 rounded-full bg-white/20"/></div>
        <div className="grid grid-cols-[58px_1fr] gap-3">
          <div className="space-y-3 rounded-lg bg-[#102858] p-2">{[1,2,3,4,5].map(n=><div key={n} className="h-2 rounded-full bg-blue-300/30"/>)}</div>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#17366e] p-3">
              <div className="mb-2 flex items-center justify-between"><div className="h-2 w-20 rounded bg-white/40"/><TrendingUp className="h-4 w-4 text-orange-400"/></div>
              <svg viewBox="0 0 260 66" className="h-16 w-full" preserveAspectRatio="none" role="presentation"><path d="M0 55 L30 43 L52 49 L82 21 L105 37 L136 28 L164 42 L196 15 L228 25 L260 5" stroke="#ff8b27" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M0 55 L30 43 L52 49 L82 21 L105 37 L136 28 L164 42 L196 15 L228 25 L260 5 L260 66 L0 66 Z" fill="#ff8b27" opacity=".12"/></svg>
            </div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-[#17366e] p-3"><div className="h-8 w-8 rounded-full border-[6px] border-blue-400 border-r-orange-500"/><div className="mt-2 h-2 w-16 rounded bg-white/30"/></div><div className="space-y-2 rounded-lg bg-[#17366e] p-3">{[1,2,3].map(n=><div key={n} className="h-2 rounded-full bg-blue-300/30"/>)}</div></div>
          </div>
        </div>
      </div>
      <div className="absolute right-3 top-3 rounded-2xl border border-orange-400/60 bg-[#152b59] p-4 text-orange-400 shadow-xl rotate-12"><ShoppingCart className="h-7 w-7"/></div>
      <div className="absolute left-3 top-16 rounded-2xl border border-blue-400/60 bg-[#152b59] p-3 text-blue-400 shadow-xl -rotate-12"><BarChart3 className="h-8 w-8"/></div>
      <div className="absolute right-7 bottom-7 rounded-2xl border border-blue-400/60 bg-[#152b59] p-3 text-blue-300 shadow-xl"><Users className="h-7 w-7"/></div>
    </div>
  );
}

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const ok = await login(email, password);
      if (ok) {
        setLoading(false);
        setLocation("/admin/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Network error. Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bazunk-admin-login relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#edf4ff] px-3 py-8 text-[#102144] dark:bg-[#080f22] sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-[1400px] overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_25px_65px_rgba(19,49,98,.20)] dark:border-slate-700 dark:bg-[#111d34] lg:min-h-[720px] lg:grid-cols-[1.55fr_1fr]">
        <section className="relative isolate flex flex-col overflow-hidden bg-gradient-to-br from-[#061635] via-[#0b285b] to-[#123f90] px-7 py-9 text-white sm:px-12 sm:py-12 lg:px-14">
          <div className="pointer-events-none absolute -right-36 -top-48 h-[650px] w-[650px] rounded-full border-[100px] border-blue-400/10" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-96 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img src="/bazunk-brand-icon.png" alt="" className="h-12 w-12 rounded-xl object-contain" />
              <div><div className="text-2xl font-black tracking-tight text-white">Bazun<span className="text-orange-400">k</span></div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.35em] text-blue-100">Marketplace Admin</div></div>
            </div>
            <h1 className="mt-10 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">Manage.<br/>Monitor. <span className="text-orange-400">Grow.</span></h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-blue-100">Your complete marketplace control center. Secure, powerful and built for growth.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {HIGHLIGHTS.map(({icon: Icon,title,description,color})=>(
                <div key={title} className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-[#0c3469]/90"><Icon className={`h-6 w-6 ${color}`} /></span>
                  <div><div className="font-bold text-white">{title}</div><div className="mt-1 text-sm text-blue-100">{description}</div></div>
                </div>
              ))}
            </div>
            <DashboardIllustration />
          </div>
          <div className="relative z-10 mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-xs font-semibold text-blue-100">
            <span className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-400"/>Grow sellers</span>
            <span className="flex items-center gap-2"><Heart className="h-5 w-5 text-blue-400"/>Delight customers</span>
            <span className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-orange-400"/>Build bigger</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-16 text-[#102144] dark:text-white sm:px-10 lg:px-12">
          <button type="button" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")} aria-label="Toggle colour theme" className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 dark:border-slate-600 dark:bg-[#213253] dark:text-white">
            {resolvedTheme==="dark"?<Moon className="h-4 w-4"/>:<Sun className="h-4 w-4"/>}
            <span>{resolvedTheme==="dark"?"Dark":"Light"} mode</span>
          </button>
          <div className="w-full max-w-[440px]">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-200 bg-blue-50 dark:border-blue-500/50 dark:bg-[#22375c]"><ShieldCheck className="h-11 w-11 text-blue-600 dark:text-blue-300"/></div>
            <h2 className="text-center text-3xl font-black tracking-tight text-[#102144] dark:text-white sm:text-4xl">Admin Login</h2>
            <p className="mb-9 mt-3 text-center text-sm text-slate-600 dark:text-slate-200">Sign in to manage your marketplace.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-bold text-[#102144] dark:text-white">Email address</label>
                <div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"/><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin email address" className="w-full rounded-xl border border-[#cbd8ec] bg-[#eaf2ff] py-4 pl-12 pr-4 text-base text-[#102144] outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 dark:border-slate-500 dark:bg-[#22375b] dark:text-white dark:placeholder:text-slate-300"/></div>
              </div>
              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-bold text-[#102144] dark:text-white">Password</label>
                <div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"/><input id="admin-password" type={show?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password" className="w-full rounded-xl border border-[#cbd8ec] bg-[#eaf2ff] py-4 pl-12 pr-12 text-base text-[#102144] outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 dark:border-slate-500 dark:bg-[#22375b] dark:text-white dark:placeholder:text-slate-300"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-200">{show?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button></div>
              </div>
              {error&&<div role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
              <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#ff9818] to-[#ff5038] px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70">{loading?"Signing in…":<>Sign In <ArrowRight className="h-5 w-5"/></>}</button>
            </form>
            <p className="mt-8 text-center text-xs font-medium text-slate-500 dark:text-slate-300">Authorised marketplace administrators only</p>
          </div>
        </section>
      </div>
    </main>
  );
}
