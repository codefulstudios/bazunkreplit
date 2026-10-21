import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
import {DesignTargetGuide} from "./DesignTargetGuide";
import {DESIGN_SECTIONS,SECTION_DEFAULTS,isValidSection,readSection,sectionContrast,sectionKey,type DesignSection,type SectionAppearance} from "@/design-system/sectionAppearance";
const titles:Record<DesignSection,string>={home_hero:"Homepage hero",home_categories:"Category tiles and icons",home_spotlight:"Spotlight listings / empty state",home_promos:"Homepage promotional cards"};
const fields:Record<keyof SectionAppearance,string>={background:"Section / card background",text:"Text colour",accent:"Icon / action background",accentText:"Icon / action text"};
export function DesignSectionsEditor({selectedSection}:{selectedSection?:DesignSection}={}){
 const {authFetch}=useAdmin();
 const [section,setSection]=useState<DesignSection>(selectedSection||"home_spotlight");
 useEffect(()=>{if(selectedSection)setSection(selectedSection)},[selectedSection]);
 const [mode,setMode]=useState<"light"|"dark">("dark");
 const [saved,setSaved]=useState<Record<string,string>>({});
 const [draft,setDraft]=useState<SectionAppearance>(SECTION_DEFAULTS.home_spotlight);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{let active=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Settings unavailable");return r.json()}).then((data:Record<string,string>)=>{if(active)setSaved(data)}).catch(()=>{if(active)setMessage("Failed to load current appearance settings.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[authFetch]);
 useEffect(()=>{setDraft(readSection(saved,section,mode)||SECTION_DEFAULTS[section]);setMessage("");},[saved,section,mode]);
 const valid=isValidSection(draft);
 async function save(){if(!valid)return;setSaving(true);setMessage("");try{
  const key=sectionKey(section,mode);
  const value=JSON.stringify(draft);
  const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:value})});
  if(!r.ok)throw Error("Save rejected");
  setSaved(p=>({...p,[key]:value}));window.dispatchEvent(new Event("bazunk-settings-updated"));
  setMessage("Saved "+titles[section]+" / "+mode+".");
 }catch{setMessage("Could not save section. Your previous design remains unchanged.")}finally{setSaving(false)}}
 async function reset(){setSaving(true);try{const key=sectionKey(section,mode);const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:""})});if(!r.ok)throw Error();setSaved(p=>({...p,[key]:""}));setMessage("Restored original design.");window.dispatchEvent(new Event("bazunk-settings-updated"));}catch{setMessage("Reset failed.")}finally{setSaving(false)}}
 return <section className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 dark:border-slate-600 dark:bg-[#17243a] dark:text-white" data-testid="design-sections-editor">
  <DesignTargetGuide target="sections" override={{title:titles[section],description:"Selected homepage block. Adjust its text and action colours for "+mode+" mode, preview, then save.",url:"/",coverage:"This editor saves only "+titles[section]+". Icon shapes and detailed icon sizes are managed in Icons & Graphics."}}/>
  <h2 className="text-xl font-extrabold">Homepage section styles</h2><p className="mt-1 text-sm font-semibold">Scoped styles only. Changing Spotlight cannot change the header, DealPilot, other cards or admin.</p>
  <div className="mt-4 flex flex-wrap gap-3">
   <label className="text-sm font-bold">Section <select aria-label="Design section" value={section} onChange={e=>setSection(e.target.value as DesignSection)} className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-950 dark:bg-slate-800 dark:text-white">{DESIGN_SECTIONS.map(x=><option key={x} value={x}>{titles[x]}</option>)}</select></label>
   <label className="text-sm font-bold">Theme <select aria-label="Section theme" value={mode} onChange={e=>setMode(e.target.value as "light"|"dark")} className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-950 dark:bg-slate-800 dark:text-white"><option value="light">Light</option><option value="dark">Dark</option></select></label>
  </div>
  {loading?<p className="mt-4">Loading appearance settings…</p>:<div className="mt-5 grid gap-5 lg:grid-cols-2">
   <div className="grid gap-3"><h3 className="text-base font-extrabold">1. Choose colours</h3>{(Object.keys(fields) as (keyof SectionAppearance)[]).map(key=><label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 p-3 text-sm font-bold dark:border-slate-500"><span>{fields[key]}</span><input aria-label={fields[key]+" colour"} type="color" value={draft[key]} onChange={e=>{setDraft(p=>({...p,[key]:e.target.value}));setMessage("Unsaved changes")}} className="h-10 w-14 cursor-pointer rounded border border-slate-500"/></label>)}</div>
   <div className="space-y-3"><h3 className="text-base font-extrabold">2. Preview and save</h3>
    <div style={{backgroundColor:draft.background,color:draft.text}} className="rounded-xl border border-slate-500 p-6">
     <h3 className="text-xl font-bold">{titles[section]}</h3><p className="mt-2 text-sm font-semibold">Example listing title or section description. Preview colours before saving.</p>
     <div style={{backgroundColor:draft.accent,color:draft.accentText}} className="mt-4 inline-flex rounded-lg px-4 py-2 font-bold">Sample icon or action</div>
    </div>
    <p className="text-sm font-bold">Changes here affect the selected section only. To change icon size or individual symbols, open Icons & Graphics.</p>
    <p className="text-sm font-bold">Text {sectionContrast(draft.text,draft.background).toFixed(2)}:1 · Action {sectionContrast(draft.accentText,draft.accent).toFixed(2)}:1</p>
    <p role="status" className={"text-sm font-bold "+(valid?"text-emerald-700 dark:text-emerald-300":"text-red-700 dark:text-red-300")}>{valid?"Both combinations pass WCAG AA.":"Unsafe design: choose more contrasting colours."}</p>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={save} disabled={!valid||saving} className="rounded-xl bg-orange-300 px-5 py-3 font-extrabold text-slate-950 disabled:bg-slate-300 disabled:text-slate-600">{saving?"Saving…":"Save Section"}</button><button type="button" disabled={saving} onClick={reset} className="rounded-xl border border-slate-500 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-800 dark:text-white">Restore Original</button></div>
    <p role="status" className="text-sm font-bold">{message}</p>
   </div>
  </div>}
 </section>
}
