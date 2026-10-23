import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, Shield, CheckCircle2, Rocket, Sun, Moon } from "lucide-react";
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

    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const ok = await login(email, password);
      if (ok) {
        // Clear busy state before route navigation, even if the login view remains mounted.
        setLoading(false);
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
    <div className="bazunk-admin-login relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#eff5ff] p-4 text-[#192b51] dark:bg-[#081c42] dark:text-white">
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-28 right-0 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="relative z-10 mb-4 flex w-full max-w-6xl justify-end"><button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle colour theme" className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow dark:border-slate-500 dark:bg-[#20345b] dark:text-white">
        {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
      </button></div>
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101e3e] lg:min-h-[600px] lg:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#071b43] via-[#0a326e] to-[#10204d] p-8 !text-white sm:p-12">
          <div>
            <img src="/bazunk-brand-dark.png" alt="Bazunk" className="mb-7 h-12 w-auto rounded-lg bg-white p-2" />
            <div className="text-2xl font-black !text-white sm:text-3xl">Marketplace Admin</div>
            <p className="mt-2 text-lg !text-white">Manage. Monitor. Grow.</p>
            <div className="mt-10 space-y-5 text-sm font-semibold !text-white">
              {["Secure access", "Real-time marketplace data", "Tools to keep Bazunk running"].map(x=><div key={x} className="flex items-center gap-3 !text-white"><CheckCircle2 className="h-5 w-5 text-orange-400"/>{x}</div>)}
            </div>
          </div>
          <div className="relative mt-10 flex items-center gap-5 rounded-2xl bg-white/10 p-6"><Rocket className="h-16 w-16 -rotate-12 text-orange-400"/><div><div className="text-xl font-black !text-white">Take control 🚀</div><p className="mt-1 text-sm !text-white">Your marketplace mission control.</p></div></div>
        </div>
        <div className="flex items-center justify-center p-6 text-[#132a55] dark:!text-white sm:p-12">
          <div className="w-full max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-400/60 dark:bg-[#243e71]"><Shield className="h-8 w-8 text-blue-600 dark:!text-blue-100"/></div>
            <h1 className="text-center text-3xl font-black !text-[#142852] dark:!text-white">Admin Login</h1>
            <p className="mb-9 mt-2 text-center text-sm !text-[#384a6b] dark:!text-[#f0f5ff]">Welcome back! Please sign in to continue.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label htmlFor="admin-email" className="mb-2 block text-sm font-bold !text-[#142852] dark:!text-white">Email address</label><div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input id="admin-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" placeholder="Admin email address" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/20 dark:bg-[#172d57] dark:text-white" /></div></div>
              <div><label htmlFor="admin-password" className="mb-2 block text-sm font-bold !text-[#142852] dark:!text-white">Password</label><div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input id="admin-password" type={show ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter admin password" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-12 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/20 dark:bg-[#172d57] dark:text-white"/><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={()=>setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button></div></div>
              {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
              <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff970c] to-[#ff5136] px-5 py-4 text-base font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-90">{loading ? "Signing in…" : "Sign In"}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
