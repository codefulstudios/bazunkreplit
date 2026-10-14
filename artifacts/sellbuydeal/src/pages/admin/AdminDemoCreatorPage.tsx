import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { useLocation } from "wouter";

type Activity={id:number;seller_email:string;kind:string;rating:number|null;note:string|null;quantity:number;enabled:boolean};
type DemoListing={listing_id:number;title:string;price:string;seller_email:string;region:string;enabled:boolean};
export function AdminDemoCreatorPage(){
  const {isAdmin,authFetch}=useAdmin();const [,go]=useLocation();
  const [listings,setListings]=useState<DemoListing[]>([]);
  const [activities,setActivities]=useState<Activity[]>([]);
  const [url,setUrl]=useState("");const [sourcePreview,setSourcePreview]=useState("");
  const [kind,setKind]=useState("review");const [rating,setRating]=useState(5);
  const [note,setNote]=useState("");const [quantity,setQuantity]=useState(1);
  const [settings,setSettings]=useState<Record<string,boolean>>({});
  const [sellerEmail,setSellerEmail]=useState("");
  const [region,setRegion]=useState("uk");
  const [count,setCount]=useState(3);
  const [demoCategory,setDemoCategory]=useState("All categories");
  const [demoCategories,setDemoCategories]=useState<string[]>(["All categories"]);
  const [catalogueTotal,setCatalogueTotal]=useState(0);
  const [title,setTitle]=useState("");const [description,setDescription]=useState("");
  const [category,setCategory]=useState("Electronics");const [price,setPrice]=useState("19.99");
  const [selected,setSelected]=useState<number[]>([]);
  const [photoListing,setPhotoListing]=useState<DemoListing|null>(null);
  const [photoOptions,setPhotoOptions]=useState<Array<{id:number;image:string;preview:string;sourceUrl:string;photographer:string;tags:string}>>([]);
  const [photoLoading,setPhotoLoading]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  async function load(){
    try{const r=await authFetch("/api/admin/demo-creator");if(!r.ok)throw Error("Unable to load Demo Creator");
      const d=await r.json();setListings(d.listings||[]);setActivities(d.activities||[]);setSettings(Object.fromEntries((d.settings||[]).map((s:{key:string;enabled:boolean})=>[s.key,s.enabled])));
    }catch(e){setError(String(e));}
  }
  useEffect(()=>{if(!isAdmin){go("/admin");return;}void load();void authFetch("/api/admin/demo-creator/catalogue").then(r=>r.ok?r.json():null).then(d=>{if(d){setDemoCategories(d.categories||["All categories"]);setCatalogueTotal(d.total||0);}}).catch(()=>{});},[isAdmin]);
  async function send(path:string,body:object,method="POST"){
    setBusy(true);setError("");setMessage("");
    try{const r=await authFetch("/api/admin/demo-creator"+path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");setMessage("Saved successfully");await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function fillMissingImages(replaceExisting=false){
    setBusy(true);setError("");setMessage("");
    try {
      const r=await authFetch("/api/admin/demo-creator/images/fill-missing",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({replaceExisting})
      });
      const d=await r.json();
      if(!r.ok)throw Error(d.error||"Unable to find images");
      setMessage(`Checked ${d.scanned} demo listings; ${d.updated} product photographs ${replaceExisting ? "refreshed" : "added"}.`);
      await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function choosePhotoListing(listing:DemoListing){
    setPhotoListing(listing);setPhotoOptions([]);setPhotoLoading(true);setError("");
    try{
      const r=await authFetch("/api/admin/demo-creator/images/options?q="+encodeURIComponent(listing.title));
      const d=await r.json();if(!r.ok)throw Error(d.error||"Photo search failed");
      setPhotoOptions(d.photos||[]);
    }catch(e){setError(String(e));}finally{setPhotoLoading(false);}
  }
  async function savePhoto(photo:{image:string;sourceUrl:string;photographer:string}){
    if(!photoListing)return;
    await send("/images/replace",{listingId:photoListing.listing_id,...photo});
    setPhotoListing(null);setPhotoOptions([]);
  }
  async function remove(){
    if(!selected.length||!window.confirm(`Retire ${selected.length} selected demo listings? They will disappear from public browse and cannot be restored through Demo Creator. Genuine listings are unaffected.`))return;
    await send("/listings/batch-delete",{ids:selected});setSelected([]);
  }
  async function previewUrl(){
    setError("");setBusy(true);
    try{const r=await authFetch("/api/admin/demo-creator/url-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
      const d=await r.json();if(!r.ok)throw Error(d.error||"Preview failed");
      setTitle(d.title);setDescription(d.description);setCategory(d.category);setSourcePreview(d.note);
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  const field="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900";
  return <AdminLayout><div className="space-y-6 text-gray-900">
    <div><h1 className="text-2xl font-bold">Demo Creator</h1><p className="text-sm text-gray-600">Create non-purchasable catalogue samples. Simulated activity is not genuine seller reputation.</p></div>
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {message&&<p role="status" className="rounded bg-green-50 p-3 text-green-800">{message}</p>}
    <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold mb-3">Visibility settings</h2><div className="flex flex-wrap gap-4">{["master","listings","reviews","sales","repeat_buyers"].map(key=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={!!settings[key]} disabled={busy} onChange={e=>send("/settings",{key,enabled:e.target.checked})}/>{key.replaceAll("_"," ")}</label>)}</div><p className="text-xs text-gray-500 mt-2">Master and listings switches control public demo listing visibility. Review and sales fixtures remain internal and do not alter real seller reputation.</p></section>
    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Seller and region</h2><div className="grid gap-3 md:grid-cols-2"><label>Existing seller email<input className={field} type="email" value={sellerEmail} onChange={e=>setSellerEmail(e.target.value)} placeholder="seller@example.com"/></label><label>Marketplace<select className={field} value={region} onChange={e=>setRegion(e.target.value)}><option value="uk">UK</option><option value="us">US</option></select></label></div></section>
    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Generate sample listings</h2><p className="text-sm text-gray-600">{catalogueTotal} different demo products available across {Math.max(0,demoCategories.length-1)} categories. Each batch uses unique products.</p><label>Product category<select className={field} value={demoCategory} onChange={e=>setDemoCategory(e.target.value)}>{demoCategories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Quantity (1–20)<input className={field} type="number" min={1} max={20} value={count} onChange={e=>setCount(Number(e.target.value))}/></label><button disabled={busy||!sellerEmail} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50" onClick={()=>send("/generate",{sellerEmail,region,count,category:demoCategory})}>Generate listings</button></section>
    <section className="rounded-xl border bg-white p-4 space-y-3">
      <h2 className="font-semibold">Automatic product photographs</h2>
      <p className="text-sm text-gray-600">New generated listings search Pixabay automatically when PIXABAY_API_KEY is configured. Use this action to replace missing or generic placeholder images on existing demo listings (up to 20 at a time). Image credits and source URLs are stored with each listing.</p>
      <button disabled={busy} onClick={()=>fillMissingImages(false)} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">Auto-fill missing product images</button>\n      <button disabled={busy} onClick={()=>{if(window.confirm("Search again and replace existing photos on up to 20 demo listings?"))void fillMissingImages(true);}} className="ml-2 rounded border border-gray-400 bg-white px-4 py-2 text-gray-900 disabled:opacity-50">Replace existing demo photos</button>
    </section>
    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Preview product URL</h2><input className={field} type="url" placeholder="https://example.com/product" value={url} onChange={e=>setUrl(e.target.value)}/><button disabled={busy||!url} onClick={previewUrl} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">Prepare listing draft</button>{sourcePreview&&<p className="text-sm text-amber-800">{sourcePreview}</p>}</section>
    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Create manually</h2><input className={field} placeholder="Listing title" value={title} onChange={e=>setTitle(e.target.value)}/><textarea className={field} placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/><div className="grid gap-3 md:grid-cols-2"><input className={field} placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)}/><input className={field} type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></div><button disabled={busy||!sellerEmail||!title||!description} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50" onClick={()=>send("/listings",{sellerEmail,region,title,description,category,price})}>Create listing</button></section>
    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Simulated activity (admin-only)</h2><div className="grid gap-3 md:grid-cols-3"><label>Type<select className={field} value={kind} onChange={e=>setKind(e.target.value)}><option value="review">Review</option><option value="sale">Successful sale</option><option value="repeat_buyer">Repeat buyer</option></select></label><label>Quantity<input className={field} type="number" min={1} max={100} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>{kind==="review"&&<label>Stars<select className={field} value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} stars</option>)}</select></label>}</div><textarea className={field} placeholder="Internal sample review text or note" value={note} onChange={e=>setNote(e.target.value)}/><button disabled={busy||!sellerEmail} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50" onClick={()=>send("/activities",{sellerEmail,kind,rating,note,quantity})}>Create simulated activity</button><div className="space-y-2">{activities.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-2 text-sm"><span>{a.kind.replaceAll("_"," ")} · {a.seller_email} · {a.quantity} {a.rating? `· ${a.rating} stars`:""}</span><div className="flex gap-3 items-center"><label><input type="checkbox" checked={a.enabled} disabled={busy} onChange={e=>send("/activities/"+a.id,{enabled:e.target.checked},"PATCH")}/> Enabled</label><button disabled={busy} className="text-red-700" onClick={()=>{if(window.confirm("Delete this simulated activity?"))void send("/activities/batch-delete",{ids:[Number(a.id)]});}}>Delete</button></div></div>)}</div></section>
    {photoListing&&<section className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Choose photo: {photoListing.title} (#{photoListing.listing_id})</h2><button className="underline" onClick={()=>setPhotoListing(null)}>Close</button></div>
      {photoLoading?<p>Searching Pixabay…</p>:photoOptions.length===0?<p>No suitable photographs found. Try another product title.</p>:
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{photoOptions.map(photo=><button key={photo.id} disabled={busy} onClick={()=>savePhoto(photo)} className="rounded border p-2 text-left hover:border-orange-500">
          <img src={photo.preview} alt={photo.tags} className="h-28 w-full rounded object-cover"/>
          <span className="mt-1 block text-xs text-gray-600">{photo.tags}</span>
          <span className="block text-xs font-medium">Use this photo</span>
        </button>)}</div>}
    </section>}
    <section className="rounded-xl border bg-white p-4 space-y-3"><div className="flex justify-between items-center"><h2 className="font-semibold">Demo listings ({listings.length})</h2><button disabled={busy||!selected.length} onClick={remove} className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-50">Delete selected ({selected.length})</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th><label><input type="checkbox" aria-label="Select all demo listings" checked={listings.length>0&&selected.length===listings.length} onChange={e=>setSelected(e.target.checked?listings.map(l=>l.listing_id):[])}/> All</label></th><th>Listing</th><th>Seller</th><th>Region</th><th>Enabled</th><th>Actions</th></tr></thead><tbody>{listings.map(l=><tr key={l.listing_id} className="border-t"><td><input type="checkbox" checked={selected.includes(l.listing_id)} onChange={e=>setSelected(old=>e.target.checked?[...old,l.listing_id]:old.filter(id=>id!==l.listing_id))}/></td><td>{l.title} (#{l.listing_id})</td><td>{l.seller_email}</td><td>{l.region.toUpperCase()}</td><td><input type="checkbox" disabled={busy} checked={l.enabled} onChange={e=>send("/listings/"+l.listing_id,{enabled:e.target.checked},"PATCH")}/></td><td><button disabled={busy} className="mr-3 text-blue-700 underline" onClick={()=>choosePhotoListing(l)}>Choose photo</button><button disabled={busy} className="text-red-700 underline" onClick={()=>{if(window.confirm(`Retire demo listing #${l.listing_id}? This cannot be undone from Demo Creator.`))void send("/listings/batch-delete",{ids:[l.listing_id]});}}>Delete</button></td></tr>)}</tbody></table></div></section>
  </div></AdminLayout>;
}
