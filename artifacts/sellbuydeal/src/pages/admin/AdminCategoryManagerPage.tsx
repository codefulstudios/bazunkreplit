import { AdminLayout } from "./AdminLayout";
import { AdminListingCatalogueTools } from "./AdminProductsPage";
import { Link } from "wouter";

export function AdminCategoryManagerPage() {
  return <AdminLayout>
    <div id="bazunk-category-manager" className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <style>{`
        /* Isolated category manager palette. Explicitly defeat global admin button and input themes. */
        .bazunk-admin-wordpress #bazunk-category-manager,
        .bazunk-admin-wordpress #bazunk-category-manager section {
          color:#f8fafc !important; background-color:#14253e !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section {
          border:1px solid #617896 !important; border-radius:12px !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section div.rounded-lg,
        .bazunk-admin-wordpress #bazunk-category-manager section label.rounded-lg,
        .bazunk-admin-wordpress #bazunk-category-manager section .rounded-xl.bg-white {
          background:#243954 !important; border-color:#60799c !important; color:#fff !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section :is(h1,h2,h3,p,strong,label,code,span) {
          color:#fff !important; -webkit-text-fill-color:#fff !important;
          text-shadow:none !important; opacity:1 !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section button,
        .bazunk-admin-wordpress #bazunk-category-manager section button:not(:disabled) {
          background:#254e7c !important; background-color:#254e7c !important;
          color:#fff !important; -webkit-text-fill-color:#fff !important;
          border:2px solid #91b6e1 !important; opacity:1 !important;
          box-shadow:none !important; text-shadow:none !important; font-weight:800 !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section button:hover:not(:disabled) {background:#1765ba !important;}
        .bazunk-admin-wordpress #bazunk-category-manager section button[aria-pressed="true"],
        .bazunk-admin-wordpress #bazunk-category-manager section button.category-save {
          background:#1654c5 !important; border-color:#fff !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section :is(input:not([type="checkbox"]),textarea,select) {
          background:#fff !important; background-color:#fff !important;
          color:#111827 !important; -webkit-text-fill-color:#111827 !important;
          border:2px solid #64748b !important; opacity:1 !important;
        }
        .bazunk-admin-wordpress #bazunk-category-manager section :is(input:not([type="checkbox"]),textarea)::placeholder {color:#475569 !important;-webkit-text-fill-color:#475569 !important;}
        .bazunk-admin-wordpress #bazunk-category-manager section input[type="checkbox"] {accent-color:#fb923c;opacity:1 !important;}
        .bazunk-admin-wordpress #bazunk-category-manager :is(button,input,select):focus-visible {outline:3px solid #fde047 !important;outline-offset:2px;}
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
