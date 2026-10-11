import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { scoreSellerRisk } from "./sellerComplianceRisk.js";

/** Conservative signals from server-owned listings. Does not infer legal seller status. */
export async function scanSellerCompliance(): Promise<{scanned:number;opened:number;updated:number}> {
  const rows=await db.execute(sql`
    SELECT u.email AS seller_email,
      COUNT(l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='active')::int AS active_listings,
      COUNT(l.id) FILTER (WHERE l.created_at >= NOW()-INTERVAL '30 days')::int AS listings_30d
    FROM users u JOIN listings l ON LOWER(l.seller_email)=LOWER(u.email)
    WHERE COALESCE(u.seller_type,'private')='private'
    GROUP BY u.email
    HAVING COUNT(l.id) FILTER (WHERE l.created_at >= NOW()-INTERVAL '30 days') >= 20
  `);
  let opened=0,updated=0;
  for(const row of rows.rows as any[]) {
    const email=String(row.seller_email);
    const duplicate=await db.execute(sql`
      SELECT COALESCE(MAX(n),0)::int AS units FROM (
        SELECT COUNT(*)::int AS n FROM listings
        WHERE LOWER(seller_email)=LOWER(${email}) AND created_at>=NOW()-INTERVAL '90 days'
          AND LOWER(COALESCE(condition,'')) LIKE 'new%'
        GROUP BY LOWER(TRIM(title))
      ) duplicates`);
    const risk=scoreSellerRisk({
      activeListings:Number(row.active_listings)||0,
      listingsCreated30d:Number(row.listings_30d)||0,
      completedSales30d:0, identicalNewStockMax:Number((duplicate.rows[0] as any)?.units)||0,
      replenishedSkuCount90d:0,importedListings30d:0,commercialDescriptionMatches:0,personalCollectionEvidence:false
    });
    // Enhanced risk creates a review case, never an automatic fee change.
    if(risk.band==="normal")continue;
    const existing=await db.execute(sql`SELECT id FROM seller_compliance_cases
      WHERE LOWER(seller_email)=LOWER(${email}) AND status IN ('open','awaiting_information','under_review','appealed')
      ORDER BY id DESC LIMIT 1`);
    const reasons=JSON.stringify(risk.reasons);
    if(existing.rows.length){
      await db.execute(sql`UPDATE seller_compliance_cases SET risk_score=${risk.score},risk_band=${risk.band},
        risk_reasons=${reasons}::jsonb,updated_at=NOW() WHERE id=${Number((existing.rows[0] as any).id)}`);
      updated++;
    }else{
      await db.execute(sql`INSERT INTO seller_compliance_cases(seller_email,risk_score,risk_band,risk_reasons,rule_version)
        VALUES(${email},${risk.score},${risk.band},${reasons}::jsonb,'v1')`);
      opened++;
    }
  }
  return {scanned:rows.rows.length,opened,updated};
}
