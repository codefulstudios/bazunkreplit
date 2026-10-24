import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { CATEGORIES, thirdLevelProposals, thirdLevelSlug } from "@/data/categories";
import { FolderTree, Layers3, EyeOff, Search, Plus, Save, ChevronRight, ChevronDown, Check, X, Eye, ArrowUp, ArrowDown } from "lucide-react";
import "./category-workspace.css";

type Item={category_slug:string;subcategory_slug:string;name:string;sort_order:number;visible:boolean};
type Third={category:string;subcategory:string;slug:string;name:string;sort_order:number;visible:boolean};
type Evidence={category:string;subcategory:string;count:number;titles?:string[]};
type View="overview"|"tree"|"subcategories"|"third"|"hidden"|"import";

export function AdminCategoryManagerPage(){
 const {authFetch}=useAdmin();
 const [items,setItems]=useState<Item[]>([]);
 const [third,setThird]=useState<Third[]>([]);
 const [evidence,setEvidence]=useState<Evidence[]>([]);
 const [selected,setSelected]=useState(CATEGORIES[0]?.slug??"");
 const [expanded,setExpanded]=useState<string[]>([CATEGORIES[0]?.slug??""]);
 const [view,setView]=useState<View>("overview");
 const [query,setQuery]=useState("");
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 const [draftNew,setDraftNew]=useState("");
 const [thirdParent,setThirdParent]=useState(CATEGORIES[0]?.subcategories[0]?.slug??"");
 const [suggestions,setSuggestions]=useState<string[]>([]);
 const [dirty,setDirty]=useState(false);
 useEffect(()=>{let active=true;Promise.all([
  authFetch("/api/taxonomy/category-overrides").then(r=>r.ok?r.json():{overrides:[]}),
  authFetch("/api/admin/taxonomy/third-level").then(r=>r.ok?r.json():{categories:[]}),
  authFetch("/api/admin/taxonomy/listing-evidence").then(r=>r.ok?r.json():{groups:[]})
 ]).then(([over,three,ev])=>{if(!active)return;
  const map=new Map<string,Item>((over.overrides??[]).map((x:Item)=>[x.category_slug+":"+x.subcategory_slug,x]));
  setItems(CATEGORIES.flatMap((c,i)=>[map.get(c.slug+":")??{category_slug:c.slug,subcategory_slug:"",name:c.name,visible:true,sort_order:i},...c.subcategories.map((sub,j)=>map.get(c.slug+":"+sub.slug)??{category_slug:c.slug,subcategory_slug:sub.slug,name:sub.name,visible:true,sort_order:j})]));
  setThird(three.categories??[]);setEvidence(ev.groups??[]);
 }).catch(e=>setMessage(String(e)));return()=>{active=false}},[authFetch]);
 const top=items.filter(x=>!x.subcategory_slug).sort((a,b)=>a.sort_order-b.sort_order);
 const subs=items.filter(x=>x.category_slug===selected&&!!x.subcategory_slug).sort((a,b)=>a.sort_order-b.sort_order);
 const picked=top.find(x=>x.category_slug===selected);
 const category=CATEGORIES.find(c=>c.slug===selected);
 const currentThird=third.filter(x=>x.category===selected);
 const count=(c:string,s?:string)=>evidence.filter(x=>x.category===c&&(s===undefined||x.subcategory===s)).reduce((n,x)=>n+Number(x.count),0);
 const hidden=items.filter(x=>!x.visible).length+third.filter(x=>!x.visible).length;
 const totalThird=third.length;
 const change=(x:Item,patch:Partial<Item>)=>{setItems(prev=>prev.map(v=>v.category_slug===x.category_slug&&v.subcategory_slug===x.subcategory_slug?{...v,...patch}:v));setDirty(true)};
 const changeThird=(x:Third,patch:Partial<Third>)=>{setThird(prev=>prev.map(v=>v.category===x.category&&v.subcategory===x.subcategory&&v.slug===x.slug?{...v,...patch}:v));setDirty(true)};
 const move=(x:Item,delta:number)=>{const peers=items.filter(v=>v.category_slug===x.category_slug&&Boolean(v.subcategory_slug)===Boolean(x.subcategory_slug)).sort((a,b)=>a.sort_order-b.sort_order);const i=peers.findIndex(v=>v.subcategory_slug===x.subcategory_slug);if(i+delta<0||i+delta>=peers.length)return;[peers[i],peers[i+delta]]=[peers[i+delta],peers[i]];setItems(prev=>prev.map(v=>{const order=peers.findIndex(p=>p.category_slug===v.category_slug&&p.subcategory_slug===v.subcategory_slug);return order<0?v:{...v,sort_order:order}}));setDirty(true)};
 const save=async()=>{setSaving(true);setMessage("");try{
  const a=await authFetch("/api/admin/taxonomy/category-overrides",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({overrides:items})});
  if(!a.ok)throw Error((await a.json().catch(()=>({})).error||"Could not save categories"));
  const b=await authFetch("/api/admin/taxonomy/third-level",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({categories:third})});
  if(!b.ok)throw Error((await b.json().catch(()=>({})).error||"Could not save taxonomy"));
  setDirty(false);setMessage("Saved categories and taxonomy. Existing listing slugs are unchanged.");
 }catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setSaving(false)}};
 const addThird=(name:string,sub:string)=>{const slug=thirdLevelSlug(name);if(!slug||third.some(x=>x.category===selected&&x.subcategory===sub&&x.slug===slug))return;setThird(v=>[...v,{category:selected,subcategory:sub,slug,name,sort_order:third.filter(t=>t.category===selected&&t.subcategory===sub).length,visible:true}]);setDirty(true);setMessage("Category added to draft. Save Changes to publish.")};
 const addSub=()=>{const name=window.prompt("New subcategory name");if(!name?.trim())return;setMessage("New subcategories require a permanent slug and importer mapping. Use an existing category or request the create-new taxonomy migration.");};
 const proposals=useMemo(()=>category?.subcategories.flatMap(s=>thirdLevelProposals(selected,s.slug,s.name).map(n=>({name:n,subcategory:s.slug,slug:thirdLevelSlug(n)}))).filter(p=>!third.some(x=>x.category===selected&&x.subcategory===p.subcategory&&x.slug===p.slug))??[],[category,selected,third]);
 const nav:[View,string][]=[["overview","Overview"],["tree","Category Tree"],["subcategories","Subcategories"],["third","3rd-Level Taxonomy"],["hidden","Hidden Categories"],["import","Import / Export"]];
 const showEditor=view!=="hidden"&&view!=="import";
 return <AdminLayout><div className="bz-taxonomy">
  <div className="bz-taxonomy-head"><div><h1>Categories &amp; Taxonomy</h1><p>Manage your catalog structure, visibility, sorting and taxonomy rules.</p></div><div className="bz-taxonomy-actions"><button onClick={()=>window.open("/browse","_blank")}><Eye size={16}/> Preview navigation</button><button className="primary" onClick={save} disabled={saving||!dirty}><Save size={16}/>{saving?"Saving…":dirty?"Save Changes *":"All changes saved"}</button></div></div>
  {message&&<div role="status" className="bz-taxonomy-message">{message}</div>}
  <div className="bz-taxonomy-stats">{[["Main Categories",top.length,FolderTree],["Subcategories",items.filter(x=>x.subcategory_slug).length,Layers3],["3rd-Level Categories",totalThird,Layers3],["Hidden Items",hidden,EyeOff]].map(([name,num,Icon])=><div className="bz-taxonomy-stat" key={String(name)}><Icon size={26}/><div><span>{String(name)}</span><strong>{num as number}</strong></div></div>)}</div>
  <nav className="bz-taxonomy-nav" aria-label="Taxonomy sections">{nav.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}</nav>
  <div className="bz-taxonomy-columns">
   <section className="bz-taxonomy-panel bz-taxonomy-tree"><div className="bz-taxonomy-panel-head"><div><h2>Category Tree</h2><p>Browse your existing category structure.</p></div><FolderTree size={21}/></div>
    <label className="bz-taxonomy-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find category…"/></label>
    {top.filter(c=>(c.name+" "+items.filter(x=>x.category_slug===c.category_slug).map(x=>x.name).join(" ")).toLowerCase().includes(query.toLowerCase())).map(c=><div key={c.category_slug}>
      <div className={"bz-taxonomy-tree-row "+(selected===c.category_slug?"selected":"")}><button aria-label="Expand category" onClick={()=>setExpanded(v=>v.includes(c.category_slug)?v.filter(x=>x!==c.category_slug):[...v,c.category_slug])}>{expanded.includes(c.category_slug)?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button><button onClick={()=>{setSelected(c.category_slug);setThirdParent(CATEGORIES.find(x=>x.slug===c.category_slug)?.subcategories[0]?.slug??"")}}>📁 {c.name}</button><span>{count(c.category_slug)}</span></div>
      {expanded.includes(c.category_slug)&&items.filter(s=>s.category_slug===c.category_slug&&s.subcategory_slug).sort((a,b)=>a.sort_order-b.sort_order).map(sub=><button key={sub.subcategory_slug} onClick={()=>{setSelected(c.category_slug);setThirdParent(sub.subcategory_slug);setView("subcategories")}} className="bz-taxonomy-tree-sub">↳ {sub.name}<small>{count(c.category_slug,sub.subcategory_slug)}</small></button>)}
    </div>)}
   </section>
   <div className="bz-taxonomy-right">
    {showEditor&&picked&&<section className="bz-taxonomy-panel"><div className="bz-taxonomy-panel-head"><div><h2>📁 {picked.name}</h2><p>Edit the selected category and its children.</p></div><span className="bz-taxonomy-pill">{count(selected)} listings</span></div>
     <div className="bz-taxonomy-form"><label>Category name<input value={picked.name} onChange={e=>change(picked,{name:e.target.value})}/></label><label>Permanent slug<input readOnly value={picked.category_slug}/><small>Preserved to protect listing and importer references.</small></label><label>Visible in navigation<select value={String(picked.visible)} onChange={e=>change(picked,{visible:e.target.value==="true"})}><option value="true">Visible</option><option value="false">Hidden</option></select></label><label>Sort order<input type="number" value={picked.sort_order} onChange={e=>change(picked,{sort_order:Number(e.target.value)})}/></label></div>
     <div className="bz-taxonomy-panel-head bz-taxonomy-subhead"><div><h3>Subcategories ({subs.length})</h3><p>Rename, reorder and control visibility.</p></div><button onClick={addSub}><Plus size={15}/> Add subcategory</button></div>
     <div className="bz-taxonomy-list">{subs.map(sub=><div key={sub.subcategory_slug} className="bz-taxonomy-subrow"><div className="bz-taxonomy-reorder"><button aria-label={"Move "+sub.name+" up"} onClick={()=>move(sub,-1)}><ArrowUp size={14}/></button><button aria-label={"Move "+sub.name+" down"} onClick={()=>move(sub,1)}><ArrowDown size={14}/></button></div><label><span>Name</span><input value={sub.name} onChange={e=>change(sub,{name:e.target.value})}/></label><label><span>Slug</span><input readOnly value={sub.subcategory_slug}/></label><label className="bz-taxonomy-checkbox"><input type="checkbox" checked={sub.visible} onChange={e=>change(sub,{visible:e.target.checked})}/> Visible</label><span className="bz-taxonomy-pill">{count(selected,sub.subcategory_slug)} items</span><button onClick={()=>{setThirdParent(sub.subcategory_slug);setView("third")}}>Edit levels</button></div>)}</div>
    </section>}
    {(view==="third"||view==="overview"||view==="tree")&&<section className="bz-taxonomy-panel"><div className="bz-taxonomy-panel-head"><div><h3>3rd-Level Taxonomy</h3><p>Draft, approve and edit specific product classifications.</p></div></div><div className="bz-taxonomy-inline"><select value={thirdParent} onChange={e=>setThirdParent(e.target.value)}>{subs.map(s=><option key={s.subcategory_slug} value={s.subcategory_slug}>{s.name}</option>)}</select><input placeholder="New third-level category…" value={draftNew} onChange={e=>setDraftNew(e.target.value)}/><button className="primary" onClick={()=>{addThird(draftNew,thirdParent);setDraftNew("")}}><Plus size={14}/> Add</button></div>
     {currentThird.filter(x=>x.subcategory===thirdParent).map(x=><div key={x.slug} className="bz-taxonomy-third"><input value={x.name} onChange={e=>changeThird(x,{name:e.target.value})}/><label><input type="checkbox" checked={x.visible} onChange={e=>changeThird(x,{visible:e.target.checked})}/> Visible</label><input aria-label="Order" type="number" value={x.sort_order} onChange={e=>changeThird(x,{sort_order:Number(e.target.value)})}/></div>)}
    </section>}
    {(view==="overview"||view==="third")&&<section className="bz-taxonomy-panel"><div className="bz-taxonomy-panel-head"><div><h3>Taxonomy Suggestions</h3><p>Editorial suggestions based on category types. Counts reflect parent listings, not confirmed matches.</p></div><span className="bz-taxonomy-pill">{proposals.length} proposals</span></div><div className="bz-taxonomy-suggestions">{proposals.filter(x=>!suggestions.includes(x.subcategory+":"+x.slug)).slice(0,35).map(x=><div key={x.subcategory+":"+x.slug}><div><strong>{x.name}</strong><small>{x.subcategory} · {count(selected,x.subcategory)} parent listings</small></div><button className="primary" onClick={()=>addThird(x.name,x.subcategory)}><Check size={14}/> Approve to draft</button><button onClick={()=>setSuggestions(v=>[...v,x.subcategory+":"+x.slug])}><X size={14}/> Dismiss</button></div>).filter(Boolean)}</div></section>}
    {view==="hidden"&&<section className="bz-taxonomy-panel"><h2>Hidden categories</h2>{items.filter(x=>!x.visible).map(x=><div className="bz-taxonomy-hidden" key={x.category_slug+":"+x.subcategory_slug}><span>{x.name}</span><button onClick={()=>change(x,{visible:true})}>Restore</button></div>)}</section>}
    {view==="import"&&<section className="bz-taxonomy-panel"><h2>Taxonomy import & export</h2><p>Export current editable taxonomy as JSON for review or backups.</p><button onClick={()=>{const blob=new Blob([JSON.stringify({items,third},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="bazunk-taxonomy.json";a.click();URL.revokeObjectURL(url)}}>Export taxonomy JSON</button></section>}
   </div>
  </div>
 </div></AdminLayout>
}
