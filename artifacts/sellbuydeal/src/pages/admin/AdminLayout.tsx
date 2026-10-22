import "./admin-theme.css";
import "./modern-blue-admin.css";
import "./admin-wordpress.css";
import {ADMIN_COMPONENT_KEY,DEFAULT_COMPONENT_STYLE,validateAdminComponentStyle} from "./AdminComponentEditor";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// AdminLayout remounts on route changes; retain the sidebar position across pages.
let savedAdminNavScrollTop = 0;
let savedSidebarCollapsed = false;
import { useLocation } from "wouter";
import { Camera, CircleDollarSign, LayoutDashboard, Users, Settings, CreditCard, ShoppingCart, LogOut, ShieldCheck, Package, Shield, RotateCcw, Gavel, Zap, LifeBuoy, Gift, Megaphone, List, ArrowDownToLine, FileText, Star, Activity, ScrollText, ServerCog, Flag, Mail, Menu, X, Sun, Moon, Search, ChevronDown, ChevronLeft, ChevronRight, Bell, CalendarDays } from "lucide-react";
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
  {id:"listings",label:"Listings",icon:Package,href:"/admin/listings",pages:["Listings","Classifieds","Auctions","Flash Sales","Snap & Sell AI","DealPilot","Find It"]},
  {id:"orders",label:"Orders",icon:ShoppingCart,href:"/admin/orders",pages:["Orders","Disputes","Returns"]},
  {id:"customers",label:"Customers",icon:Users,href:"/admin/users",pages:["Users","Reviews","Support"]},
  {id:"sellers",label:"Sellers",icon:ShieldCheck,href:"/admin/seller-compliance",pages:["Seller Compliance","TrustProof"]},
  {id:"payments",label:"Payments",icon:CreditCard,href:"/admin/payments",pages:["Payments","Credits Economy"]},
  {id:"marketing",label:"Marketing",icon:Megaphone,href:"/admin/promotions",pages:["Promotions","Cashback","Rewards","Referrals"]},
  {id:"content",label:"Content",icon:FileText,href:"/admin/content",pages:["Email Templates","Demo Creator"]},
  {id:"design",label:"Design Center",icon:ShieldCheck,href:"/admin/design-system",pages:["Design Center"]},
  {id:"importers",label:"Importers",icon:ArrowDownToLine,href:"/admin/imports",pages:["Importers","Importer Control"]},
  {id:"analytics",label:"Analytics",icon:Activity,href:"/admin/analytics",pages:["System Status","Audit Log"]},
  {id:"settings",label:"Settings",icon:Settings,href:"/admin/settings",pages:["Settings","Feature Toggles","Chatwoot Settings"]}
] as const;

const DESIGN_SECTIONS = [
  ["assistant","AI Design Assistant"],["themes","Theme Gallery"],["preview","Live Preview"],
  ["colours","Colours"],["components","Admin Appearance"],["content","Pages & Branding"],["history","History & Restore"]
] as const;
let savedAdminExpandedGroups: Record<string,boolean> = {};
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, isAdmin, authFetch } = useAdmin();
  const [componentStyle,setComponentStyle]=useState({...DEFAULT_COMPONENT_STYLE,sidebar:260});
  useEffect(()=>{let active=true;const refresh=()=>authFetch("/api/admin/settings").then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(active){try{setComponentStyle(validateAdminComponentStyle(JSON.parse(data[ADMIN_COMPONENT_KEY]||'{"sidebar":260}')))}catch{setComponentStyle(DEFAULT_COMPONENT_STYLE)}}}).catch(()=>{});void refresh();window.addEventListener("bazunk-settings-updated",refresh);return()=>{active=false;window.removeEventListener("bazunk-settings-updated",refresh)}},[authFetch]);
  const [location, setLocation] = useLocation();
  useEffect(()=>{window.dispatchEvent(new Event("bazunk-design-route-change"));},[location]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed] = useState(()=>savedSidebarCollapsed);
  const toggleSidebar=()=>setSidebarCollapsed(previous=>{savedSidebarCollapsed=!previous;return !previous});
  const navRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => { if (navRef.current) navRef.current.scrollTop = savedAdminNavScrollTop; }, []);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string,boolean>>(()=>({...savedAdminExpandedGroups}));
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDesignSection,setSelectedDesignSection]=useState(()=>window.sessionStorage.getItem("bazunk-design-section")||"assistant");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  useEffect(() => {
    setMenuOpen(false); setProfileOpen(false);
    const current=NAV.find(n=>n.href===location||location.startsWith(n.href+"/"));
    const group=NAV_GROUPS.find(g=>location===g.href||(current&&g.pages.some(label=>label===current.label)));
    // Keep the navigation tidy: only the group for the current page opens.
    savedAdminExpandedGroups=Object.fromEntries(NAV_GROUPS.map(g=>[g.id,g.id===group?.id]));
    setExpandedGroups({...savedAdminExpandedGroups});
  }, [location]);
  function toggleGroup(id:string){
    savedAdminExpandedGroups={...expandedGroups,[id]:!expandedGroups[id]};
    setExpandedGroups({...savedAdminExpandedGroups});
  }

  useEffect(() => { if (!isAdmin) setLocation("/admin", { replace: true }); }, [isAdmin, setLocation]);
  if (!isAdmin) return <div className="p-6">Your admin session has ended. Returning to sign-in…</div>;

  return (
    <div style={{fontFamily:componentStyle.font+", ui-sans-serif, system-ui, sans-serif","--bz-admin-sidebar-width":`${componentStyle.sidebar}px`,"--bz-admin-radius":`${componentStyle.radius}px`,"--bz-admin-font-size":`${componentStyle.body}px`,"--bz-admin-heading-size":`${componentStyle.heading}px`,"--bz-admin-density":componentStyle.density,"--bz-admin-card-shadow":componentStyle.shadow==="none"?"none":componentStyle.shadow==="medium"?"0 8px 24px rgb(15 23 42 / 12%)":"0 2px 10px rgb(15 23 42 / 4%)"} as React.CSSProperties} data-admin-button={componentStyle.button} data-admin-header={componentStyle.header} data-admin-sidebar={componentStyle.sidebarStyle} data-admin-sticky={componentStyle.stickyHeader} data-sidebar-collapsed={sidebarCollapsed} className="bazunk-admin bazunk-admin-wp min-h-screen bg-[#f6f8fc] text-[#172339] dark:bg-[#0e1727] dark:text-slate-100 lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <img src="/bazunk-logo.png" alt="Bazunk admin" className="h-8 w-auto object-contain" />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen} className="rounded-lg p-2 text-gray-900 hover:bg-gray-100"><Menu className="h-6 w-6" /></button>
      </header>
      {menuOpen && <button type="button" aria-label="Close admin menu" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar — always visible */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-[#0a1830] shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[var(--bz-admin-sidebar-width)] lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="admin-sidebar-brand px-4 py-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2 relative">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" className="absolute right-3 top-4 rounded-lg p-2 text-slate-800 dark:text-white lg:hidden"><X className="h-5 w-5" /></button>
          <img src="/bazunk-logo.png" alt="Bazunk" className="h-9 w-auto object-contain self-start rounded bg-white px-2 py-0.5" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-blue-700 dark:text-white text-xs tracking-wide uppercase">Admin Panel</span>
          </div>
          <button type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed?"Expand admin sidebar":"Collapse admin sidebar"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed?"Expand menu":"Collapse menu"} className="admin-sidebar-collapse hidden lg:flex absolute right-3 top-5 h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 dark:border-slate-600 dark:bg-[#1e3452] dark:text-white">{sidebarCollapsed?<ChevronRight className="h-4 w-4"/>:<ChevronLeft className="h-4 w-4"/>}</button>
        </div>

        <div className="admin-sidebar-search px-3 pt-3"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/10 px-3 text-slate-700 dark:text-slate-200"><Search className="h-4 w-4"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find admin page..." aria-label="Find admin page" className="w-full bg-transparent py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-500 dark:placeholder:text-slate-200"/></label></div>
        {/* Nav */}
        <nav ref={navRef} aria-label="Bazunk administration" onScroll={e => { savedAdminNavScrollTop = e.currentTarget.scrollTop; }} className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <button type="button" onClick={()=>{setMenuOpen(false);setLocation("/admin/dashboard")}} aria-current={location==="/admin/dashboard"?"page":undefined} className={"admin-nav-link admin-primary-link mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold "+(location==="/admin/dashboard"?"bg-[#1769ff] text-white":"text-slate-800 hover:bg-blue-50 dark:text-white dark:hover:bg-white/10")}><LayoutDashboard className="h-[18px] w-[18px] shrink-0"/><span className="admin-nav-page-label">Dashboard</span></button>
          {NAV_GROUPS.map(group=>{
            const q=search.trim().toLowerCase();
            const pages=NAV.filter(n=>group.pages.some(label=>label===n.label)&&( !q || n.label.toLowerCase().includes(q)||group.label.toLowerCase().includes(q) ));
            if(q&&!pages.length&&!group.label.toLowerCase().includes(q))return null;
            const Icon=group.icon;
            const active=location===group.href||pages.some(n=>location===n.href||location.startsWith(n.href+"/"));
            const expanded=!!q||!!expandedGroups[group.id];
            return <div key={group.id} className="admin-nav-group">
              <div className="admin-nav-group-row flex items-center gap-1">
                <button type="button" aria-current={active?"page":undefined} onClick={()=>{setMenuOpen(false);setLocation(group.href)}} title={sidebarCollapsed?group.label:undefined} className={"admin-nav-link admin-primary-link flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold "+(active?"bg-blue-50 text-blue-700 dark:bg-[#23436b] dark:text-white":"text-slate-800 hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-white/10")}>
                  <Icon className="h-[18px] w-[18px] shrink-0"/><span className="admin-nav-page-label truncate">{group.label}</span>
                </button>
                <button type="button" onClick={()=>{if(sidebarCollapsed){savedSidebarCollapsed=false;setSidebarCollapsed(false)}toggleGroup(group.id)}} aria-label={"Expand "+group.label+" submenu"} aria-expanded={expanded} aria-controls={`admin-nav-${group.id}`} className="admin-nav-group-trigger flex h-9 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10"><ChevronDown className={"h-4 w-4 transition-transform "+(expanded?"rotate-180":"")}/></button>
              </div>
              {expanded&&!sidebarCollapsed&&<div id={`admin-nav-${group.id}`} className="admin-nav-pages ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3 dark:border-slate-600">
                {group.id==="design"&&DESIGN_SECTIONS.map(([id,label])=><button key={id} type="button" data-design-section={id} onClick={()=>{setMenuOpen(false);setSelectedDesignSection(id);window.sessionStorage.setItem("bazunk-design-section",id);setLocation("/admin/design-system");window.dispatchEvent(new CustomEvent("bazunk-design-section",{detail:id}))}} aria-current={selectedDesignSection===id?"page":undefined} className={"admin-design-submenu-link block w-full rounded-md px-3 py-2 text-left text-xs font-medium "+(selectedDesignSection===id?"bg-blue-50 text-blue-700 dark:bg-[#23466e] dark:text-white":"text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-[#253e5a]")}>{label}</button>)}
                {pages.filter(p=>group.id!=="design"&&p.href!==group.href).map(({label,href,icon:PageIcon})=>{
                  const selected=location===href||location.startsWith(href+"/");
                  return <button key={href} type="button" aria-current={selected?"page":undefined} onClick={()=>{setMenuOpen(false);setLocation(href)}} className={"admin-nav-link flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium "+(selected?"bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white":"text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-white/10")}>
                    <PageIcon className="h-3.5 w-3.5 shrink-0"/><span className="admin-nav-page-label">{label}</span>
                  </button>;
                })}
              </div>}
            </div>;
          })}
          {search.trim()&&!NAV.some(n=>n.label.toLowerCase().includes(search.trim().toLowerCase()))&&!NAV_GROUPS.some(g=>g.label.toLowerCase().includes(search.trim().toLowerCase()))&&<p className="p-3 text-sm text-slate-600 dark:text-slate-300">No matching admin pages.</p>}
        </nav>

        {/* Admin identity and sign-out remain accessible in both sidebar widths. */}
        <div className="admin-sidebar-identity mx-3 mt-2 mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-[#182c49]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">A</div><div className="admin-sidebar-identity-label min-w-0"><strong className="block truncate text-sm text-slate-900 dark:text-white">Administrator</strong><span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Bazunk workspace</span></div></div>
        {/* Logout */}
        <div className="admin-sidebar-footer px-3 pb-4 border-t border-slate-200 dark:border-white/10 pt-3">
          <button
            onClick={() => { logout(); setLocation("/admin"); }}
            className="admin-sign-out w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:text-red-500 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="admin-sidebar-signout-label">Sign Out</span>
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
