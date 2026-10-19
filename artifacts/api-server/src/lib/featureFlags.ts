import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const FEATURE_DEFINITIONS = [
  ["quick_sell","Direct Sale","Selling"],["offers","Make an Offer","Selling"],["auctions","Auctions","Selling"],["flash_sales","Flash Sales","Selling"],["classifieds","Classifieds","Selling"],["live","Live selling","Selling"],["product_video","Product Video","Selling"],
  ["snap_sell","Snap & Sell","Tools"],["snap_barcode","Barcode & ISBN Scanning","Tools"],["snap_ai_writing","AI Photo & Writing","Tools"],["snap_background","Photo Background Cleanup","Tools"],["snap_pricing","Seller Pricing & Performance","Tools"],["importers","Importers","Tools"],["promotions","Promotions","Tools"],["watchers","Watch / Watcher offers","Tools"],["messaging","Messaging","Community"],["reviews","Reviews & reputation","Community"],["referrals","Referrals","Rewards"],["games","Rewards Arcade / Games","Rewards"],["credits","Credits","Rewards"],["cashback","Cashback","Rewards"],
  ["chatwoot_support","Chatwoot Live Support","Support"],["homepage_intro","Homepage Intro GIF","Appearance"],["currency_selector","Floating Country / Currency Selector","Appearance"],
  ["bundles","Bundles","Buying"],["personalized_recommendations","Personalised Recommendations","Buying"],["recently_viewed","Recently Viewed","Buying"],["combined_shipping","Combined Shipping","Buying"],["multi_item_discount","Multi-item Seller Discount","Buying"],["buyer_protection","Buyer Protection","Buying"],["disputes_returns","Disputes & Returns","Buying"],["verification","Seller verification","Trust"]
  ["bundles","Bundles","Buying"],["checkout_recovery","Checkout Recovery Messages","Buying"],["reputation_insights","Seller Reputation Insights","Trust"],["buyer_protection","Buyer Protection","Buying"],["disputes_returns","Disputes & Returns","Buying"],["verification","Seller verification","Trust"]
] as const;

export async function featureEnabled(key:string):Promise<boolean>{
  try {
    const r=await db.execute(sql`SELECT value FROM site_settings WHERE key=${`feature_${key}`} LIMIT 1`);
    const v=(r.rows[0] as any)?.value;
    return v == null ? true : String(v).toLowerCase() !== "false";
  } catch { return true; }
}
