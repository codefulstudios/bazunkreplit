import { AdminLayout } from "./AdminLayout";
import { AdminListingCatalogueTools } from "./AdminProductsPage";
import { Link } from "wouter";

export function AdminCategoryManagerPage() {
  return <AdminLayout>
    <div id="bazunk-category-manager" className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <style>{`
        #bazunk-category-manager section {
          background: #182942 !important; color: #fff !important; border-color: #526887 !important;
        }
        #bazunk-category-manager section section,
        #bazunk-category-manager section div.rounded-lg,
        #bazunk-category-manager section label.rounded-lg {
          background: #243a58 !important; color: #fff !important; border-color: #627999 !important;
        }
        #bazunk-category-manager section p,
        #bazunk-category-manager section strong,
        #bazunk-category-manager section code,
        #bazunk-category-manager section label,
        #bazunk-category-manager section h3,
        #bazunk-category-manager section span:not(button span) {
          color: #fff !important; -webkit-text-fill-color: #fff !important;
        }
        #bazunk-category-manager button {
          background: #334d70 !important; color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          border: 1px solid #91a5be !important; opacity:1 !important;
        }
        #bazunk-category-manager button:hover:not(:disabled) { background: #43648d !important; }
        #bazunk-category-manager button[aria-pressed="true"],
        #bazunk-category-manager button[data-category-selected="true"],
        #bazunk-category-manager button.category-save {
          background: #1856cf !important; color:#fff !important; border-color:#93c5fd !important;
        }
        #bazunk-category-manager input:not([type="checkbox"]),
        #bazunk-category-manager select {
          background: #fff !important; color:#102039 !important;
          -webkit-text-fill-color:#102039 !important; border:2px solid #8193ab !important;
        }
        #bazunk-category-manager input[type="checkbox"] {accent-color:#fb923c;}
        #bazunk-category-manager button:focus-visible,
        #bazunk-category-manager input:focus-visible,
        #bazunk-category-manager select:focus-visible {outline:3px solid #fbbf24 !important; outline-offset:2px;}
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-white">Category Manager</h1>
          <p className="mt-1 text-sm text-slate-200">Rename, reorder, hide and restore main categories, subcategories and third-level categories.</p>
        </div>
        <Link href="/admin/listings" className="rounded-lg border-2 border-slate-400 bg-slate-700 px-4 py-2 text-sm font-bold text-white">← Back to Listings</Link>
      </div>
      <AdminListingCatalogueTools section="categories"/>
    </div>
  </AdminLayout>;
}
