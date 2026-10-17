import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// Mount after requireAdmin in admin.ts. All responses are administrator-only.
const router = Router();

const counts = [
  { id: "orders", label: "Orders awaiting dispatch", href: "/admin/orders", icon: "orders" },
  { id: "disputes", label: "Open disputes", href: "/admin/disputes", icon: "cases" },
  { id: "returns", label: "Open returns", href: "/admin/returns", icon: "returns" },
  { id: "support", label: "Support tickets needing attention", href: "/admin/support", icon: "support" },
  { id: "compliance", label: "Seller compliance cases", href: "/admin/seller-compliance", icon: "compliance" },
  { id: "appeals", label: "Pending seller appeals", href: "/admin/seller-compliance", icon: "compliance" },
] as const;

router.get("/admin/alerts", async (_req, res) => {
  try {
    // These are open/workload counts, not unread counts. They are derived from
    // live PostgreSQL records, never from client-side placeholder figures.
    const [work, activity] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM orders WHERE status IN ('pending','confirmed','preparing')) AS orders,
          (SELECT COUNT(*)::int FROM disputes WHERE LOWER(status) NOT IN ('resolved','closed','rejected')) AS disputes,
          (SELECT COUNT(*)::int FROM returns WHERE LOWER(status) NOT IN ('completed','closed','rejected','cancelled','refund_issued','declined')) AS returns,
          (SELECT COUNT(*)::int FROM support_tickets WHERE LOWER(status) NOT IN ('closed','resolved')) AS support,
          (SELECT COUNT(*)::int FROM seller_compliance_cases WHERE LOWER(status) NOT IN ('resolved','closed','dismissed')) AS compliance,
          (SELECT COUNT(*)::int FROM seller_compliance_appeals WHERE LOWER(status)='pending') AS appeals
      `),
      db.execute(sql`
        SELECT kind, id, title, occurred_at FROM (
          SELECT 'order'::text AS kind,id::text,title,occurred_at FROM
            (SELECT id,('Order for '||LEFT(item_title,65)) AS title,created_at AS occurred_at
              FROM orders WHERE status IN ('pending','confirmed','preparing') ORDER BY created_at DESC LIMIT 5) o
          UNION ALL
          SELECT 'dispute',id,('Dispute: '||LEFT(item_title,65)),created_at FROM
            (SELECT id::text AS id,item_title,created_at FROM disputes WHERE LOWER(status) NOT IN ('resolved','closed','rejected')
             ORDER BY created_at DESC LIMIT 5) d
          UNION ALL
          SELECT 'return',id,('Return: '||LEFT(item_title,65)),created_at FROM
            (SELECT id::text AS id,item_title,created_at FROM returns WHERE LOWER(status) NOT IN ('completed','closed','rejected','cancelled','refund_issued','declined')
             ORDER BY created_at DESC LIMIT 5) r
          UNION ALL
          SELECT 'support',id,('Support: '||LEFT(subject,65)),created_at FROM
            (SELECT id::text AS id,subject,created_at FROM support_tickets WHERE LOWER(status) NOT IN ('closed','resolved')
             ORDER BY created_at DESC LIMIT 5) t
          UNION ALL
          SELECT 'compliance',id,('Seller review: '||LEFT(seller_email,65)),opened_at FROM
            (SELECT id::text AS id,seller_email,opened_at FROM seller_compliance_cases WHERE LOWER(status) NOT IN ('resolved','closed','dismissed')
             ORDER BY opened_at DESC LIMIT 5) c
        ) feed ORDER BY occurred_at DESC LIMIT 12
      `)
    ]);
    const row = work.rows[0] as Record<string, unknown>;
    const summary = counts.map(c => ({ ...c, count: Number(row[c.id] ?? 0) }));
    const paths: Record<string, string> = {
      order: "/admin/orders", dispute: "/admin/disputes", return: "/admin/returns",
      support: "/admin/support", compliance: "/admin/seller-compliance"
    };
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      counts: summary,
      total: summary.reduce((sum,c)=>sum+c.count,0),
      recent: (activity.rows as any[]).map(e=>({
        id: String(e.id), type: String(e.kind), title:String(e.title),
        time: e.occurred_at, href: paths[String(e.kind)] || "/admin/dashboard"
      })),
      refreshedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error({err}, "Admin alerts unavailable");
    res.status(503).json({error: "Could not load live admin alerts"});
  }
});

router.get("/admin/global-search", async (req,res)=>{
  try {
    const q = String(req.query.q ?? "").trim().slice(0,100);
    if(q.length<2){res.json({query:q,groups:[],total:0});return;}
    const like = "%"+q.replace(/[\\%_]/g,"\\$&")+"%";
    // Restrict all datasets to a few grounded matches and return only
    // administrative navigation fields (not full private records).
    const [users,listings,orders,payments,cases] = await Promise.all([
      db.execute(sql`SELECT email,COALESCE(name,'') name,COALESCE(username,'') username
        FROM users WHERE email ILIKE ${like} OR COALESCE(name,'') ILIKE ${like}
          OR COALESCE(username,'') ILIKE ${like}
        ORDER BY created_at DESC LIMIT 8`),
      db.execute(sql`SELECT id,public_id,title,seller_email,status
        FROM listings WHERE title ILIKE ${like} OR COALESCE(public_id,'') ILIKE ${like}
          OR seller_email ILIKE ${like} OR id::text ILIKE ${like}
        ORDER BY created_at DESC LIMIT 8`),
      db.execute(sql`SELECT id,item_title,buyer_email,seller_email,status
        FROM orders WHERE id ILIKE ${like} OR item_title ILIKE ${like}
          OR buyer_email ILIKE ${like} OR COALESCE(seller_email,'') ILIKE ${like}
          OR COALESCE(stripe_session_id,'') ILIKE ${like}
          OR COALESCE(stripe_transfer_id,'') ILIKE ${like}
        ORDER BY created_at DESC LIMIT 8`),
      db.execute(sql`SELECT id,email,kind,cash_amount,currency,created_at
        FROM credit_economy_ledger WHERE id ILIKE ${like} OR email ILIKE ${like}
          OR COALESCE(reference_id,'') ILIKE ${like}
        ORDER BY created_at DESC LIMIT 8`),
      db.execute(sql`
        SELECT kind,id,title,detail,status FROM (
          SELECT 'Compliance'::text kind,id::text id,
            ('Seller compliance #'||id::text) title,seller_email detail,status
            FROM seller_compliance_cases
            WHERE id::text ILIKE ${like} OR seller_email ILIKE ${like} OR status ILIKE ${like}
          UNION ALL
          SELECT 'Dispute',id,('Dispute: '||LEFT(item_title,80)),buyer_email,status FROM disputes
            WHERE id ILIKE ${like} OR item_title ILIKE ${like} OR buyer_email ILIKE ${like}
          UNION ALL
          SELECT 'Return',id,('Return: '||LEFT(item_title,80)),buyer_email,status FROM returns
            WHERE id ILIKE ${like} OR item_title ILIKE ${like} OR buyer_email ILIKE ${like}
          UNION ALL
          SELECT 'Support',id::text,('Ticket: '||LEFT(subject,80)),email,status FROM support_tickets
            WHERE id::text ILIKE ${like} OR subject ILIKE ${like} OR email ILIKE ${like}
        ) matches ORDER BY id DESC LIMIT 12`)
    ]);
    type Result = {id:string;title:string;subtitle:string;href:string};
    const groups: Array<{kind:string;label:string;results:Result[]}> = [
      {kind:"users",label:"Users",results:(users.rows as any[]).map(x=>({id:String(x.email),title:x.name||x.username||x.email,subtitle:x.email,href:"/admin/users"}))},
      {kind:"listings",label:"Listings",results:(listings.rows as any[]).map(x=>({id:String(x.id),title:x.title,subtitle:`${x.public_id||"#"+x.id} · ${x.status} · ${x.seller_email}`,href:"/admin/importer-control"}))},
      {kind:"orders",label:"Orders",results:(orders.rows as any[]).map(x=>({id:String(x.id),title:x.item_title||"Order",subtitle:`${x.id} · ${x.status} · ${x.buyer_email}`,href:"/admin/orders"}))},
      {kind:"payments",label:"Payments & credits",results:(payments.rows as any[]).map(x=>({id:String(x.id),title:`${x.kind||"Credit entry"}: ${x.email}`,subtitle:`${x.id} · ${x.currency||"GBP"} ${x.cash_amount||0}`,href:"/admin/payments"}))},
      {kind:"cases",label:"Cases & support",results:(cases.rows as any[]).map(x=>({id:`${x.kind}:${x.id}`,title:x.title,subtitle:`${x.status} · ${x.detail}`,href:x.kind==="Compliance"?"/admin/seller-compliance":x.kind==="Dispute"?"/admin/disputes":x.kind==="Return"?"/admin/returns":"/admin/support"}))}
    ];
    res.setHeader("Cache-Control","private, no-store");
    res.json({query:q,groups,total:groups.reduce((n,g)=>n+g.results.length,0)});
  } catch(err) {
    logger.error({err},"Admin global search failed");
    res.status(503).json({error:"Admin search unavailable"});
  }
});
export default router;
