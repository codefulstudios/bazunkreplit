import {useEffect,useState} from "react";
import {useAdmin} from "@/context/AdminContext";
import {ICON_DEFAULTS,iconKey,isValidIconAppearance,readIconAppearance,type IconArea,type IconMode,type IconAppearance} from "@/design-system/iconAppearance";
import {Smartphone,Shirt,Gamepad2,ShoppingBag} from "lucide-react";
const colors:{key:keyof IconAppearance;label:string}[]=[
 {key:"iconColor",label:"Icon colour"},{key:"badgeColor",label:"Icon background"},{key:"badgeBorder",label:"Icon background border"},
 {key:"tileColor",label:"Card background"},{key:"tileText",label:"Card label text"},{key:"tileBorder",label:"Card border"}
];
const sizes:{key:keyof IconAppearance;label:string;min:number;max:number}[]=[
 {key:"size",label:"Icon size",min:16,max:44},{key:"badgeSize",label:"Icon background size",min:36,max:84},
 {key:"radius",label:"Corner rounding",min:0,max:28},{key:"gap",label:"Icon-to-label spacing",min:4,max:20}
];
export function IconAppearanceEditor(){
 const {authFetch}=useAdmin();
 const [area,setArea]=useState<IconArea>("categories"),[mode,setMode]=useState<IconMode>("dark");
 const [stored,setStored]=useState<Record<string,string>>({}),[draft,setDraft]=useState<IconAppearance>(ICON_DEFAULTS.categories);
 const [saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[status,setStatus]=useState("");
 useEffect(()=>{let active=true;authFetch("/api/admin/settings").then(r=>{if(!r.ok)throw Error("Settings unavailable");return r.json()}).then((values:Record<string,string>)=>{if(active)setStored(values)}).catch(()=>{if(active)setStatus("Unable to load icon settings.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[authFetch]);
 useEffect(()=>{setDraft(readIconAppearance(stored,area,mode)||ICON_DEFAULTS[area]);},[stored,area,mode]);
 const valid=isValidIconAppearance(draft);
 const change=(key:keyof IconAppearance,value:string|number)=>{setDraft(p=>({...p,[key]:value}));setStatus("Unsaved changes");};
 async function save(reset=false){
  setSaving(true);setStatus("");
  const key=iconKey(area,mode),value=reset?"":JSON.stringify(draft);
  try{const r=await authFetch("/api/admin/settings",{method:"PUT",body:JSON.stringify({[key]:value})});if(!r.ok)throw Error("Save rejected");setStored(p=>({...p,[key]:value}));window.dispatchEvent(new Event("bazunk-settings-updated"));setStatus(reset?"Original icon design restored.":"Saved "+area+" icons in "+mode+" mode.");}
  catch{setStatus("Could not save icon appearance. The previous design remains in effect.");}
  finally{setSaving(false)}
 }
 const samples=area==="categories"?[{name:"Electronics",Icon:Smartphone},{name:"Fashion",Icon:Shirt},{name:"Gaming",Icon:Gamepad2}]:[{name:"Shop the marketplace",Icon:ShoppingBag}];
 return <section className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 text-slate-950 dark:border-slate-600 dark:bg-[#17243a] dark:text-white">
  <h3 className="text-lg font-extrabold">Icon appearance</h3>
  <p className="text-sm font-semibold">Change category or promotional icons without affecting the rest of Bazunk. Each theme saves independently.</p>
  <div className="flex flex-wrap gap-3">
   <label className="font-bold text-sm">Icon group <select aria-label="Icon group" className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-950 dark:bg-slate-800 dark:text-white" value={area} onChange={e=>setArea(e.target.value as IconArea)}><option value="categories">Homepage categories</option><option value="promos">Homepage promotion cards</option></select></label>
   <label className="font-bold text-sm">Theme <select aria-label="Icon theme" className="ml-2 rounded-lg border border-slate-400 bg-white p-2 text-slate-950 dark:bg-slate-800 dark:text-white" value={mode} onChange={e=>setMode(e.target.value as IconMode)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
  </div>
  {loading?<p>Loading icons…</p>:<div className="grid gap-5 lg:grid-cols-2">
   <div className="grid gap-3 sm:grid-cols-2">
    {colors.map(({key,label})=><label key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 p-2 text-sm font-bold dark:border-slate-500">{label}<input aria-label={label} type="color" value={draft[key] as string} onChange={e=>change(key,e.target.value)} className="h-10 w-12 cursor-pointer"/></label>)}
    {sizes.map(({key,label,min,max})=><label key={key} className="rounded-lg border border-slate-300 p-3 text-sm font-bold dark:border-slate-500">{label} — {draft[key]}px<input aria-label={label} type="range" min={min} max={max} value={draft[key] as number} onChange={e=>change(key,Number(e.target.value))} className="mt-2 block w-full"/></label>)}
   </div>
   <div className="space-y-3">
    <div className="flex flex-wrap gap-3 rounded-xl border border-slate-400 p-4">
     {samples.map(({name,Icon})=><div key={name} style={{background:draft.tileColor,color:draft.tileText,borderColor:draft.tileBorder,gap:draft.gap}} className="flex min-w-28 flex-col items-center justify-center rounded-xl border p-3 text-center">
      <span style={{width:draft.badgeSize,height:draft.badgeSize,background:draft.badgeColor,borderColor:draft.badgeBorder,borderRadius:draft.radius}} className="flex items-center justify-center border">
       <Icon style={{width:draft.size,height:draft.size,color:draft.iconColor}}/>
      </span><span className="text-sm font-bold">{name}</span>
     </div>)}
    </div>
    <p role="status" className={"text-sm font-bold "+(valid?"text-emerald-700 dark:text-emerald-300":"text-red-700 dark:text-red-300")}>{valid?"Icon and label contrast checks passed.":"Unsafe colours or sizes. Increase contrast or reduce icon size before saving."}</p>
    <div className="flex flex-wrap gap-2">
     <button onClick={()=>void save()} disabled={saving||!valid} type="button" className="rounded-xl bg-orange-300 px-5 py-3 font-extrabold text-slate-950 disabled:opacity-50">{saving?"Saving…":"Save Icon Appearance"}</button>
     <button onClick={()=>void save(true)} disabled={saving} type="button" className="rounded-xl border border-slate-500 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-800 dark:text-white">Restore Original</button>
    </div><p role="status" className="font-semibold text-sm">{status}</p>
   </div>
  </div>}
 </section>
}
