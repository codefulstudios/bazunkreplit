import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Search, Plus, Pencil, Trash2, RefreshCw, Package, CheckCircle, XCircle,
  X, ChevronDown, Upload, Download, Loader2, ImageIcon, Tag, Save, AlertTriangle,
} from "lucide-react";
import { AdminListingPromotion } from "@/components/AdminListingPromotion";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { CATEGORIES, ACTIVE_CATEGORIES, resolveCategory, suggestedThirdLevel, thirdLevelProposals, thirdLevelSlug } from "@/data/categories";

const SITE_CATEGORIES = ACTIVE_CATEGORIES;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string; name: string; slug: string; description: string | null; product_count: number;
}

interface Variant {
  type: string; value: string; priceModifier: string; inventory: string;
}

interface Product {
  id: string; title: string; description: string | null; price: string;
  status: string; inventory: number; condition: string; tags: string | null;
  images: string[]; variants: Variant[]; seller_email: string | null;
  category_id: string | null; category_name: string | null; subcategory?: string | null; subsubcategory?: string | null; created_at: string;
  currency?: string; brand?: string; sku?: string; ships_from?: string; ships_from_location?: string;
  ships_to?: string; shipping_price?: string | number; free_shipping?: boolean; dispatch_time?: string;
  delivery_estimate?: string; source?: string | null; source_url?: string | null; source_item_id?: string | null;
  source_condition?: string | null; source_price?: string | number | null; source_postage?: string | number | null;
  last_source_check?: string | null; markup_pct?: string | number | null; minimum_profit?: string | number | null;
}

interface ProductForm {
  title: string; description: string; price: string; category_id: string;
  condition: string; status: string; inventory: string; tags: string;
  seller_email: string; images: string[]; variants: Variant[]; subcategory: string; subsubcategory: string; currency: string;
  brand: string; sku: string; ships_from: string; ships_from_location: string; ships_to: string;
  shipping_price: string; free_shipping: boolean; dispatch_time: string; delivery_estimate: string;
}

const EMPTY_FORM: ProductForm = {
  title: "", description: "", price: "0", category_id: "", condition: "new",
  status: "pending", inventory: "0", tags: "", seller_email: "", images: [], variants: [],
  subcategory: "", subsubcategory: "", currency: "GBP", brand: "", sku: "", ships_from: "", ships_from_location: "",
  ships_to: "", shipping_price: "", free_shipping: false, dispatch_time: "", delivery_estimate: "",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const CONDITION_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-600",
  used: "bg-gray-100 text-gray-600",
  refurbished: "bg-purple-50 text-purple-600",
};

const VARIANT_TYPES = ["size", "color", "condition", "material", "style", "other"];

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminProductsPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"products" | "categories" | "import-export">("products");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { loadCategories(); }, []);

  function loadCategories() {
    setCategories(SITE_CATEGORIES.map(c => ({ id: c.slug, name: c.name, slug: c.slug, description: null, product_count: 0 })));
  }

  const TABS = [
    { id: "products", label: "All Products", icon: Package },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "import-export", label: "Import / Export", icon: Upload },
  ] as const;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your marketplace catalogue</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "products"      && <ProductsTab authFetch={authFetch} categories={categories} />}
      {tab === "categories"    && <CategoriesTab authFetch={authFetch} categories={categories} onRefresh={loadCategories} />}
      {tab === "import-export" && <ImportExportTab authFetch={authFetch} categories={categories} />}
    </AdminLayout>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────

function ProductsTab({ authFetch, categories }: { authFetch: (url: string, opts?: RequestInit) => Promise<Response>; categories: Category[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, [search, statusFilter, categoryFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await authFetch(`/api/admin/products?${params}`);
      if (res.ok) { const d = await res.json(); setProducts(d.products ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }

  async function setStatus(id: string, status: string) {
    setActionId(id);
    const res = await authFetch(`/api/admin/products/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    setActionId(null);
  }

  async function deleteProduct(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setActionId(id);
    setDeleteConfirm(null);
    await authFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await load();
    setActionId(null);
  }

  function openAdd() { setEditProduct(null); setDrawerOpen(true); }
  async function openEdit(p: Product) {
    setActionId(p.id);
    try {
      const res = await authFetch(`/api/admin/products/${p.id}`);
      if (res.ok) setEditProduct(await res.json());
      else setEditProduct(p);
      setDrawerOpen(true);
    } finally { setActionId(null); }
  }
  function closeDrawer() { setDrawerOpen(false); setEditProduct(null); }

  const STATUS_PILLS = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
          />
        </div>
        <select
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 text-gray-600"
        >
          <option value="">All Categories</option>
          {SITE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F26B21] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {STATUS_PILLS.map(p => (
          <button key={p.value} onClick={() => setStatusFilter(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === p.value
                ? "bg-[#1A1D2E] text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >{p.label}</button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{total} products</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["", "Product", "Category", "Price", "Condition", "Stock", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center text-gray-400 py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No products found</p>
                  <p className="text-xs text-gray-300 mt-1">Add your first product or adjust filters</p>
                </td></tr>
              )}
              {products.map(p => {
                const imgs: string[] = Array.isArray(p.images) ? p.images : [];
                const thumb = imgs[0];
                const isActing = actionId === p.id;
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 w-12">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-semibold text-gray-800 truncate">{p.title}</p>
                      {p.seller_email && <p className="text-[10px] text-gray-400 truncate">{p.seller_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{SITE_CATEGORIES.find(c => c.slug === resolveCategory(p.category_id ?? "").category)?.name ?? p.category_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">£{parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${CONDITION_STYLE[p.condition] ?? "bg-gray-100 text-gray-500"}`}>{p.condition}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{p.inventory}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-40">
                        {p.status === "pending" && (
                          <>
                            <button onClick={() => setStatus(p.id, "approved")} disabled={isActing} title="Approve"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setStatus(p.id, "rejected")} disabled={isActing} title="Reject"
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <button onClick={() => setStatus(p.id, "rejected")} disabled={isActing} title="Reject"
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {p.status === "rejected" && (
                          <button onClick={() => setStatus(p.id, "approved")} disabled={isActing} title="Approve"
                            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <AdminListingPromotion listingId={p.id} title={p.title} status={p.status} />
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="w-7 h-7 rounded-lg bg-[#4A5CE8]/10 hover:bg-[#4A5CE8]/20 text-[#4A5CE8] flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} disabled={isActing}
                          className={`h-7 rounded-lg flex items-center justify-center gap-1 px-2 transition-colors disabled:opacity-40 ${
                            deleteConfirm === p.id
                              ? "bg-red-500 text-white text-[10px] font-bold"
                              : "w-7 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500"
                          }`}
                          title={deleteConfirm === p.id ? "Click to confirm" : "Delete"}
                          onBlur={() => setDeleteConfirm(null)}
                        >
                          {deleteConfirm === p.id ? <><AlertTriangle className="w-3 h-3" /> Confirm</> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Drawer */}
      {drawerOpen && (
        <ProductDrawer
          product={editProduct}
          categories={categories}
          authFetch={authFetch}
          onClose={closeDrawer}
          onSaved={() => { closeDrawer(); load(); }}
        />
      )}
    </div>
  );
}

// ── Product Drawer ────────────────────────────────────────────────────────────

function ProductDrawer({
  product, categories, authFetch, onClose, onSaved,
}: {
  product: Product | null;
  categories: Category[];
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductForm>(() => product ? {
    title: product.title,
    description: product.description ?? "",
    price: product.price,
    category_id: product.category_id ?? "",
    condition: product.condition,
    status: product.status,
    inventory: String(product.inventory),
    tags: product.tags ?? "",
    seller_email: product.seller_email ?? "",
    images: Array.isArray(product.images) ? [...product.images] : [],
    variants: Array.isArray(product.variants) ? product.variants.map(v => ({ ...v, priceModifier: String(v.priceModifier), inventory: String(v.inventory) })) : [],
    subcategory: product.subcategory ?? "", subsubcategory: product.subsubcategory ?? "", currency: product.currency ?? "GBP", brand: product.brand ?? "", sku: product.sku ?? "",
    ships_from: product.ships_from ?? "", ships_from_location: product.ships_from_location ?? "", ships_to: product.ships_to ?? "",
    shipping_price: product.shipping_price == null ? "" : String(product.shipping_price), free_shipping: Boolean(product.free_shipping),
    dispatch_time: product.dispatch_time ?? "", delivery_estimate: product.delivery_estimate ?? "",
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [section,setSection] = useState("details");
  const [dirty,setDirty] = useState(false);
  const tryClose=()=>{if(!dirty||window.confirm("Discard unsaved listing changes?"))onClose();};
  async function uploadFiles(files:FileList|null){
    if(!files?.length)return;
    setUploading(true);setError("");
    try{
      const next:string[]=[];
      for(const file of Array.from(files).slice(0,Math.max(0,12-form.images.filter(Boolean).length))){
        if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>3145728)throw Error("Choose JPG, PNG or WebP files under 3 MB");
        const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Could not read image"));reader.readAsDataURL(file);});
        const response=await authFetch("/api/admin/products/media-upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,dataUrl})});
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw Error(data?.error||"Could not upload image");
        next.push(data.url);
      }
      setForm(f=>({...f,images:[...f.images.filter(Boolean),...next].slice(0,12)}));
      setDirty(true);
      setSection("images");
    }catch(e){setError(e instanceof Error?e.message:"Upload failed");}
    finally{setUploading(false);}
  }

  const set = (key: keyof ProductForm, val: any) => {setDirty(true);setForm(f => ({ ...f, [key]: val }));};

  function addImage() { if(form.images.length<12)set("images", [...form.images, ""]); }
  function setImage(i: number, val: string) { const imgs = [...form.images]; imgs[i] = val; set("images", imgs); }
  function removeImage(i: number) { set("images", form.images.filter((_, idx) => idx !== i)); }
  function makeCover(i:number){const copy=[...form.images];const [chosen]=copy.splice(i,1);set("images",[chosen,...copy]);}

  function addVariant() { set("variants", [...form.variants, { type: "size", value: "", priceModifier: "0", inventory: "0" }]); }
  function setVariant(i: number, key: keyof Variant, val: string) {
    const vs = [...form.variants]; vs[i] = { ...vs[i], [key]: val }; set("variants", vs);
  }
  function removeVariant(i: number) { set("variants", form.variants.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if(uploading)return;
    setSaving(true);
    setError("");
    const body = {
      ...form,
      price: parseFloat(form.price) || 0,
      inventory: parseInt(form.inventory) || 0,
      category_id: form.category_id || null,
      images: form.images.filter(u => u.trim()),
      variants: form.variants.map(v => ({
        type: v.type, value: v.value,
        priceModifier: parseFloat(v.priceModifier) || 0,
        inventory: parseInt(v.inventory) || 0,
      })),
    };
    const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const res = await authFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { setDirty(false);onSaved(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[90]" onClick={tryClose} />
      <style>{`
        #bazunk-listing-editor#bazunk-listing-editor button,
        #bazunk-listing-editor#bazunk-listing-editor a.editor-action {
          background: #263b57 !important;
          background-color: #263b57 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 2px solid #8195ad !important;
          box-shadow: none !important;
          opacity: 1 !important;
          font-weight: 800 !important;
          text-shadow: none !important;
          filter: none !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button *,
        #bazunk-listing-editor#bazunk-listing-editor a.editor-action * {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          opacity: 1 !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button:hover:not(:disabled),
        #bazunk-listing-editor#bazunk-listing-editor a.editor-action:hover {
          background: #405c80 !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button:disabled {opacity:.55 !important;cursor:not-allowed;}
        #bazunk-listing-editor#bazunk-listing-editor button[data-editor-tone="primary"],
        #bazunk-listing-editor#bazunk-listing-editor button[data-editor-tab="selected"] {
          background: #1748bb !important;
          border-color: #93c5fd !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button[data-editor-tone="danger"] {
          background: #9f1d28 !important;border-color:#fca5a5 !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button[data-editor-tone="warning"] {
          background: #92500c !important;border-color:#fcd34d !important;
        }
        #bazunk-listing-editor#bazunk-listing-editor button:focus-visible,
        #bazunk-listing-editor#bazunk-listing-editor a.editor-action:focus-visible {
          outline: 3px solid #fbbf24 !important;outline-offset:2px;
        }
        #bazunk-listing-editor#bazunk-listing-editor .editor-panel {
          background: #1b304d !important;color:#ffffff !important;
          border:1px solid #566c87 !important;
        }
      `}</style>
      <div id="bazunk-listing-editor" role="dialog" aria-modal="true" aria-label="Edit listing" className="fixed left-1/2 top-1/2 z-[100] flex h-[min(90vh,780px)] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-500 bg-white text-slate-950 shadow-2xl dark:border-slate-600 dark:bg-[#101c30] dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-600 bg-slate-100 px-5 py-4 dark:bg-[#172943]">
          <div>
            <h2 className="font-black text-slate-950 dark:text-white">{isEdit ? "Edit Listing" : "New Product"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `ID: ${product!.id.slice(0, 8)}…` : "Fill in the product details"}</p>
          </div>
          <button onClick={tryClose} className="w-9 h-9 rounded-lg bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <nav aria-label="Editor sections" className="flex shrink-0 flex-wrap gap-2 border-b border-slate-600 bg-slate-100 px-4 py-3 dark:bg-[#172943]">
          {([{id:"details",label:"Details"},{id:"images",label:"Images"},{id:"variants",label:"Variants"},{id:"pricing",label:"Pricing & Shipping"},{id:"more",label:"Advanced"}] as const).map(t=>
            <button key={t.id} data-editor-tab={section===t.id?"selected":"other"} type="button" onClick={()=>{setSection(t.id);document.getElementById("product-editor-"+t.id)?.scrollIntoView({behavior:"smooth",block:"start"});}} className={`rounded-lg border-2 px-3 py-2 text-xs font-black ${section===t.id?"!border-blue-300 !bg-blue-700 !text-white":"!border-slate-500 !bg-slate-700 !text-white hover:!bg-slate-600"}`}>{t.label}</button>)}
        </nav>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 [&_input:not([type=checkbox]):not([type=file])]:!border-slate-400 [&_input:not([type=checkbox]):not([type=file])]:!bg-white [&_input:not([type=checkbox]):not([type=file])]:!text-slate-950 [&_textarea]:!bg-white [&_textarea]:!text-slate-950 [&_select]:!bg-white [&_select]:!text-slate-950 dark:[&_label_span]:!text-white dark:[&_h3]:!text-white dark:[&_p]:!text-white">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div id="product-editor-details" />
          {isEdit&&<div className="editor-panel flex flex-wrap gap-2 rounded-xl p-3">
            <a href={`/listing/${product!.id}`} target="_blank" rel="noopener noreferrer" className="editor-action rounded-lg border border-slate-500 !bg-[#334155] px-3 py-2 text-xs font-black !text-white hover:!bg-[#475569]">View on Bazunk ↗</a>
            <button type="button" onClick={async()=>{if(!window.confirm("Hide this listing from the storefront?"))return;const response=await authFetch(`/api/admin/listings/${product!.id}/visibility`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({hidden:true})});if(response.ok)onSaved();else setError((await response.json().catch(()=>({}))).error||"Could not hide listing");}} data-editor-tone="warning" className="rounded-lg border border-amber-500 !bg-[#92400e] px-3 py-2 text-xs font-black !text-white hover:!bg-[#b45309]">Hide listing</button>
            <button type="button" onClick={async()=>{if(!window.confirm("Permanently delete this listing? Associated orders and protected records cannot be deleted."))return;const response=await authFetch(`/api/admin/listings/${product!.id}/safe-delete`,{method:"DELETE"});if(response.ok)onSaved();else setError((await response.json().catch(()=>({}))).error||"Could not delete listing");}} data-editor-tone="danger" className="rounded-lg border border-red-500 !bg-[#991b1b] px-3 py-2 text-xs font-black !text-white hover:!bg-[#b91c1c]">Delete listing</button>
          </div>}
          {isEdit&&<div className="editor-panel rounded-xl p-3">
            <h3 className="mb-2 text-sm font-black">Listing promotion</h3>
            <AdminListingPromotion listingId={Number(product?.id)} title={product?.title??""} status={product?.status==="approved"?"active":product?.status??"pending"}/>
          </div>}
          {/* Core fields */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Title *</span>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                placeholder="Product name" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Description</span>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                rows={3}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                placeholder="Describe the product…" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Price (£)</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Inventory</span>
                <input type="number" min="0" value={form.inventory} onChange={e => set("inventory", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Condition</span>
                <select value={form.condition} onChange={e => set("condition", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="new">New</option>
                  <option value="new-with-tags">New with tags</option>
                  <option value="new-without-tags">New without tags</option>
                  <option value="new-with-defects">New with defects</option>
                  <option value="open-box">Open box</option>
                  <option value="certified-refurbished">Certified refurbished</option>
                  <option value="excellent-refurbished">Excellent refurbished</option>
                  <option value="very-good-refurbished">Very good refurbished</option>
                  <option value="good-refurbished">Good refurbished</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="excellent">Excellent</option>
                  <option value="very-good">Very good</option>
                  <option value="good">Good</option>
                  <option value="used">Used / Pre-owned</option>
                  <option value="for-parts">For parts / not working</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Status</span>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="inactive">Hidden</option>
                  <option value="suspended">Suspended</option>
                  <option value="sold" disabled>Sold (read-only status)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Category</span>
                <select value={form.category_id} onChange={e => { set("category_id", e.target.value); set("subcategory", ""); }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="">None</option>
                  {form.category_id && !SITE_CATEGORIES.some(c => c.slug === form.category_id) && <option value={form.category_id}>Current category: {form.category_id} (legacy)</option>}
                  {SITE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Seller Email</span>
                <input value={form.seller_email} onChange={e => set("seller_email", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  placeholder="seller@example.com" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tags</span>
                <input value={form.tags} onChange={e => set("tags", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  placeholder="tag1, tag2, tag3" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Subcategory</span>
                <select value={form.subcategory} onChange={e => setForm(f => ({...f, subcategory: e.target.value, subsubcategory: ""}))} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">No subcategory</option>
                  {form.subcategory && !SITE_CATEGORIES.find(c => c.slug === form.category_id)?.subcategories.some(sub => sub.slug === form.subcategory) && <option value={form.subcategory}>Current subcategory: {form.subcategory} (legacy)</option>}
                  {(SITE_CATEGORIES.find(c => c.slug === form.category_id)?.subcategories ?? []).map(sub => <option key={sub.slug} value={sub.slug}>{sub.name}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Third-level category</span>
                <select value={form.subsubcategory} onChange={e => set("subsubcategory", e.target.value)} disabled={!form.subcategory} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900">
                  <option value="">Unclassified (optional)</option>
                  {form.subsubcategory && !suggestedThirdLevel(form.category_id, form.subcategory).some(name => thirdLevelSlug(name) === form.subsubcategory) && <option value={form.subsubcategory}>Current: {form.subsubcategory} (legacy)</option>}
                  {suggestedThirdLevel(form.category_id, form.subcategory).map(name => <option key={name} value={thirdLevelSlug(name)}>{name}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Brand</span>
                <input value={form.brand} onChange={e => set("brand", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></label>
              <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">SKU</span>
                <input value={form.sku} onChange={e => set("sku", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></label>
            </div>

            <div id="product-editor-pricing" className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div><h3 className="text-sm font-black text-gray-800">Shipping & fulfilment</h3><p className="text-xs text-gray-400">Customer-facing delivery information for this listing.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ships from country</span>
                  <input value={form.ships_from} onChange={e => set("ships_from", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="United Kingdom" /></label>
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ship-from location</span>
                  <input value={form.ships_from_location} onChange={e => set("ships_from_location", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Sunderland, UK" /></label>
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ships to</span>
                  <input value={form.ships_to} onChange={e => set("ships_to", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="United Kingdom" /></label>
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Postage price</span>
                  <input type="number" min="0" step="0.01" disabled={form.free_shipping} value={form.shipping_price} onChange={e => set("shipping_price", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-50" /></label>
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Dispatch time</span>
                  <input value={form.dispatch_time} onChange={e => set("dispatch_time", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="1 business day" /></label>
                <label className="block"><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Delivery estimate</span>
                  <input value={form.delivery_estimate} onChange={e => set("delivery_estimate", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="2–4 business days" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.free_shipping} onChange={e => set("free_shipping", e.target.checked)} /> Free shipping</label>
            </div>

            <div id="product-editor-more" />
            {isEdit && product?.source && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
                <div><h3 className="text-sm font-black text-gray-800">Source & Sync</h3><p className="text-xs text-gray-500">Private sourcing data. Editing the product above does not remove this information.</p></div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><span className="text-gray-400">Source</span><p className="font-semibold text-gray-700">{product.source}</p></div>
                  <div><span className="text-gray-400">Source item</span><p className="font-semibold text-gray-700">{product.source_item_id || "—"}</p></div>
                  <div><span className="text-gray-400">Original condition</span><p className="font-semibold text-gray-700">{product.source_condition || "—"}</p></div>
                  <div><span className="text-gray-400">Source price</span><p className="font-semibold text-gray-700">{product.source_price ?? "—"}</p></div>
                  <div><span className="text-gray-400">Source postage</span><p className="font-semibold text-gray-700">{product.source_postage ?? "—"}</p></div>
                  <div><span className="text-gray-400">Last source check</span><p className="font-semibold text-gray-700">{product.last_source_check ? new Date(product.last_source_check).toLocaleString() : "—"}</p></div>
                  <div><span className="text-gray-400">Markup</span><p className="font-semibold text-gray-700">{product.markup_pct != null ? `${product.markup_pct}%` : "—"}</p></div>
                  <div><span className="text-gray-400">Minimum profit</span><p className="font-semibold text-gray-700">{product.minimum_profit ?? "—"}</p></div>
                </div>
                {product.source_url && <a href={product.source_url} target="_blank" rel="noreferrer" className="inline-flex text-xs font-bold text-[#4A5CE8] hover:underline">View original source listing ↗</a>}
              </div>
            )}
          </div>

          <div id="product-editor-images" />
          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Images</span>
              <button onClick={addImage} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-600">
                <Plus className="w-3 h-3" /> Add URL
              </button>
            </div>
            <label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void uploadFiles(e.dataTransfer.files);}} className="mb-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-500 bg-blue-50 p-4 text-center font-bold text-slate-950 dark:bg-slate-800 dark:text-white">
              <Upload className="h-5 w-5"/>{uploading?"Uploading images…":"Upload or drop images here"}
              <span className="text-xs">JPG, PNG, WebP · 3 MB each · up to 12</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={uploading} className="max-w-full text-xs" onChange={e=>{void uploadFiles(e.target.files);e.target.value="";}}/>
            </label>
            {form.images.length === 0 && (
              <p className="text-xs text-gray-400 italic">No images — click "Add URL" to add image links</p>
            )}
            <div className="space-y-2">
              {form.images.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  {url && <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  {!url && <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center"><ImageIcon className="w-3 h-3 text-gray-300" /></div>}
                  <input value={url} onChange={e => setImage(i, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                  {i===0 ? <span className="rounded bg-emerald-700 px-2 py-1 text-xs font-black text-white">Cover</span> : <button type="button" onClick={()=>makeCover(i)} className="rounded bg-blue-700 px-2 py-1 text-xs font-black text-white">Set cover</button>}
                  <button onClick={() => removeImage(i)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div id="product-editor-variants" />
          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Variants</span>
              <button onClick={addVariant} className="flex items-center gap-1 text-xs font-semibold text-[#4A5CE8] hover:underline">
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            {form.variants.length === 0 && (
              <p className="text-xs text-gray-400 italic">No variants — click "Add Variant" for size, colour, etc.</p>
            )}
            {form.variants.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-x-auto">
                <div className="grid grid-cols-[100px_1fr_80px_60px_32px] gap-0 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wide min-w-[420px]">
                  <span>Type</span><span>Value</span><span>Price +/-</span><span>Stock</span><span />
                </div>
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_80px_60px_32px] gap-1 px-2 py-2 border-t border-gray-50 items-center min-w-[420px]">
                    <select value={v.type} onChange={e => setVariant(i, "type", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]">
                      {VARIANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={v.value} onChange={e => setVariant(i, "value", e.target.value)}
                      placeholder="e.g. Large" className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <input type="number" step="0.01" value={v.priceModifier} onChange={e => setVariant(i, "priceModifier", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <input type="number" min="0" value={v.inventory} onChange={e => setVariant(i, "inventory", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <button onClick={() => removeVariant(i)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-500 bg-slate-100 px-5 py-4 dark:bg-[#172943]">
          <button onClick={tryClose} className="flex-1 rounded-xl border-2 border-slate-500 !bg-[#334155] py-2.5 text-sm font-black !text-white hover:!bg-[#475569] transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving||uploading}
            data-editor-tone="primary" className="flex-1 py-2.5 rounded-xl !bg-[#c2410c] !text-white text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isEdit ? "Save Changes" : "Create Product"}</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab({ authFetch }: { authFetch: (url: string, opts?: RequestInit) => Promise<Response>; categories: Category[]; onRefresh: () => void }) {
  type Entry = { category: string; subcategory: string; slug: string; name: string; visible: boolean; sort_order: number };
  const [entries, setEntries] = useState<Entry[]>([]);
  type DisplayEntry={category_slug:string;subcategory_slug:string;name:string;visible:boolean;sort_order:number};
  const [display,setDisplay]=useState<DisplayEntry[]>([]);
  const [selectedTop,setSelectedTop]=useState(CATEGORIES[0]?.slug??"");
  const [displayError,setDisplayError]=useState("");
  const [displayBusy,setDisplayBusy]=useState(false);
  useEffect(()=>{
    authFetch("/api/taxonomy/category-overrides").then(async r=>{
      if(!r.ok)throw Error("Cannot load saved category display names");
      const data=await r.json();
      const overrides=new Map<string,DisplayEntry>((data.overrides??[]).map((x:DisplayEntry)=>[x.category_slug+":"+x.subcategory_slug,x]));
      const all:DisplayEntry[]=[];
      CATEGORIES.forEach((c,i)=>{
        all.push(overrides.get(c.slug+":")??{category_slug:c.slug,subcategory_slug:"",name:c.name,visible:true,sort_order:i});
        c.subcategories.forEach((sub,j)=>all.push(overrides.get(c.slug+":"+sub.slug)??{category_slug:c.slug,subcategory_slug:sub.slug,name:sub.name,visible:true,sort_order:j}));
      });
      setDisplay(all);
    }).catch(e=>setDisplayError(String(e)));
  },[authFetch]);
  const changeDisplay=(key:string,changes:Partial<DisplayEntry>)=>setDisplay(prev=>prev.map(x=>x.category_slug+":"+x.subcategory_slug===key?{...x,...changes}:x));
  async function saveDisplay(){
    setDisplayBusy(true);setDisplayError("");
    try{
      const response=await authFetch("/api/admin/taxonomy/category-overrides",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({overrides:display})});
      if(!response.ok)throw Error((await response.json().catch(()=>({})).error??"Could not save categories"));
      setDisplayError("Saved category names, order and visibility. Category slugs and existing listings were retained.");
    }catch(e){setDisplayError(String(e));}finally{setDisplayBusy(false);}
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]?.slug ?? "");
  const [subcategory, setSubcategory] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    authFetch("/api/admin/taxonomy/third-level").then(async response => {
      if (!response.ok) throw Error("Taxonomy could not be loaded");
      const data = await response.json();
      setEntries(data.categories ?? []);
    }).catch(error => setMessage(String(error))).finally(() => setLoading(false));
  }, [authFetch]);
  type Evidence={category:string;subcategory:string;count:number;titles:string[]};
  const [evidence,setEvidence]=useState<Evidence[]>([]);
  const [selectedProposals,setSelectedProposals]=useState<string[]>([]);
  useEffect(()=>{authFetch("/api/admin/taxonomy/listing-evidence").then(r=>r.ok?r.json():{groups:[]}).then(data=>setEvidence(data.groups??[])).catch(()=>{});},[authFetch]);
  const proposed=CATEGORIES.find(c=>c.slug===category)?.subcategories.flatMap(sub=>
   thirdLevelProposals(category,sub.slug,sub.name).map((label,i)=>({
    category,subcategory:sub.slug,slug:thirdLevelSlug(label),name:label,visible:true,sort_order:i,
    count:evidence.find(x=>x.category===category&&x.subcategory===sub.slug)?.count??0
   })))??[];
  const unadded=proposed.filter(x=>!entries.some(e=>e.category===x.category&&e.subcategory===x.subcategory&&e.slug===x.slug));
  const proposalKey=(x:{category:string;subcategory:string;slug:string})=>x.category+":"+x.subcategory+":"+x.slug;
  function addSelectedProposals(){
   const choices=unadded.filter(x=>selectedProposals.includes(proposalKey(x)));
   setEntries(old=>[...old,...choices.map(({count,...item})=>item)]);
   setSelectedProposals([]);
   setMessage(choices.length+" third-level categories added to draft. Review them and click Save taxonomy to publish.");
  }
  const options = CATEGORIES.find(c => c.slug === category)?.subcategories ?? [];
  function add() {
    const clean = name.trim(), slug = thirdLevelSlug(clean);
    if (!clean || !slug || !subcategory) { setMessage("Choose a subcategory and enter a name."); return; }
    if (entries.some(e => e.category === category && e.subcategory === subcategory && e.slug === slug)) { setMessage("That third-level category already exists."); return; }
    setEntries(prev => [...prev, { category, subcategory, name: clean, slug, visible: true, sort_order: prev.filter(e => e.category === category && e.subcategory === subcategory).length }]);
    setName(""); setMessage("Unsaved changes — click Save taxonomy.");
  }
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await authFetch("/api/admin/taxonomy/third-level", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: entries }) });
      if (!response.ok) throw Error((await response.json()).error ?? "Save failed");
      setMessage("Taxonomy saved.");
    } catch (error) { setMessage(String(error)); } finally { setSaving(false); }
  }
  return <div className="space-y-4">
    <section className="rounded-xl border-2 border-slate-500 bg-white p-4 text-slate-950 dark:bg-[#13243b] dark:text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-black">Main categories & subcategories</h3>
        <p className="text-xs text-slate-700 dark:text-slate-200">Rename display labels, change their order or visibility without modifying permanent slugs or existing listings.</p></div>
        <button type="button" onClick={saveDisplay} disabled={displayBusy||!display.length} className="rounded-lg !bg-blue-700 px-4 py-2 font-black !text-white hover:!bg-blue-600 disabled:opacity-60">{displayBusy?"Saving…":"Save categories"}</button>
      </div>
      {displayError&&<p role="status" className="mb-3 rounded bg-slate-700 p-2 text-sm font-bold text-white">{displayError}</p>}
      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <div className="max-h-[460px] space-y-1 overflow-y-auto">
          {display.filter(x=>!x.subcategory_slug).sort((a,b)=>a.sort_order-b.sort_order).map(x=>
            <button key={x.category_slug} type="button" onClick={()=>setSelectedTop(x.category_slug)} className={`block w-full rounded-lg border px-3 py-2 text-left text-sm font-bold !text-white ${selectedTop===x.category_slug?"!bg-blue-700 border-blue-300":"!bg-slate-700 border-slate-500 hover:!bg-slate-600"}`}>{x.name}</button>)}
        </div>
        <div className="space-y-3">
          {display.filter(x=>x.category_slug===selectedTop).sort((a,b)=>(!a.subcategory_slug?-1:!b.subcategory_slug?1:a.sort_order-b.sort_order)).map(x=>
            <div key={x.category_slug+":"+x.subcategory_slug} className="rounded-lg border border-slate-400 bg-slate-100 p-3 dark:border-slate-600 dark:bg-slate-800">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{x.subcategory_slug?"Subcategory":"Main category"}</strong>
                <code className="text-xs text-slate-700 dark:text-slate-200">{x.subcategory_slug||x.category_slug}</code>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Display name" value={x.name} onChange={e=>changeDisplay(x.category_slug+":"+x.subcategory_slug,{name:e.target.value})} className="min-w-36 flex-1 rounded border border-slate-500 bg-white p-2 text-sm font-semibold text-slate-950"/>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={x.visible} onChange={e=>changeDisplay(x.category_slug+":"+x.subcategory_slug,{visible:e.target.checked})}/> Visible</label>
                <label className="flex items-center gap-1 text-xs font-bold">Order <input aria-label="Sort order" type="number" min="0" max="9999" value={x.sort_order} onChange={e=>changeDisplay(x.category_slug+":"+x.subcategory_slug,{sort_order:Number(e.target.value)})} className="w-16 rounded border border-slate-500 bg-white p-2 text-slate-950"/></label>
              </div>
            </div>)}
        </div>
      </div>
    </section>
    <section className="rounded-xl border-2 border-slate-500 bg-white p-4 text-slate-950 dark:bg-[#13243b] dark:text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-black">Third-level category suggestion library</h3>
          <p className="text-xs text-slate-700 dark:text-slate-200">Review suggestions for {CATEGORIES.find(c=>c.slug===category)?.name}. Counts show existing listings within each subcategory, not automatically classified matches.</p>
        </div>
        <button type="button" disabled={!selectedProposals.length} onClick={addSelectedProposals} className="rounded-lg !bg-blue-700 px-4 py-2 text-sm font-black !text-white disabled:opacity-50">Add {selectedProposals.length} to draft</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={()=>setSelectedProposals(unadded.map(proposalKey))} className="rounded-lg !bg-slate-700 px-3 py-2 text-xs font-black !text-white">Select all suggestions</button>
        <button type="button" onClick={()=>setSelectedProposals([])} className="rounded-lg !bg-slate-700 px-3 py-2 text-xs font-black !text-white">Clear selection</button>
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {unadded.map(x=><label key={proposalKey(x)} className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border border-slate-400 bg-slate-100 p-3 dark:border-slate-600 dark:bg-slate-800">
          <input type="checkbox" checked={selectedProposals.includes(proposalKey(x))} onChange={e=>setSelectedProposals(prev=>e.target.checked?[...prev,proposalKey(x)]:prev.filter(k=>k!==proposalKey(x)))} />
          <strong className="flex-1 text-sm">{x.name}</strong>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{x.subcategory} · {x.count} existing listings</span>
        </label>)}
        {!unadded.length&&<p className="text-sm">No remaining suggestions for this main category.</p>}
      </div>
    </section>
    <p className="text-sm text-gray-600 dark:text-white">Manage third-level categories. Existing listings without a third-level category remain valid. Hiding a category does not delete its listings.</p>
    <div className="flex flex-wrap gap-2">
      <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(""); }} className="border rounded-lg p-2 bg-white text-gray-900">{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="border rounded-lg p-2 bg-white text-gray-900"><option value="">Choose subcategory</option>{options.map(sub => <option key={sub.slug} value={sub.slug}>{sub.name}</option>)}</select>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="New third-level category" className="border rounded-lg p-2 text-gray-900" />
      <button onClick={add} className="bg-indigo-600 text-white px-4 rounded-lg">Add</button>
      <button onClick={save} disabled={saving || loading} className="bg-emerald-700 text-white px-4 rounded-lg disabled:opacity-50">{saving ? "Saving…" : "Save taxonomy"}</button>
    </div>
    {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
    {loading ? <p>Loading taxonomy…</p> : <div className="space-y-2">
      {entries.filter(e => e.category === category && (!subcategory || e.subcategory === subcategory)).sort((a,b) => a.sort_order-b.sort_order).map(e => <div key={e.category+":"+e.subcategory+":"+e.slug} className="flex flex-wrap gap-3 items-center border rounded-lg p-3 bg-white">
        <span className="text-xs text-gray-500">{e.subcategory}</span>
        <input aria-label="Category name" value={e.name} onChange={event => setEntries(prev => prev.map(x => x === e ? {...x,name:event.target.value} : x))} className="border rounded p-2 flex-1 min-w-32 text-gray-900" />
        <span className="text-xs text-gray-500">{e.slug}</span>
        <label className="text-sm"><input type="checkbox" checked={e.visible} onChange={event => setEntries(prev => prev.map(x => x === e ? {...x,visible:event.target.checked} : x))} /> Visible</label>
        <input type="number" aria-label="Sort order" value={e.sort_order} onChange={event => setEntries(prev => prev.map(x => x === e ? {...x,sort_order:Number(event.target.value)} : x))} className="w-16 border rounded p-2 text-gray-900" />
      </div>)}
    </div>}
  </div>;
}

function ImportExportTab({ authFetch, categories }: {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  categories: Category[];
}) {
  const [exportStatus, setExportStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const SAMPLE_CSV = `title,description,price,category_slug,condition,inventory,status,tags,image_url,seller_email
"Blue Denim Jacket","Classic slim-fit denim jacket",29.99,clothing,used,5,approved,"jacket,denim",https://example.com/jacket.jpg,seller@example.com
"Wireless Headphones","Sony WH-1000XM4",199.99,electronics,new,10,pending,"audio,wireless",,`;

  async function handleExport() {
    const params = new URLSearchParams();
    if (exportStatus) params.set("status", exportStatus);
    const res = await authFetch(`/api/admin/products/export?${params}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `products-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    const res = await authFetch("/api/admin/products/import", {
      method: "POST", body: JSON.stringify({ csv: importText }),
    });
    if (res.ok) { const d = await res.json(); setImportResult(d); }
    else { setImportResult({ imported: 0, errors: ["Import failed — check CSV format"] }); }
    setImporting(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImportText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Export */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Export Products</h3>
            <p className="text-xs text-gray-400">Download all products as CSV</p>
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Filter by Status</span>
          <select value={exportStatus} onChange={e => setExportStatus(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30">
            <option value="">All Products</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </label>

        <button onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" /> Download CSV
        </button>

        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-600 mb-2">CSV Columns</p>
          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
            id, title, description, price, category_slug, condition, inventory, status, tags, image_url, seller_email
          </p>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center">
            <Upload className="w-4 h-4 text-[#4A5CE8]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Import Products</h3>
            <p className="text-xs text-gray-400">Bulk upload via CSV file or paste</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Upload File
          </button>
          <button onClick={() => setImportText(SAMPLE_CSV)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Load Sample
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={importText} onChange={e => setImportText(e.target.value)}
          rows={8}
          placeholder="Paste CSV content here or upload a file above…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none mb-3"
        />

        <button onClick={handleImport} disabled={importing || !importText.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A5CE8] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
          {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import Products</>}
        </button>

        {importResult && (
          <div className={`mt-4 rounded-xl p-4 ${importResult.imported > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
            <p className={`text-sm font-bold mb-2 ${importResult.imported > 0 ? "text-emerald-700" : "text-gray-600"}`}>
              {importResult.imported > 0 ? `✓ ${importResult.imported} products imported` : "No products imported"}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="space-y-1">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-[10px] text-amber-700 font-semibold">Category slugs must match existing categories. Use the <strong>Categories</strong> tab to manage them first.</p>
        </div>
      </div>
    </div>
  );
}

export function AdminListingEditor({listingId,onClose,onSaved}:{listingId:number|null;onClose:()=>void;onSaved:()=>void}) {
  const {authFetch}=useAdmin();
  const [product,setProduct]=useState<Product|null>(null);
  const [loading,setLoading]=useState(true);
  const categories=SITE_CATEGORIES.map(c=>({id:c.slug,name:c.name,slug:c.slug,description:null,product_count:0}));
  useEffect(()=>{
    let cancelled=false;
    if(listingId===null){setProduct(null);setLoading(false);return;}
    setLoading(true);
    void authFetch(`/api/admin/products/${listingId}`).then(async r=>{
      if(!r.ok)throw new Error("Could not load listing for editing");
      const value=await r.json();if(!cancelled)setProduct(value);
    }).catch(()=>{if(!cancelled)onClose();}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[listingId]);
  if(loading)return <p role="status" className="p-4 text-white">Loading listing editor…</p>;
  return <ProductDrawer product={product} categories={categories} authFetch={authFetch} onClose={onClose} onSaved={onSaved}/>;
}
export function AdminListingCatalogueTools({section}:{section:"categories"|"import-export"}) {
  const {authFetch}=useAdmin();
  const categories=SITE_CATEGORIES.map(c=>({id:c.slug,name:c.name,slug:c.slug,description:null,product_count:0}));
  return section==="categories"
    ? <CategoriesTab authFetch={authFetch} categories={categories} onRefresh={()=>{}}/>
    : <ImportExportTab authFetch={authFetch} categories={categories}/>;
}
