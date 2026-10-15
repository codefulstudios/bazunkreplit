import "./admin-theme.css";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CircleDollarSign, LayoutDashboard, Users, Settings, CreditCard, ShoppingCart, LogOut, ShieldCheck, Package, Shield, RotateCcw, Gavel, Zap, LifeBuoy, Gift, Megaphone, List, ArrowDownToLine, FileText, Star, Activity, ScrollText, ServerCog, Flag, Mail, Menu, X, Sun, Moon, Search, ChevronDown, Bell, CalendarDays } from "lucide-react";
import { useTheme } from "next-themes";
import { useAdmin } from "@/context/AdminContext";

const NAV = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Users",        href: "/admin/users",        icon: Users           },
  { label: "Seller Compliance", href: "/admin/seller-compliance", icon: ShieldCheck },
  { label: "Listings & Imports", href: "/admin/importer-control", icon: Package },
  { label: "Importers", href: "/admin/imports", icon: ArrowDownToLine },
  { label: "Demo Creator", href: "/admin/demo-creator", icon: Package },
  { label: "Cashback", href: "/admin/cashback", icon: Gift },
  { label: "Classifieds",  href: "/admin/classifieds",  icon: FileText        },
  { label: "Orders",       href: "/admin/orders",       icon: ShoppingCart     },
  { label: "Payments",   href: "/admin/payments",   icon: CreditCard      },
  { label: "Auctions",   href: "/admin/auctions",   icon: Gavel           },
  { label: "Flash Sales",href: "/admin/flash-sales",icon: Zap             },
  { label: "Disputes",   href: "/admin/disputes",   icon: Shield          },
  { label: "Returns",    href: "/admin/returns",    icon: RotateCcw       },
  { label: "Support",    href: "/admin/support",    icon: LifeBuoy        },
  { label: "Chatwoot Settings", href: "/admin/chatwoot", icon: LifeBuoy },
  { label: "Rewards",    href: "/admin/rewards",    icon: Gift            },
  { label: "Credits Economy", href: "/admin/credits-economy", icon: CircleDollarSign },
  { label: "Referrals",  href: "/admin/referrals",  icon: Users           },
  { label: "Promotions", href: "/admin/promotions", icon: Megaphone       },
  { label: "Reviews",    href: "/admin/reviews",    icon: Star            },
  { label: "Audit Log",  href: "/admin/audit-log",  icon: ScrollText       },
  { label: "System Status", href: "/admin/system-status", icon: ServerCog },
  { label: "Feature Toggles", href: "/admin/feature-toggles", icon: Flag },
  { label: "Email Templates", href: "/admin/emails", icon: Mail },
  { label: "Settings",   href: "/admin/settings",   icon: Settings        },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, isAdmin } = useAdmin();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [topSearch, setTopSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  useEffect(() => { setMenuOpen(false); setNotificationsOpen(false); setProfileOpen(false); }, [location]);

  useEffect(() => { if (!isAdmin) setLocation("/admin", { replace: true }); }, [isAdmin, setLocation]);
  if (!isAdmin) return <div className="p-6">Your admin session has ended. Returning to sign-in…</div>;

  return (
    <div className="bazunk-admin min-h-screen bg-[#f3f6fc] text-[#152345] dark:bg-[#0b1427] dark:text-slate-100 lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <img src="/bazunk-logo.png" alt="Bazunk admin" className="h-8 w-auto object-contain" />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen} className="rounded-lg p-2 text-gray-900 hover:bg-gray-100"><Menu className="h-6 w-6" /></button>
      </header>
      {menuOpen && <button type="button" aria-label="Close admin menu" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar — always visible */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#101c35] shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[238px] lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10 flex flex-col gap-2 relative">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" className="absolute right-3 top-4 rounded-lg p-2 text-white lg:hidden"><X className="h-5 w-5" /></button>
          <img src="/bazunk-logo.png" alt="Bazunk" className="h-9 w-auto object-contain self-start rounded bg-white px-2 py-0.5" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F26B21]" />
            <span className="font-bold text-white text-xs tracking-wide uppercase">Admin Panel</span>
          </div>
        </div>

        <div className="px-3 pt-3"><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 text-slate-200"><Search className="h-4 w-4"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find admin page..." aria-label="Find admin page" className="w-full bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-200"/></label></div>
        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.filter(({label}) => label.toLowerCase().includes(search.toLowerCase())).map(({ label, href, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <button
                key={href}
                aria-current={active ? "page" : undefined}
                onClick={() => { setMenuOpen(false); setLocation(href); }}
                className={`admin-nav-link w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[14px] font-bold transition-colors ${
                  active
                    ? "bg-[#F26B21] text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active?"text-white":"text-orange-400"}`} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={() => { logout(); setLocation("/admin"); }}
            className="admin-sign-out w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-200 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 hidden h-[68px] items-center justify-between gap-6 border-b border-slate-200 bg-white px-6 shadow-sm dark:border-white/10 dark:bg-[#101b34] lg:flex">
          <form onSubmit={e=>{e.preventDefault();const match=NAV.find(n=>n.label.toLowerCase().includes(topSearch.trim().toLowerCase()));if(topSearch.trim()&&match)setLocation(match.href);}} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <input value={topSearch} onChange={e=>setTopSearch(e.target.value)} list="bazunk-admin-search" placeholder="Search anything..." aria-label="Search admin pages" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-[#20304f] dark:text-white"/>
            <datalist id="bazunk-admin-search">{NAV.map(n=><option key={n.href} value={n.label}/>)}</datalist>
          </form>
          <div className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={()=>setTheme(isDark?"light":"dark")} aria-label={isDark?"Switch to light mode":"Switch to dark mode"} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm dark:bg-white/10"><Sun className={`h-4 w-4 ${isDark?"text-slate-500":"text-amber-500"}`}/><Moon className={`h-4 w-4 ${isDark?"text-indigo-300":"text-slate-400"}`}/></button>
            <div className="relative">
              <button type="button" onClick={()=>{setNotificationsOpen(!notificationsOpen);setProfileOpen(false);}} aria-label="Open admin activity shortcuts" title="Review activity" aria-expanded={notificationsOpen} className="rounded-full border border-slate-200 bg-slate-50 p-2 dark:border-white/20 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/10"><Bell className="h-5 w-5"/></button>
              {notificationsOpen&&<div className="admin-header-popover absolute right-0 top-11 z-30 w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-white/10 dark:bg-[#1d2d4a]">
                <p className="px-2 pb-2 font-extrabold">Review activity</p>
                {[[ "Orders", "/admin/orders", ShoppingCart ],[ "Disputes", "/admin/disputes", Shield ],[ "Returns", "/admin/returns", RotateCcw ],[ "Support requests", "/admin/support", LifeBuoy ],[ "Seller compliance", "/admin/seller-compliance", ShieldCheck ]].map(([label,href,Icon]:any)=><button key={href} type="button" onClick={()=>setLocation(href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-100 dark:hover:bg-white/10"><Icon className="h-4 w-4 text-orange-400"/>{label}</button>)}
                <p className="px-2 pt-2 text-xs text-slate-600 dark:text-slate-300">Shortcuts to live admin sections, not unread-count alerts.</p>
              </div>}
            </div>
            <div className="relative">
              <button type="button" onClick={()=>{setProfileOpen(!profileOpen);setNotificationsOpen(false);}} aria-label="Open admin account menu" title="Admin account menu" aria-expanded={profileOpen} className="flex items-center gap-2 rounded-xl bg-slate-100 py-1 pr-2 dark:bg-white/10 border-l border-slate-200 pl-4 dark:border-white/10"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">A</span><span className="text-sm font-bold">Admin</span><ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${profileOpen?"rotate-180":""}`}/></button>
              {profileOpen&&<div className="admin-header-popover absolute right-0 top-12 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#1d2d4a]">
                <button type="button" onClick={()=>setLocation("/admin/settings")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10"><Settings className="h-4 w-4"/>Admin settings</button>
                <button type="button" onClick={()=>{logout();setLocation("/admin");}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-500/10"><LogOut className="h-4 w-4"/>Sign out</button>
              </div>}
            </div>
          </div>
        </header>
        <div className="flex justify-end px-4 pt-3 lg:hidden"><button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow dark:bg-[#1a2c4e]" aria-label="Toggle admin theme">{isDark ? <Moon className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}{isDark ? "Dark mode" : "Light mode"}</button></div>
        <main className="w-full min-w-0 p-3 sm:p-5 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
