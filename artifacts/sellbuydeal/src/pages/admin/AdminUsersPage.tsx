import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Search, Ban, CheckCircle, RefreshCw, Trophy,
  ChevronDown, ChevronUp, Save, Loader2, Pencil, Trash2, X, AlertTriangle,
  Mail, UserPlus, Download,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { AdminBulkSelection } from "@/components/admin/AdminBulkSelection";
import { useAdmin } from "@/context/AdminContext";

interface User {
  id: string; email: string; name: string | null;
  credits: string; banned: boolean; seller_type?: "private" | "sole_trader" | "business"; created_at: string;
  listings_total: number; listings_active: number; sold: number; sales_value: number; bought: number; spent: number;
  messages_sent: number; messages_received: number; conversations: number; reviews_received: number; rating: number;
  disputes_total: number; disputes_open: number; live_streams: number; live_viewers: number; last_activity: string;
}

const MILESTONE_DEFS = [
  { id: "welcome-bonus",     name: "Welcome to Bazunk!", task: "Join Bazunk (one-time)",        total: 1  },
  { id: "first-listing",     name: "First Listing",      task: "Post first item for sale",      total: 1  },
  { id: "first-live",        name: "Go Live!",           task: "Host first live stream",        total: 1  },
  { id: "first-flash-sale",  name: "Flash Sale Pro",     task: "Run first flash sale",          total: 1  },
  { id: "quick-seller",      name: "Quick Seller",       task: "Sell 3 items this month",       total: 3  },
  { id: "power-seller",      name: "Power Seller",       task: "Sell 10 items this month",      total: 10 },
  { id: "trusted-seller",    name: "Trusted Seller",     task: "5 positive reviews in a row",   total: 5  },
  { id: "top-rated",         name: "Top Rated",          task: "10 positive reviews in a row",  total: 10 },
  { id: "active-lister",     name: "Active Lister",      task: "List 5 items this month",       total: 5  },
  { id: "inventory-master",  name: "Inventory Master",   task: "List 20 items this month",      total: 20 },
  { id: "consistent-seller", name: "Consistent Seller",  task: "7-day active streak",           total: 7  },
  { id: "dedicated-seller",  name: "Dedicated Seller",   task: "30-day active streak",          total: 30 },
];

export function AdminUsersPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [loading, setLoading] = useState(true);
  const [accountFilter,setAccountFilter]=useState<"all"|"active"|"suspended">("all");
  const [sellerFilter,setSellerFilter]=useState<"all"|"private"|"business">("all");
  const [selectedUserIds,setSelectedUserIds]=useState<string[]>([]);
  const visibleUsers=users.filter(u=>(accountFilter==="all"||(accountFilter==="suspended"?u.banned:!u.banned))
    &&(sellerFilter==="all"||(sellerFilter==="private"?(!u.seller_type||u.seller_type==="private"):u.seller_type!=="private")));
  const visibleUserIds=visibleUsers.map(u=>u.email);

  // Credits
  const [creditInput, setCreditInput] = useState<Record<string, string>>({});
  const [creditReason, setCreditReason] = useState<Record<string, string>>({});
  const [creditSaving, setCreditSaving] = useState<string | null>(null);
  const [creditResult, setCreditResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Ban
  const [banSaving, setBanSaving] = useState<string | null>(null);

  // Edit user modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editSellerType, setEditSellerType] = useState<"private" | "sole_trader" | "business">("private");
  const [editReviewReason, setEditReviewReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Load / sync feedback
  const [loadError, setLoadError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Add user modal
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addCredits, setAddCredits] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Message modal
  const [msgUser, setMsgUser] = useState<User | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Milestones
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [milestoneData, setMilestoneData] = useState<Record<string, { progress: number; completed: boolean }>>({});
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneSaving, setMilestoneSaving] = useState<string | null>(null);
  const [milestoneSaved, setMilestoneSaved] = useState<Record<string, boolean>>({});

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { load(); setSelectedUserIds([]); }, [search]);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("search", search);
      const res = await authFetch(`/api/admin/users?${params}`);
      if (res.ok) { const d = await res.json(); setUsers(d.users); setTotal(d.total); }
      else if (res.status === 401) setLoadError("Your admin session has expired — sign out and back in.");
      else setLoadError(`Couldn't load users (error ${res.status}).`);
    } catch {
      setLoadError("Couldn't reach the server.");
    } finally { setLoading(false); }
  }

  async function saveCredits(email: string, sign: 1 | -1) {
    const raw = creditInput[email] ?? "";
    const credits = parseFloat(raw);
    if (!raw || isNaN(credits) || credits <= 0) {
      setCreditResult(prev => ({ ...prev, [email]: { ok: false, msg: "Enter a valid credit amount" } }));
      return;
    }
    const amount = (credits / 100) * sign;
    setCreditSaving(email);
    setCreditResult(prev => ({ ...prev, [email]: { ok: true, msg: "" } }));
    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/credits`, {
        method: "PATCH",
        body: JSON.stringify({ amount, reason: creditReason[email] || "Admin adjustment" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCr = Math.round(data.newBalance * 100);
        setCreditResult(prev => ({ ...prev, [email]: { ok: true, msg: `✓ Saved — new balance: ${newCr.toLocaleString()} cr` } }));
        setCreditInput(prev => ({ ...prev, [email]: "" }));
        setCreditReason(prev => ({ ...prev, [email]: "" }));
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreditResult(prev => ({ ...prev, [email]: { ok: false, msg: err.error ?? "Failed to save" } }));
      }
    } finally {
      setCreditSaving(null);
      setTimeout(() => setCreditResult(prev => { const n = { ...prev }; delete n[email]; return n; }), 3500);
    }
  }

  async function toggleBan(email: string, banned: boolean) {
    setBanSaving(email);
    await authFetch(`/api/admin/users/${encodeURIComponent(email)}/ban`, {
      method: "PATCH", body: JSON.stringify({ banned: !banned }),
    });
    await load();
    setBanSaving(null);
  }

  async function saveEdit() {
    if (!editUser) return;
    const changingType = editSellerType !== (editUser.seller_type ?? "private");
    if (changingType && editReviewReason.trim().length < 20) { setEditError("Please explain the classification change in at least 20 characters."); return; }
    setEditSaving(true);
    setEditError("");
    const res = await authFetch(`/api/admin/users/${encodeURIComponent(editUser.email)}`, {
      method: "PATCH", body: JSON.stringify({ name: editName.trim() || null, sellerType: editSellerType, reviewReason: changingType ? editReviewReason.trim() : undefined }),
    });
    if (res.ok) {
      setEditUser(null);
      await load();
    } else {
      const err = await res.json().catch(() => ({}));
      setEditError(err.error ?? "Failed to save");
    }
    setEditSaving(false);
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setDeleteSaving(true);
    await authFetch(`/api/admin/users/${encodeURIComponent(deleteUser.email)}`, { method: "DELETE" });
    setDeleteUser(null);
    setDeleteSaving(false);
    await load();
  }

  async function syncUsers() {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await authFetch("/api/admin/users/sync", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setSyncMsg({ ok: false, text: d.error ?? "Sync failed" }); return; }
      const parts = [`${d.added} user${d.added === 1 ? "" : "s"} added (${d.total} total).`];
      if (d.note) parts.push(d.note);
      setSyncMsg({ ok: !d.note, text: parts.join(" ") });
      await load();
    } catch {
      setSyncMsg({ ok: false, text: "Network error — try again" });
    } finally { setSyncing(false); }
  }

  async function saveNewUser() {
    setAddSaving(true); setAddError("");
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: addEmail.trim(),
          name: addName.trim() || null,
          credits: addCredits ? parseFloat(addCredits) / 100 : 0,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setAddError(d.error ?? "Failed to add user"); return; }
      setAddOpen(false); setAddEmail(""); setAddName(""); setAddCredits("");
      await load();
    } catch {
      setAddError("Network error — try again");
    } finally { setAddSaving(false); }
  }

  async function sendMessage() {
    if (!msgUser) return;
    setMsgSending(true); setMsgResult(null);
    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(msgUser.email)}/message`, {
        method: "POST",
        body: JSON.stringify({ subject: msgSubject.trim(), body: msgBody.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsgResult({ ok: false, text: d.error ?? "Failed to send" }); return; }
      setMsgResult({ ok: true, text: "Message sent to their inbox." });
      setMsgSubject(""); setMsgBody("");
    } catch {
      setMsgResult({ ok: false, text: "Network error — try again" });
    } finally { setMsgSending(false); }
  }

  async function toggleMilestones(email: string) {
    if (expandedEmail === email) { setExpandedEmail(null); return; }
    setExpandedEmail(email);
    setMilestoneLoading(true);
    setMilestoneSaved({});
    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setMilestoneData(data.milestones ?? {});
        const inputs: Record<string, string> = {};
        for (const def of MILESTONE_DEFS) inputs[def.id] = String(data.milestones?.[def.id]?.progress ?? 0);
        setMilestoneInputs(inputs);
      }
    } finally { setMilestoneLoading(false); }
  }

  async function saveMilestone(email: string, milestoneId: string, total: number) {
    const progress = Math.min(Math.max(0, parseInt(milestoneInputs[milestoneId] ?? "0") || 0), total);
    const completed = progress >= total;
    setMilestoneSaving(milestoneId);
    const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/milestones/${milestoneId}`, {
      method: "PATCH", body: JSON.stringify({ progress, completed, total }),
    });
    if (res.ok) {
      setMilestoneData(prev => ({ ...prev, [milestoneId]: { progress, completed } }));
      setMilestoneInputs(prev => ({ ...prev, [milestoneId]: String(progress) }));
      setMilestoneSaved(prev => ({ ...prev, [milestoneId]: true }));
      setTimeout(() => setMilestoneSaved(prev => ({ ...prev, [milestoneId]: false })), 2000);
    }
    setMilestoneSaving(null);
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-[#142453] dark:text-white">Users Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncUsers} disabled={syncing}
            title="Import everyone from Clerk and from past listings, purchases and tickets"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Sync users
          </button>
          <button onClick={() => { setAddOpen(true); setAddError(""); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#4A5CE8] text-white hover:opacity-90">
            <UserPlus className="w-3.5 h-3.5" /> Add user
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40 p-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {loadError}
        </div>
      )}
      {syncMsg && (
        <div className={`mb-4 text-sm rounded-xl px-4 py-3 border ${syncMsg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {syncMsg.text}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-slate-800 dark:text-white">Account
          <select value={accountFilter} onChange={e=>{setAccountFilter(e.target.value as typeof accountFilter);setSelectedUserIds([]);}} className="ml-2 min-h-10 rounded-lg border border-slate-400 bg-white px-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
            <option value="all">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-800 dark:text-white">Seller
          <select value={sellerFilter} onChange={e=>{setSellerFilter(e.target.value as typeof sellerFilter);setSelectedUserIds([]);}} className="ml-2 min-h-10 rounded-lg border border-slate-400 bg-white px-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
            <option value="all">All types</option><option value="private">Private</option><option value="business">Business / trader</option>
          </select>
        </label>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">{visibleUsers.length} shown (up to 200 loaded)</span>
      </div>
      <div className="mb-3"><AdminBulkSelection selected={selectedUserIds} rows={visibleUsers.map(u=>({id:u.email,cells:[u.name??"",u.seller_type??"private",u.banned?"suspended":"active",u.credits,u.created_at]}))}
        columns={["Name","Seller type","Account status","Credits","Joined"]} filename="bazunk-selected-users" onClear={()=>setSelectedUserIds([])}/></div>
      <div className="admin-users-table bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2"><input type="checkbox" aria-label="Select all visible users" className="h-4 w-4"
                  checked={visibleUserIds.length>0&&visibleUserIds.every(id=>selectedUserIds.includes(id))}
                  onChange={e=>setSelectedUserIds(e.target.checked?visibleUserIds:[])}/></th>
                {["User", "Selling", "Buying", "Messages", "Reputation / Risk", "Credits", "Last activity", "Adjust Credits", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">
                  No users found{!search && " — press “Sync users” above to import your existing accounts."}
                </td></tr>
              )}
              {visibleUsers.map((u) => (
                <>
                  <tr key={u.email} className={`border-t border-gray-50 ${u.banned ? "bg-red-50/40" : "hover:bg-gray-50/40"}`}>
                    <td className="px-3 py-2"><input type="checkbox" className="h-4 w-4" aria-label={`Select user ${u.email}`}
                      checked={selectedUserIds.includes(u.email)}
                      onChange={e=>setSelectedUserIds(p=>e.target.checked?[...new Set([...p,u.email])]:p.filter(id=>id!==u.email))}/></td>
                    {/* User */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-xs">{u.email}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{u.name ?? <span className="italic">No name</span>}</p>
                      {u.banned && <span className="inline-block mt-1 text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">SUSPENDED</span>}
                    </td>

                    {/* Marketplace activity */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-800 text-xs">{Number(u.listings_total ?? 0)} listed · {Number(u.sold ?? 0)} sold</p>
                      <p className="text-[10px] text-gray-400">{u.listings_active} active · £{Number(u.sales_value || 0).toFixed(2)} sales</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-800 text-xs">{Number(u.bought ?? 0)} bought</p>
                      <p className="text-[10px] text-gray-400">£{Number(u.spent || 0).toFixed(2)} spent</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-800 text-xs">↑ {Number(u.messages_sent ?? 0)} · ↓ {Number(u.messages_received ?? 0)}</p>
                      <p className="text-[10px] text-gray-400">{Number(u.conversations ?? 0)} conversations</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-800 text-xs">{u.reviews_received ? `${Number(u.rating || 0).toFixed(1)}★ · ${u.reviews_received} reviews` : "No reviews"}</p>
                      <p className={`text-[10px] ${u.disputes_open ? "text-red-600 font-bold" : "text-gray-400"}`}>{u.disputes_open} open · {u.disputes_total} disputes</p>
                      {u.live_streams > 0 && <p className="text-[10px] text-violet-500">{u.live_streams} live streams · {u.live_viewers} viewers recorded</p>}
                    </td>

                    {/* Credits */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-[#4A5CE8] text-xs">{Math.round(parseFloat(u.credits) * 100).toLocaleString()} cr</p>
                      <p className="text-[10px] text-gray-400">£{parseFloat(u.credits).toFixed(2)}</p>
                    </td>

                    {/* Last activity */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      <p>{u.last_activity ? new Date(u.last_activity).toLocaleDateString() : "—"}</p>
                      <p className="text-[10px]">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] capitalize">{(u.seller_type ?? "private").replace("_", " ")}</p>
                    </td>

                    {/* Adjust Credits */}
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0" step="1"
                            value={creditInput[u.email] ?? ""}
                            onChange={(e) => setCreditInput(prev => ({ ...prev, [u.email]: e.target.value }))}
                            placeholder="Credits"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]"
                          />
                          <button
                            onClick={() => saveCredits(u.email, 1)}
                            disabled={creditSaving === u.email}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            {creditSaving === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Add
                          </button>
                          <button
                            onClick={() => saveCredits(u.email, -1)}
                            disabled={creditSaving === u.email}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            {creditSaving === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Deduct
                          </button>
                        </div>
                        <input
                          type="text"
                          value={creditReason[u.email] ?? ""}
                          onChange={(e) => setCreditReason(prev => ({ ...prev, [u.email]: e.target.value }))}
                          placeholder="Reason (optional)"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8] text-gray-600"
                        />
                        {creditResult[u.email] && (
                          <p className={`text-[10px] font-semibold ${creditResult[u.email].ok ? "text-emerald-600" : "text-red-500"}`}>
                            {creditResult[u.email].msg}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditUser(u); setEditName(u.name ?? ""); setEditSellerType(u.seller_type ?? "private"); setEditReviewReason(""); setEditError(""); }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>

                        {/* Message */}
                        <button
                          onClick={() => { setMsgUser(u); setMsgSubject(""); setMsgBody(""); setMsgResult(null); }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                          title="Send a message to their inbox"
                        >
                          <Mail className="w-3.5 h-3.5" /> Message
                        </button>

                        {/* Suspend / unsuspend */}
                        <button
                          onClick={() => toggleBan(u.email, u.banned)}
                          disabled={banSaving === u.email}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            u.banned
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {banSaving === u.email
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : u.banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {u.banned ? "Unsuspend" : "Suspend"}
                        </button>

                        {/* Milestones */}
                        <button
                          onClick={() => toggleMilestones(u.email)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                            expandedEmail === u.email
                              ? "bg-[#4A5CE8] text-white"
                              : "bg-[#4A5CE8]/10 text-[#4A5CE8] hover:bg-[#4A5CE8]/20"
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {expandedEmail === u.email ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedEmail === u.email && (
                    <tr key={`${u.email}-milestones`} className="bg-[#4A5CE8]/3 border-t border-[#4A5CE8]/10">
                      <td colSpan={10} className="px-4 py-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-[#4A5CE8]" />
                            <span className="text-sm font-bold text-gray-900">Milestones — {u.email}</span>
                          </div>
                          {milestoneLoading && <Loader2 className="w-4 h-4 text-[#4A5CE8] animate-spin" />}
                        </div>

                        {milestoneLoading ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {MILESTONE_DEFS.map((def) => {
                              const current = milestoneData[def.id] ?? { progress: 0, completed: false };
                              const inputVal = milestoneInputs[def.id] ?? "0";
                              const pct = Math.min(100, Math.round((current.progress / def.total) * 100));
                              const isSaving = milestoneSaving === def.id;
                              const isSaved = milestoneSaved[def.id];

                              return (
                                <div key={def.id} className={`bg-white rounded-xl border p-3 ${current.completed ? "border-emerald-200" : "border-gray-100"}`}>
                                  <div className="flex items-start justify-between mb-1">
                                    <div>
                                      <p className="text-xs font-bold text-gray-900 leading-tight">{def.name}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{def.task}</p>
                                    </div>
                                    {current.completed && (
                                      <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">DONE</span>
                                    )}
                                  </div>

                                  <div className="my-2">
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                      <span>Progress</span>
                                      <span className="font-bold">{current.progress}/{def.total}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${current.completed ? "bg-emerald-500" : "bg-[#4A5CE8]"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-2">
                                    <input
                                      type="number" min="0" max={def.total}
                                      value={inputVal}
                                      onChange={(e) => setMilestoneInputs(prev => ({ ...prev, [def.id]: e.target.value }))}
                                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]"
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] text-gray-400">/ {def.total}</span>
                                    <button
                                      onClick={() => saveMilestone(u.email, def.id, def.total)}
                                      disabled={isSaving}
                                      className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                                        isSaved
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "bg-[#4A5CE8]/10 text-[#4A5CE8] hover:bg-[#4A5CE8]/20"
                                      }`}
                                    >
                                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : isSaved ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                      {isSaved ? "Saved" : "Save"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Add user</h3>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="Email address *" type="email"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Name (optional)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
              <input value={addCredits} onChange={e => setAddCredits(e.target.value)} placeholder="Starting credits (optional)" type="number" min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
              <p className="text-[11px] text-gray-400">This creates their Bazunk account record. They still sign in with their own login on the site.</p>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <button onClick={saveNewUser} disabled={addSaving || !addEmail.trim()}
                className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {addSaving && <Loader2 className="w-4 h-4 animate-spin" />} Add user
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Message Modal ── */}
      {msgUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setMsgUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-gray-900">Message {msgUser.name ?? msgUser.email}</h3>
              <button onClick={() => setMsgUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Appears in their inbox as “From Bazunk”.</p>
            <div className="space-y-3">
              <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Subject"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
              <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Write your message…" rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 resize-none" />
              {msgResult && <p className={`text-sm ${msgResult.ok ? "text-green-600" : "text-red-600"}`}>{msgResult.text}</p>}
              <button onClick={sendMessage} disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
                className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {msgSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-gray-900">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">{editUser.email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Seller type</label>
                <select value={editSellerType} onChange={e => setEditSellerType(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="private">Private seller — 0% seller fee</option>
                  <option value="sole_trader">Sole trader — business seller fees apply</option>
                  <option value="business">Registered business — business seller fees apply</option>
                </select>
              </div>

              {editUser && editSellerType !== (editUser.seller_type ?? "private") && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Reason for seller classification change (required)</label>
                  <textarea value={editReviewReason} onChange={e => setEditReviewReason(e.target.value)}
                    maxLength={2000} rows={3} placeholder="Explain the evidence and why this seller should be reclassified..."
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  <p className="text-xs text-gray-500 mt-1">Minimum 20 characters. The decision and reason are recorded in the admin audit log.</p>
                </div>
              )}

              {editError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{editError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Delete User</h2>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-sm font-bold text-gray-900 bg-gray-50 rounded-xl px-3 py-2 mb-5">
              {deleteUser.email}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              All their data (credits, listings, orders) will remain in the database but their account login will be removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
