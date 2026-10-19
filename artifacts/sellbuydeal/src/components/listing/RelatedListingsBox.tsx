import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Flame, Package } from "lucide-react";
interface RelatedItem { id: number; public_id: string; title: string; price: string; image: string | null; category: string; sponsored?: boolean; currency?: string; price_gbp?: string | number }

export function RelatedListingsBox({ category, excludeId }: { category: string; excludeId: number | string }) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  useEffect(() => {
    fetch(`/api/promotions/related?category=${encodeURIComponent(category)}&exclude=${excludeId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: RelatedItem[]) => {
        setItems((Array.isArray(data) ? data : []).slice(0, 3));
      })
      .catch(() => {});
  }, [category, excludeId]);

  if (items.length === 0) return null;
  const sponsored = items.some(item => item.sponsored === true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#111f36]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#F26B21]/10 flex items-center justify-center flex-shrink-0">
          <Flame className="w-3.5 h-3.5 text-[#F26B21]" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{sponsored ? "Sponsored listings in this category" : "More in this category"}</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <Link key={item.id} href={`/listing/${item.public_id ?? item.id}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.image
                ? <img src={item.image} alt={item.title} className="w-full h-full object-contain p-1" />
                : <Package className="w-5 h-5 text-gray-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#4A5CE8] transition-colors">{item.title}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">£{Number(item.price).toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
      {sponsored && <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-200">Paid placement · <Link href="/promotions" className="font-semibold text-orange-700 hover:underline">Promote your listing</Link></p>
      </div>}
    </div>
  );
}

