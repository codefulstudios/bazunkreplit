import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { DESIGN_DEFAULTS, designSettingKey, parseDesignPalette } from "@/design-system/palette";
import { AdminLayout } from "./AdminLayout";
import { ShieldCheck, Copy, RotateCcw } from "lucide-react";

// Deliberately isolated: these settings render only inside the preview.
// Publishing requires a validated, authenticated server-side settings endpoint.
type Mode = "light" | "dark";
type Area = "storefront" | "admin";
type Palette = { background: string; surface: string; text: string; secondaryText: string; field: string; action: string; actionText: string };
const PRESETS: Record<Area, Record<Mode, Palette>> = {
  storefront: {
    light: { background:"#f8fafc",surface:"#ffffff",text:"#111827",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827" },
    dark: { background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827" },
  },
  admin: {
    light: { background:"#f3f6fc",surface:"#ffffff",text:"#152345",secondaryText:"#374151",field:"#f1f5f9",action:"#fb923c",actionText:"#111827" },
    dark: { background:"#0b1427",surface:"#17243a",text:"#ffffff",secondaryText:"#e5e7eb",field:"#263449",action:"#fb923c",actionText:"#111827" },
  },
};
const LABELS: Record<keyof Palette,string> = { background:"Page background",surface:"Card surface",text:"Main text",secondaryText:"Secondary text",field:"Dropdown / field",action:"Primary button",actionText:"Button text" };
function luminance(hex: string): number {
  const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a:string,b:string): number {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function AdminDesignSystemPage() {
  const [area,setArea]=useState<Area>("storefront");
  const [mode,setMode]=useState<Mode>("light");
  const [drafts,setDrafts]=useState(PRESETS);
  const [notice,setNotice]=useState("");
  const {authFetch}=useAdmin();
  const [saving,setSaving]=useState(false);
  useEffect(()=>{let live=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Settings unavailable");return r.json()}).then((values:Record<string,string>)=>{if(!live)return;setDrafts({storefront:{light:parseDesignPalette(values[designSettingKey("storefront","light")],"storefront","light"),dark:parseDesignPalette(values[designSettingKey("storefront","dark")],"storefront","dark")},admin:{light:parseDesignPalette(values[designSettingKey("admin","light")],"admin","light"),dark:parseDesignPalette(values[designSettingKey("admin","dark")],"admin","dark")}});}).catch(()=>{if(live)setNotice("Unable to load saved settings. Showing defaults.");});return()=>{live=false}},[authFetch]);
  async function publish(){if(!safe)return;setSaving(true);setNotice("");try{const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[designSettingKey(area,mode)]:JSON.stringify(palette)})});if(!r.ok)throw Error("Save rejected");window.dispatchEvent(new Event("bazunk-settings-updated"));setNotice("Published validated "+area+" "+mode+" palette.");}catch{setNotice("Unable to publish palette. No confirmation from server.");}finally{setSaving(false)}}
  const palette=drafts[area][mode];
  const checks=useMemo(()=>[
    ["Main text / page",palette.text,palette.background],
    ["Main text / card",palette.text,palette.surface],
    ["Secondary text / card",palette.secondaryText,palette.surface],
    ["Main text / dropdown",palette.text,palette.field],
    ["Button label",palette.actionText,palette.action],
  ].map(([label,fg,bg])=>({label,ratio:contrast(fg,bg),pass:contrast(fg,bg)>=4.5})),[palette]);
  const safe=checks.every(x=>x.pass);
  function change(key:keyof Palette,value:string) {
    setDrafts(p=>({...p,[area]:{...p[area],[mode]:{...p[area][mode],[key]:value}}}));
    setNotice("");
  }
  async function copy() {
    if(!safe){setNotice("Cannot export: fix all contrast warnings first.");return;}
    try {await navigator.clipboard.writeText(JSON.stringify({area,mode,palette},null,2));setNotice("Validated configuration copied.");}
    catch {setNotice("Clipboard unavailable. No changes were published.");}
  }
  return <AdminLayout>
    <section className="mx-auto max-w-6xl space-y-5" data-testid="protected-design-console">
      <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
        <div className="flex flex-wrap items-center gap-3"><ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400"/><h1 className="text-2xl font-bold">Protected Design System</h1></div>
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-100">Preview changes first, then publish them to the chosen area and theme. Contrast protection cannot be switched off.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm font-bold">Area <select aria-label="Preview area" value={area} onChange={e=>setArea(e.target.value as Area)} className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white"><option value="storefront">Storefront</option><option value="admin">Admin</option></select></label>
          <label className="text-sm font-bold">Theme <select aria-label="Preview theme" value={mode} onChange={e=>setMode(e.target.value as Mode)} className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white"><option value="light">Light</option><option value="dark">Dark</option></select></label>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
          <h2 className="text-lg font-bold">Colour editor</h2>
          <p className="my-2 text-sm font-medium text-slate-700 dark:text-slate-100">Each colour belongs to this preview only.</p>
          <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(LABELS) as (keyof Palette)[]).map(key=><label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 p-3 text-sm font-semibold dark:border-slate-600"><span>{LABELS[key]}</span><input aria-label={LABELS[key]+" colour"} type="color" value={palette[key]} onChange={e=>change(key,e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-slate-500" /></label>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={()=>{setDrafts(p=>({...p,[area]:{...p[area],[mode]:{...PRESETS[area][mode]}}}));setNotice("Preview reset to protected defaults.");}} className="inline-flex items-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-900 dark:bg-slate-800 dark:text-white"><RotateCcw className="h-4 w-4"/>Reset preview</button>
            <button type="button" disabled={!safe || saving} onClick={publish} className="rounded-lg bg-orange-300 px-4 py-2 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700">{saving?"Publishing…":"Publish validated palette"}</button>
            <button type="button" disabled={!safe} onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-orange-300 px-4 py-2 font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"><Copy className="h-4 w-4"/>Copy validated draft</button>
          </div>
          {notice&&<p role="status" className="mt-3 text-sm font-bold">{notice}</p>}
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-400" style={{background:palette.background,color:palette.text}}>
            <div className="p-5"><h2 className="text-xl font-bold">Live preview: {area} / {mode}</h2><p className="mt-1 text-sm font-medium" style={{color:palette.secondaryText}}>Readable copy, clear controls and strong contrast.</p>
              <div className="mt-4 space-y-3 rounded-xl border border-current p-4" style={{background:palette.surface}}>
                <h3 className="font-bold">Sample card and form</h3>
                <label className="block text-sm font-semibold">Select a category<select defaultValue="electronics" key={area+mode} style={{background:palette.field,color:palette.text}} className="mt-1 block w-full rounded-lg border border-current p-3"><option value="electronics">Electronics</option><option value="fashion">Fashion</option></select></label>
                <label className="block text-sm font-semibold">Listing title<input placeholder="Example listing" style={{background:palette.field,color:palette.text}} className="mt-1 block w-full rounded-lg border border-current p-3 placeholder:opacity-70" /></label>
                <button type="button" style={{background:palette.action,color:palette.actionText}} className="rounded-lg px-5 py-3 font-bold">Preview button</button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
            <h2 className="text-lg font-bold">Protected accessibility checks</h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">Required contrast ratio: 4.5:1 or higher.</p>
            <ul className="mt-3 space-y-2">{checks.map(c=><li key={c.label} className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold"><span>{c.label}</span><span className={c.pass?"text-emerald-700 dark:text-emerald-300":"text-red-700 dark:text-red-300"}>{c.pass?"PASS":"FAIL"} — {c.ratio.toFixed(2)}:1</span></li>)}</ul>
            <p role="status" className="mt-4 font-bold">{safe?"All preview checks pass.":"Unsafe draft: export disabled until contrast is fixed."}</p>
          </div>
        </div>
      </div>
    </section>
  </AdminLayout>;
}
