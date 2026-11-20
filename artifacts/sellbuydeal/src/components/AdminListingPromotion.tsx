import { useState, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Megaphone, Loader2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";


type Option = { type: string; label: string; daysValid: number };
type Active = { id: number; type: string; expires_at: string };

export function AdminListingPromotion({ listingId, title, status }: { listingId: string | number; title: string; status: string }) {
  const { authFetch } = useAdmin();
  const selectId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [active, setActive] = useState<Active[]>([]);
  const [type, setType] = useState("");
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(open&&!dialog.open)dialog.showModal();
    else if(!open&&dialog.open)dialog.close();
  },[open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(""); setSuccess(""); setOptions([]); setActive([]); setType("");
    async function load() {
      try {
        const res = await authFetch(`/api/admin/listings/${listingId}/promotions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load promotions.");
        if (!Array.isArray(data.options) || !Array.isArray(data.active) || !data.options.every((o: Option) => typeof o.type === "string" && typeof o.label === "string" && Number.isInteger(o.daysValid)) || !data.active.every((a: Active) => typeof a.type === "string" && Number.isFinite(new Date(a.expires_at).getTime()))) throw new Error("Invalid promotions response. Please retry.");
        if (!cancelled) { setOptions(data.options); setActive(data.active); setType(data.options[0]?.type || ""); setDays(String(data.options[0]?.daysValid || 7)); }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load promotions."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, listingId, authFetch, retry]);

  async function apply() {
    const duration = Number(days);
    if (!Number.isInteger(duration) || duration < 1 || duration > 365 || !type) { setError("Choose a promotion and 1–365 whole days."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await authFetch(`/api/admin/listings/${listingId}/promotions`, { method: "POST", body: JSON.stringify({ type, days: duration }) });
      const data = await res.json();
      if (!res.ok || data.ok !== true) throw new Error(data.error || "Promotion could not be saved.");
      const p = data.promotion as Active;
      if (!p || typeof p.type !== "string" || !Number.isFinite(new Date(p.expires_at).getTime())) throw new Error("Could not confirm the promotion. Close and reopen to check before retrying.");
      setActive(prev => [...prev.filter(a => a.type !== p.type), p]);
      setSuccess(`${options.find(o => o.type === p.type)?.label || p.type} applied until ${new Date(p.expires_at).toLocaleString()}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Promotion could not be saved."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} title={`Promote ${title}`} aria-label={`Promote ${title}`} className="inline-flex items-center justify-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 h-7 text-xs font-semibold"><Megaphone className="w-3.5 h-3.5" /> Promote</button>
    {createPortal(<dialog ref={dialogRef} onClose={()=>setOpen(false)} onCancel={e=>{if(busy)e.preventDefault();}} className="fixed inset-0 m-auto w-[min(94vw,34rem)] max-h-[85dvh] overflow-y-auto rounded-2xl border-2 border-orange-400 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/75">
        <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">Promote listing</h2><button type="button" onClick={()=>setOpen(false)} disabled={busy} aria-label="Close promotion dialog" className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-bold">Close</button></div>
        <p className="mt-1 mb-3 text-sm text-slate-600">{title}</p>
        <p className="text-sm rounded-xl bg-purple-50 p-3 text-purple-800">Admin promotion · No seller credits charged. Duration starts immediately. Applying the same type again resets its expiry; other promotions stay active.</p>
        {status !== "active" && status !== "approved" && <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">This listing is {status}. Promotion does not publish it or change its status, and its duration still starts now.</p>}
        {loading ? <p className="flex gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading promotions…</p> : <>
          {active.length > 0 && <div className="text-sm"><h3 className="font-semibold mb-2">Active promotions</h3><ul className="space-y-2">{active.map(a => <li key={a.id}>{options.find(o => o.type === a.type)?.label || a.type} <span className="text-gray-500">· until {new Date(a.expires_at).toLocaleString()}</span></li>)}</ul></div>}
          {options.length > 0 ? <>
            <div className="space-y-1">
              <label htmlFor={selectId} className="text-sm font-semibold">Promotion</label>
              <select id={selectId} value={type} disabled={busy} onChange={e=>{const value=e.target.value;setType(value);setDays(String(options.find(o=>o.type===value)?.daysValid||7));setSuccess("");}} className="block w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900">
                {options.map(o=><option key={o.type} value={o.type}>{o.label}</option>)}
              </select>
            </div>
            <label className="text-sm font-semibold">Duration in days<input type="number" min={1} max={365} step={1} value={days} disabled={busy} onChange={e => { setDays(e.target.value); setSuccess(""); }} className="block w-full border rounded-lg p-2 mt-1" /></label>
            <button type="button" onClick={apply} disabled={busy} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-3 font-bold disabled:opacity-50">{busy ? "Applying…" : "Apply promotion"}</button>
          </> : !error && <p className="text-sm text-gray-500">No timed listing promotions are currently enabled.</p>}
        </>}
        {error && <div role="alert" className="text-sm text-red-700">{error}{!options.length && !loading && <button type="button" onClick={() => setRetry(v => v + 1)} className="ml-2 underline">Retry</button>}</div>}
        {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
        <p className="text-xs text-gray-500">Cancel promotions through Admin → Promotions. One-off tools and unavailable features are excluded.</p>
    </dialog>, document.body)}
  </>;
}
