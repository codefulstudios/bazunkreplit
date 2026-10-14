import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, Shield, CheckCircle2, Rocket, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAdmin } from "@/context/AdminContext";

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

    setLoading(true);
    setError("");

    try {
      const ok = await login(email, password);
      if (ok) {
        setLocation("/admin/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      setError("Network error. Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eff5ff] p-4 text-[#192b51] dark:bg-[#081c42] dark:text-white">
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-28 right-0 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
      <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle colour theme" className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold shadow dark:border-white/20 dark:bg-white/10">
        {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
      </button>
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101e3e] lg:min-h-[600px] lg:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#071b43] via-[#0a326e] to-[#10204d] p-8 text-white sm:p-12">
          <div>
            <img src="/bazunk-logo.png" alt="Bazunk" className="mb-7 h-12 w-auto rounded-lg bg-white p-2" />
            <div className="text-2xl font-black sm:text-3xl">Marketplace Admin</div>
            <p className="mt-2 text-lg text-blue-200">Manage. Monitor. Grow.</p>
            <div className="mt-10 space-y-5 text-sm font-semibold text-slate-100">
              {["Secure access", "Real-time marketplace data", "Tools to keep Bazunk running"].map(x=><div key={x} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-orange-400"/>{x}</div>)}
            </div>
          </div>
          <div className="relative mt-10 flex items-center gap-5 rounded-2xl bg-white/10 p-6"><Rocket className="h-16 w-16 -rotate-12 text-orange-400"/><div><div className="text-xl font-black">Take control 🚀</div><p className="mt-1 text-sm text-blue-200">Your marketplace mission control.</p></div></div>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10"><Shield className="h-8 w-8 text-blue-600 dark:text-blue-300"/></div>
            <h1 className="text-center text-3xl font-black">Admin Login</h1>
            <p className="mb-9 mt-2 text-center text-sm text-slate-500 dark:text-slate-300">Welcome back! Please sign in to continue.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label htmlFor="admin-email" className="mb-2 block text-sm font-bold">Email address</label><div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input id="admin-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" placeholder="Admin email address" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/20 dark:bg-[#172d57] dark:text-white" /></div></div>
              <div><label htmlFor="admin-password" className="mb-2 block text-sm font-bold">Password</label><div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input id="admin-password" type={show ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter admin password" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-12 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/20 dark:bg-[#172d57] dark:text-white"/><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={()=>setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button></div></div>
              {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
              <button type="submit" disabled={loading || !email || !password} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff970c] to-[#ff5136] px-5 py-4 text-base font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Signing in…" : "Sign In"} <ArrowRight className="h-5 w-5"/></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
