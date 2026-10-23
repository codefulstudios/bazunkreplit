import { MarketplaceLoader } from "@/components/MarketplaceLoader";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, RefreshCw, ExternalLink, ShoppingCart, Loader2, Package, Pencil, Trash2, EyeOff } from "lucide-react";
import { AdminListingPromotion } from "@/components/AdminListingPromotion";
import { AdminLayout } from "./AdminLayout";
import { AdminListingEditor, AdminListingCatalogueTools } from "./AdminProductsPage";
import { ACTIVE_CATEGORIES } from "@/data/categories";
import { AdminBulkSelection } from "@/components/admin/AdminBulkSelection";
import { AdminManagementHeader, AdminStatusTabs } from "@/components/admin/AdminUi";
import { useAdmin } from "@/context/AdminContext";

interface Listing {
  id: number;
  public_id: string | null;
  title: string;
  price: string;
  currency: string;
  category: string;
  subcategory: string | null;
  condition: string;
  status: string;
  seller_email: string;
  seller_username: string | null;
  specifications: string | null;
  image: string | null;
  created_at: string;
}

interface Specs {
  amazon_url?: string;
  asin?: string;
  source?: string;
  ebay_url?: string;
  item_id?: string;
  own_ebay_item_id?: string;
}

function parseSpecs(raw: string | null): Specs {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  pending:  "bg-amber-100 text-amber-700",
  sold:     "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-600",
};

export function AdminListingsPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();

  const [listings, setListings] = useState<Listing[]>([]);
  const [view,setView]=useState<"listings"|"categories"|"import-export">("listings");
  const [editingId,setEditingId]=useState<number|null>(null);
  const [rowBusy,setRowBusy]=useState<number|null>(null);
  const [actionError,setActionError]=useState("");
  const [actionSuccess,setActionSuccess]=useState("");
  async function hideListing(id:number) {
    setRowBusy(id);setActionError("");
    try {
      const res=await authFetch(`/api/admin/listings/${id}/visibility`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({hidden:true})});
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw Error(data?.error||"Could not hide listing");
      setListings(prev=>prev.map(l=>l.id===id?{...l,status:"inactive"}:l));
    }catch(e){setActionError(e instanceof Error?e.message:"Action failed");}
    finally{setRowBusy(null);}
  }
  async function deleteListing(id:number) {
    if(!window.confirm("Permanently delete this listing? Listings associated with transactions must be preserved. This action cannot be undone."))return;
    setRowBusy(id);setActionError("");setActionSuccess("");
    try {
      const res=await authFetch(`/api/admin/listings/${id}/safe-delete`,{method:"DELETE"});
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw Error(data?.error||"Could not delete listing");
      setListings(prev=>prev.filter(l=>l.id!==id));setTotal(t=>Math.max(0,t-1));setSelectedIds(prev=>prev.filter(x=>x!==String(id)));
      setActionSuccess("Listing deleted successfully.");
      // Refresh from the database so the table, pagination and listing total stay in sync.
      await load();
    }catch(e){setActionError(e instanceof Error?e.message:"Action failed");}
    finally{setRowBusy(null);}
  }
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") || "");
  const [filter, setFilter] = useState<"all" | "imported" | "user">("all");
  const [offset, setOffset] = useState(0);
  const [statusFilter,setStatusFilter]=useState("all");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const visibleIds=listings.map(l=>String(l.id));
  const [imageEditing, setImageEditing] = useState<number | null>(null);
  const [imageDraft, setImageDraft] = useState("");
  const [imageSaving, setImageSaving] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const [categoryEditing, setCategoryEditing] = useState<number | "bulk" | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("electronics");
  const [subcategoryDraft, setSubcategoryDraft] = useState("audio");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const categoryOptions = ACTIVE_CATEGORIES;
  function beginCategoryEdit(listing?: Listing) {
    setCategoryEditing(listing?.id ?? "bulk");
    const found=categoryOptions.find(c=>c.slug===listing?.category);
    setCategoryDraft(found?.slug ?? "electronics");
    setSubcategoryDraft(found?.subcategories.some(s=>s.slug===listing?.subcategory)?listing!.subcategory!:((found??categoryOptions.find(c=>c.slug==="electronics"))?.subcategories[0]?.slug??""));
    setCategoryError("");
  }
  async function saveCategories() {
    const ids=categoryEditing==="bulk"?selectedIds.map(Number):[Number(categoryEditing)];
    if (!ids.length) return;
    setCategorySaving(true);setCategoryError("");
    try {
      const res=await authFetch("/api/admin/listings/categories",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids,category:categoryDraft,subcategory:subcategoryDraft})});
      const data=await res.json().catch(()=>null);
      if (!res.ok) throw new Error(data?.error || "Could not save categories.");
      const changed=new Set(ids);
      setListings(prev=>prev.map(l=>changed.has(l.id)?{...l,category:categoryDraft,subcategory:subcategoryDraft}:l));
      setCategoryEditing(null);setSelectedIds([]);
    } catch(e) {setCategoryError(e instanceof Error?e.message:"Could not save categories.");}
    finally {setCategorySaving(false);}
  }
  const categoryFields=(<div className="flex flex-wrap items-center gap-2">
    <select aria-label="New listing category" value={categoryDraft} onChange={e=>{setCategoryDraft(e.target.value);setSubcategoryDraft(categoryOptions.find(c=>c.slug===e.target.value)?.subcategories[0]?.slug??"");}} className="min-h-9 max-w-48 rounded-lg border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-950 dark:border-slate-500 dark:bg-slate-800 dark:text-white">
      {categoryOptions.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}
    </select>
    <select aria-label="New listing subcategory" value={subcategoryDraft} onChange={e=>setSubcategoryDraft(e.target.value)} className="min-h-9 max-w-48 rounded-lg border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-950 dark:border-slate-500 dark:bg-slate-800 dark:text-white">
      {categoryOptions.find(c=>c.slug===categoryDraft)?.subcategories.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}
    </select>
    <button type="button" disabled={categorySaving} onClick={()=>void saveCategories()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{categorySaving?"Saving…":"Save category"}</button>
    <button type="button" disabled={categorySaving} onClick={()=>{setCategoryEditing(null);setCategoryError("");}} className="rounded-lg border border-slate-400 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white">Cancel</button>
  </div>);
  const LIMIT = 50;

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { setOffset(0); setSelectedIds([]); }, [search, filter, statusFilter]);
  useEffect(() => { load(); }, [search, filter, statusFilter, offset]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (search) params.set("search", search);
      if (statusFilter!=="all") params.set("status",statusFilter);
      if (filter === "imported") params.set("imported", "1");
      if (filter === "user") params.set("imported", "0");
      const res = await authFetch(`/api/admin/listings?${params}`);
      if (res.ok) {
        const d = await res.json();
        setListings(d.listings ?? []);
        setSelectedIds([]);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  const pages = Math.ceil(total / LIMIT);
  const page = Math.floor(offset / LIMIT);

  async function saveImage(listing: Listing, value = imageDraft) {
    setImageError(""); setImageSaving(listing.id);
    try {
      const res = await authFetch(`/api/admin/listings/${listing.id}/image`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: value.trim() }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not update image.");
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, image: data.image ?? null } : l));
      setImageEditing(null); setImageDraft("");
    } catch (e) { setImageError(e instanceof Error ? e.message : "Could not update image."); }
    finally { setImageSaving(null); }
  }

  return (
    <AdminLayout>
      {loading && <MarketplaceLoader area="admin" label="Loading admin listings…" />}
      <div className="admin-listings-page wp-management-page wp-listings-page">
      <AdminManagementHeader title="Listings" description="Manage marketplace listings, product visibility and source imports." meta={<span>{total.toLocaleString("en-GB")} listings match the current filters</span>} actions={<>
        <button type="button" onClick={()=>setLocation("/admin/imports")} className="wp-action wp-action-secondary"><ShoppingCart className="h-4 w-4"/>Import products</button>
        <button type="button" onClick={load} disabled={loading} className="wp-action wp-action-primary"><RefreshCw className={"h-4 w-4 "+(loading?"animate-spin":"")}/>Refresh listings</button>
      </>}/>
      <AdminStatusTabs label="Listing status" value={statusFilter} onChange={x=>setStatusFilter(x)} options={[
        {value:"all",label:"All listings"},{value:"active",label:"Live"},{value:"pending",label:"Pending"},
        {value:"draft",label:"Drafts"},{value:"suspended",label:"Suspended"},{value:"inactive",label:"Inactive"},{value:"sold",label:"Sold"}
      ]}/>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Listings management">
        {([{id:"listings",label:"All Listings"},{id:"categories",label:"Categories"},{id:"import-export",label:"Import / Export"}] as const).map(item=><button role="tab" aria-selected={view===item.id} key={item.id} type="button" onClick={()=>setView(item.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${view===item.id?"bg-blue-600 text-white border-blue-600":"border-slate-400 bg-white text-slate-950 dark:bg-slate-800 dark:text-white"}`}>{item.label}</button>)}
      </div>
      {view!=="listings" ? <AdminListingCatalogueTools section={view}/> : <>
      {actionSuccess&&<p role="status" className="my-2 rounded-lg border border-emerald-500 p-3 font-bold text-emerald-600 dark:text-emerald-300">{actionSuccess}</p>}
      {actionError&&<p role="alert" className="my-2 rounded-lg border border-red-500 p-3 font-bold text-red-500">{actionError}</p>}
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, ID, email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["all", "imported", "user"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {f === "imported" ? "Demo / Imported" : f === "user" ? "User Listed" : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Select or export current page (up to {LIMIT} listings)</span>
      </div>
      <div className="mb-3"><AdminBulkSelection selected={selectedIds}
        rows={listings.map(l=>({id:String(l.id),cells:[l.public_id??"",l.title,l.status,l.category,l.price,l.currency,l.seller_email]}))}
        columns={["Public ID","Title","Status","Category","Price","Currency","Seller"]} filename="bazunk-admin-selected-listings" onClear={()=>setSelectedIds([])}/></div>
      {selectedIds.length>0 && <div className="mb-3"><button type="button" onClick={()=>beginCategoryEdit()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Change category for {selectedIds.length} selected</button></div>}
      {categoryEditing==="bulk"&&<div className="mb-3 rounded-xl border border-blue-400 bg-blue-50 p-3 text-slate-950 dark:bg-slate-900 dark:text-white"><p className="mb-2 text-xs font-bold">Change category for {selectedIds.length} selected listings</p>{categoryFields}{categoryError&&<p role="alert" className="mt-2 text-xs font-bold text-red-500">{categoryError}</p>}</div>}
      {/* Table */}
      <div className="wp-management-table-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2"><input type="checkbox" aria-label="Select all listings on current page" className="h-4 w-4"
                  checked={visibleIds.length>0&&visibleIds.every(id=>selectedIds.includes(id))}
                  onChange={e=>setSelectedIds(e.target.checked?visibleIds:[])}/></th>
                {["ID", "Title", "Category", "Price", "Seller", "Status", "Source listing"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" />
                </td></tr>
              )}
              {!loading && listings.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No listings found</p>
                </td></tr>
              )}
              {!loading && listings.map(l => {
                const isImported = l.public_id?.startsWith("BZK-DEMO-") ?? false;
                const specs = parseSpecs(l.specifications);
                const ebayItemId = specs.item_id ?? specs.own_ebay_item_id;
                const ebayUrl = specs.ebay_url ?? (ebayItemId ? `https://www.ebay.co.uk/itm/${ebayItemId}` : undefined);
                return (
                  <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-3 py-2"><input type="checkbox" aria-label={`Select listing ${l.public_id||l.id}`} className="h-4 w-4"
                      checked={selectedIds.includes(String(l.id))}
                      onChange={e=>setSelectedIds(p=>e.target.checked?[...new Set([...p,String(l.id)])]:p.filter(x=>x!==String(l.id)))}/></td>
                    {/* ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-gray-500">{l.public_id ?? `#${l.id}`}</span>
                        {isImported && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold w-fit">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            Imported
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 min-w-64 w-[36%] align-top">
                      <div className="flex gap-2 items-start"><div className="w-12 h-12 rounded-lg border bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center">{l.image ? <img src={l.image} alt="" className="w-full h-full object-contain" /> : <Package className="w-5 h-5 text-gray-300" />}</div><p className="font-medium text-slate-900 dark:text-white text-xs leading-snug break-words">{l.title}</p></div>
                      <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{l.condition}</p>
                      <div className="mt-2 flex flex-wrap gap-2 items-center"><AdminListingPromotion listingId={l.id} title={l.title} status={l.status} /><button onClick={() => { setImageEditing(l.id); setImageDraft(l.image ?? ""); setImageError(""); }} className="text-[10px] font-bold px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50">{l.image ? "Change image" : "Add image"}</button></div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={`Actions for ${l.title}`}>
                        <button type="button" onClick={()=>beginCategoryEdit(l)} className="rounded-md border border-blue-400 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800 dark:bg-slate-800 dark:text-blue-200">Category</button>
                        
                        <button type="button" onClick={()=>setEditingId(l.id)} className="rounded border border-blue-500 px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-300"><Pencil className="inline h-3 w-3"/> Edit</button>
                        <button type="button" disabled={rowBusy===l.id||l.status==="inactive"} onClick={()=>void hideListing(l.id)} className="rounded border border-amber-500 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 disabled:opacity-40"><EyeOff className="inline h-3 w-3"/> Hide</button>
                        <button type="button" disabled={rowBusy===l.id} onClick={()=>void deleteListing(l.id)} className="rounded border border-red-500 px-2 py-1 text-xs font-bold text-red-700 dark:text-red-300 disabled:opacity-40"><Trash2 className="inline h-3 w-3"/> Delete</button>
                      
                      </div>
                      {categoryEditing===l.id && <div className="mt-2 rounded-lg border border-slate-400 bg-white p-2 dark:bg-slate-900">{categoryFields}{categoryError&&<p role="alert" className="mt-2 text-xs font-bold text-red-500">{categoryError}</p>}</div>}
                      {imageEditing === l.id && <div className="mt-2 rounded-lg border border-gray-200 p-2 bg-gray-50"><input autoFocus value={imageDraft} onChange={e=>setImageDraft(e.target.value)} placeholder="https://… image URL" className="w-full rounded-md border bg-white px-2 py-1.5 text-xs text-gray-800" /><div className="mt-2 flex gap-2"><button disabled={imageSaving===l.id} onClick={()=>void saveImage(l)} className="rounded-md bg-[#4A5CE8] text-white px-2 py-1 text-[10px] font-bold disabled:opacity-50">{imageSaving===l.id?"Saving…":"Save image"}</button><button onClick={()=>{setImageEditing(null);setImageDraft("");setImageError("");}} className="rounded-md border px-2 py-1 text-[10px] font-bold">Cancel</button>{l.image&&<button disabled={imageSaving===l.id} onClick={()=>void saveImage(l,"")} className="text-[10px] text-red-600 ml-auto">Remove</button>}</div>{imageError&&<p className="text-[10px] text-red-600 mt-1">{imageError}</p>}</div>}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      <span className="capitalize">{l.category.replace(/-/g, " ")}</span>
                      {l.subcategory && <span className="text-slate-600 dark:text-slate-200"> · {l.subcategory.replace(/-/g, " ")}</span>}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                      £{parseFloat(l.price).toFixed(2)}
                    </td>

                    {/* Seller */}
                    <td className="px-4 py-3 max-w-36">
                      <p className="text-xs text-gray-600 truncate">{l.seller_email}</p>
                      {l.seller_username && <p className="text-[10px] text-gray-400">@{l.seller_username}</p>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_STYLE[l.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {l.status}
                      </span>
                    </td>

                    {/* Amazon URL */}
                    <td className="px-4 py-3">
                      {specs.ebay_url ? (
                        <a href={specs.ebay_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
                          <ExternalLink className="w-3 h-3" />
                          {ebayItemId ? `eBay ${ebayItemId}` : "View on eBay"}
                        </a>
                      ) : specs.amazon_url ? (
                        <a href={specs.amazon_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#c45d00] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
                          <ExternalLink className="w-3 h-3" />
                          {specs.asin ?? "View on Amazon"}
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >← Prev</button>
              <span className="px-3 py-1.5 text-xs text-gray-500">{page + 1} / {pages}</span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
      </>}
      {editingId!==null&&<AdminListingEditor listingId={editingId} onClose={()=>setEditingId(null)} onSaved={()=>{setEditingId(null);void load();}}/>}
      </div>
    </AdminLayout>
  );
}
