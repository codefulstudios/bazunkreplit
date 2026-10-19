import type { ReactNode } from "react";
export function ListingDetailsSection({children}:{children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#304461] dark:bg-[#111f36] listing-details-section">{children}</section>}
export function ListingDeliverySection({children}:{children:ReactNode}){return <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-cyan-900 dark:bg-[#111f36] listing-delivery-section">{children}</section>}
export function ListingPurchaseSection({children}:{children:ReactNode}){return <section className="min-w-0 overflow-hidden rounded-2xl border border-orange-200 bg-white p-4 shadow-sm dark:border-orange-700/60 dark:bg-[#111f36] sm:p-5 listing-purchase-section">{children}</section>}
export function ListingSellerSection({children}:{children:ReactNode}){return <section aria-label="About the seller" className="listing-seller-section">{children}</section>}
export function ListingRelatedSection({children}:{children:ReactNode}){return <section aria-label="More products in this category" className="listing-related-section">{children}</section>}
