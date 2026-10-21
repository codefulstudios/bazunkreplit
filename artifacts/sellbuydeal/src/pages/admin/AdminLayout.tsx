import "./admin-theme.css";
import "./modern-blue-admin.css";
import {ADMIN_COMPONENT_KEY,DEFAULT_COMPONENT_STYLE,validateAdminComponentStyle} from "./AdminComponentEditor";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// AdminLayout remounts on route changes; retain the sidebar position across pages.
let savedAdminNavScrollTop = 0;
import { useLocation } from "wouter";
import { Camera, CircleDollarSign, LayoutDashboard, Users, Settings, CreditCard, ShoppingCart, LogOut, ShieldCheck, Package, Shield, RotateCcw, Gavel, Zap, LifeBuoy, Gift, Megaphone, List, ArrowDownToLine, FileText, Star, Activity, ScrollText, ServerCog, Flag, Mail, Menu, X, Sun, Moon, Search, ChevronDown, Bell, CalendarDays } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { AdminAlertsPopover } from "@/components/admin/AdminAlertsPopover";
import { useAdmin } from "@/context/AdminContext";

const NAV = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Design Center", href: "/admin/design-system", icon: ShieldCheck },
  { label: "Users",        href: "/admin/users",        icon: Users           },
  { label: "Seller Compliance", href: "/admin/seller-compliance", icon: ShieldCheck },
  { label: "TrustProof", href: "/admin/trust-proof", icon: ShieldCheck },
  { label: "Listings", href: "/admin/listings", icon: Package },
  { label: "Importer Control", href: "/admin/importer-control", icon: Package },
  { label: "Snap & Sell AI", href: "/admin/snap-sell", icon: Camera },
  { label: "DealPilot", href: "/admin/deal-pilot", icon: Search },
  { label: "Find It", href: "/admin/find-it", icon: Search },
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

const NAV_GROUPS = [
  { id:"overview", label:"Overview", icon:LayoutDashboard, pages:["Dashboard","Design Center"] },
  { id:"accounts", label:"Accounts & Trust", icon:Users, pages:["Users","Seller Compliance","TrustProof","Reviews"] },
  { id:"marketplace", label:"Marketplace", icon:Package, pages:["Listings","Importer Control","Snap & Sell AI","DealPilot","Find It","Importers","Demo Creator","Classifieds","Auctions","Flash Sales"] },
  { id:"commerce", label:"Orders & Payments", icon:ShoppingCart, pages:["Orders","Payments","Disputes","Returns"] },
  { id:"growth", label:"Growth & Rewards", icon:Megaphone, pages:["Cashback","Rewards","Credits Economy","Referrals","Promotions"] },
  { id:"support", label:"Support & Messaging", icon:LifeBuoy, pages:["Support","Chatwoot Settings","Email Templates"] },
  { id:"system", label:"Platform & Settings", icon:Settings, pages:["Audit Log","System Status","Feature Toggles","Settings"] }
] as const;

let savedAdminExpandedGroups: Record<string,boolean> = {overview:true,accounts:true,marketplace:true,commerce:true,growth:false,support:false,system:false};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, isAdmin, authFetch } = useAdmin();
  const [componentStyle,setComponentStyle]=useState(DEFAULT_COMPONENT_STYLE);
  useEffect(()=>{let active=true;const refresh=()=>authFetch("/api/admin/settings").then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(active){try{setComponentStyle(validateAdminComponentStyle(JSON.parse(data[ADMIN_COMPONENT_KEY]||"{}")))}catch{setComponentStyle(DEFAULT_COMPONENT_STYLE)}}}).catch(()=>{});void refresh();window.addEventListener("bazunk-settings-updated",refresh);return()=>{active=false;window.removeEventListener("bazunk-settings-updated",refresh)}},[authFetch]);
  const [location, setLocation] = useLocation();
  useEffect(()=>{window.dispatchEvent(new Event("bazunk-design-route-change"));},[location]);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => { if (navRef.current) navRef.current.scrollTop = savedAdminNavScrollTop; }, []);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string,boolean>>(()=>({...savedAdminExpandedGroups}));
  const [profileOpen, setProfileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  useEffect(() => {
    setMenuOpen(false); setProfileOpen(false);
    const current=NAV.find(n=>n.href===location||location.startsWith(n.href+"/"));
    const group=NAV_GROUPS.find(g=>current&&g.pages.some(label=>label===current.label));
    if(group&&!savedAdminExpandedGroups[group.id]){
      savedAdminExpandedGroups={...savedAdminExpandedGroups,[group.id]:true};
      setExpandedGroups({...savedAdminExpandedGroups});
    }
  }, [location]);
  function toggleGroup(id:string){
    savedAdminExpandedGroups={...expandedGroups,[id]:!expandedGroups[id]};
    setExpandedGroups({...savedAdminExpandedGroups});
  }

  useEffect(() => { if (!isAdmin) setLocation("/admin", { replace: true }); }, [isAdmin, setLocation]);
  if (!isAdmin) return <div className="p-6">Your admin session has ended. Returning to sign-in…</div>;

  return (
    <div style={{"--bz-admin-sidebar-width":`${componentStyle.sidebar}px`,"--bz-admin-radius":`${componentStyle.radius}px`,"--bz-admin-font-size":`${componentStyle.body}px`,"--bz-admin-heading-size":`${componentStyle.heading}px`,"--bz-admin-density":componentStyle.density,"--bz-admin-card-shadow":componentStyle.shadow==="none"?"none":componentStyle.shadow==="medium"?"0 8px 24px rgb(15 23 42 / 12%)":"0 2px 10px rgb(15 23 42 / 4%)"} as React.CSSProperties} data-admin-button={componentStyle.button} data-admin-header={componentStyle.header} data-admin-sidebar={componentStyle.sidebarStyle} data-admin-sticky={componentStyle.stickyHeader} className="bazunk-admin min-h-screen bg-[#f5f8fd] text-[#0f172a] dark:bg-[#0b1427] dark:text-slate-100 lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <img src="/bazunk-logo.png" alt="Bazunk admin" className="h-8 w-auto object-contain" />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen} className="rounded-lg p-2 text-gray-900 hover:bg-gray-100"><Menu className="h-6 w-6" /></button>
      </header>
      {menuOpen && <button type="button" aria-label="Close admin menu" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar — always visible */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-[#0a1830] shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[var(--bz-admin-sidebar-width)] lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2 relative">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" className="absolute right-3 top-4 rounded-lg p-2 text-white lg:hidden"><X className="h-5 w-5" /></button>
          <img src="/bazunk-logo.png" alt="Bazunk" className="h-9 w-auto object-contain self-start rounded bg-white px-2 py-0.5" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F26B21]" />
            <span className="font-bold text-blue-700 dark:text-white text-xs tracking-wide uppercase">Admin Panel</span>
          </div>
        </div>

        <div className="px-3 pt-3"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/10 px-3 text-slate-700 dark:text-slate-200"><Search className="h-4 w-4"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find admin page..." aria-label="Find admin page" className="w-full bg-transparent py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-500 dark:placeholder:text-slate-200"/></label></div>
        {/* Nav */}
        <nav ref={navRef} onScroll={e => { savedAdminNavScrollTop = e.currentTarget.scrollTop; }} className="min-h-0 flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_GROUPS.map(group=>{
            const pages=NAV.filter(n=>group.pages.some(label=>label===n.label) &&
              (!search.trim()||n.label.toLowerCase().includes(search.trim().toLowerCase())||group.label.toLowerCase().includes(search.trim().toLowerCase())));
            if(!pages.length)return null;
            const Icon=group.icon;
            const expanded=!!search.trim()||!!expandedGroups[group.id];
            const activeCount=pages.some(n=>location===n.href||location.startsWith(n.href+"/"));
            return <div key={group.id} className="mb-1">
              <button type="button" onClick={()=>toggleGroup(group.id)} aria-expanded={expanded}
                aria-controls={`admin-nav-${group.id}`}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide transition-colors hover:bg-blue-50 dark:hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${activeCount?"text-blue-700 dark:text-blue-300":"text-slate-700 dark:text-white"}`}>
                <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"/>
                <span className="flex-1">{group.label}</span>
                <span className="rounded-lg bg-blue-100 dark:bg-white/10 px-1.5 text-xs font-bold text-blue-700 dark:text-white">{pages.length}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded?"rotate-180":""}`}/>
              </button>
              {expanded&&<div id={`admin-nav-${group.id}`} className="mt-0.5 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-500/30 pl-2 ml-4">
                {pages.map(({label,href,icon:PageIcon})=>{
                  const active=location===href||location.startsWith(href+"/");
                  return <button type="button" key={href} aria-current={active?"page":undefined}
                    onClick={()=>{setMenuOpen(false);setLocation(href);}}
                    className={`admin-nav-link flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${active?"bg-[#1769ff] text-white":"text-slate-700 hover:bg-blue-50 hover:text-blue-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"}`}>
                    <PageIcon className={`h-4 w-4 shrink-0 ${active?"text-white":"text-blue-500"}`}/>{label}
                  </button>;
                })}
              </div>}
            </div>;
          })}
          {search.trim()&&!NAV.some(n=>n.label.toLowerCase().includes(search.trim().toLowerCase())) &&
            !NAV_GROUPS.some(g=>g.label.toLowerCase().includes(search.trim().toLowerCase())) &&
            <p className="p-3 text-sm font-semibold text-slate-200">No matching admin pages.</p>}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 border-t border-slate-200 dark:border-white/10 pt-3">
          <button
            onClick={() => { logout(); setLocation("/admin"); }}
            className="admin-sign-out w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:text-red-500 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="admin-topbar sticky top-0 z-20 hidden h-[68px] items-center justify-between gap-6 border-b border-slate-200 bg-white px-6 shadow-sm dark:border-white/10 dark:bg-[#101b34] lg:flex">
          <AdminGlobalSearch />
          <div className="flex shrink-0 items-center gap-4">
            <button type="button" onClick={()=>setTheme(isDark?"light":"dark")} aria-label={isDark?"Switch to light mode":"Switch to dark mode"} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm dark:bg-white/10"><Sun className={`h-4 w-4 ${isDark?"text-slate-500":"text-amber-500"}`}/><Moon className={`h-4 w-4 ${isDark?"text-indigo-300":"text-slate-400"}`}/></button>
            <AdminAlertsPopover />
            <div className="relative">
              <button type="button" onClick={()=>setProfileOpen(!profileOpen)} aria-label="Open admin account menu" title="Admin account menu" aria-expanded={profileOpen} className="flex items-center gap-2 rounded-xl bg-slate-100 py-1 pr-2 dark:bg-white/10 border-l border-slate-200 pl-4 dark:border-white/10"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">A</span><span className="text-sm font-bold">Admin</span><ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${profileOpen?"rotate-180":""}`}/></button>
              {profileOpen&&<div className="admin-header-popover absolute right-0 top-12 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#1d2d4a]">
                <button type="button" onClick={()=>setLocation("/admin/settings")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10"><Settings className="h-4 w-4"/>Admin settings</button>
                <button type="button" onClick={()=>{logout();setLocation("/admin");}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-500/10"><LogOut className="h-4 w-4"/>Sign out</button>
              </div>}
            </div>
          </div>
        </header>
        <div className="space-y-3 px-4 pt-3 lg:hidden"><div className="flex flex-wrap items-center justify-between gap-2"><AdminAlertsPopover mobile/><button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold shadow dark:bg-[#1a2c4e]" aria-label="Toggle admin theme">{isDark ? <Moon className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}{isDark ? "Dark mode" : "Light mode"}</button></div><AdminGlobalSearch compact/></div>
        <main className="w-full min-w-0 p-3 sm:p-5 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
