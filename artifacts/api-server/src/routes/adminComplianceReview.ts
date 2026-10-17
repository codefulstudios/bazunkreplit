import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router=Router();
// Mounted behind the existing admin middleware.
router.get("/admin/seller-compliance/cases/:id/history",async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1){res.status(400).json({error:"Invalid case id"});return;}
  try{
    const [cases,events,appeals]=await Promise.all([
      db.execute(sql`SELECT id,seller_email,status,assigned_admin,opened_at,updated_at,closed_at FROM seller_compliance_cases WHERE id=${id}`),
      db.execute(sql`SELECT id,actor_type,actor_id,action,details,created_at FROM seller_compliance_events WHERE case_id=${id} ORDER BY created_at DESC LIMIT 100`),
      db.execute(sql`SELECT id,status,explanation,decision_reason,created_at,decided_at FROM seller_compliance_appeals WHERE case_id=${id} ORDER BY created_at DESC LIMIT 25`)
    ]);
    if(!cases.rows.length){res.status(404).json({error:"Case not found"});return;}
    res.setHeader("Cache-Control","private,no-store");
    res.json({case:cases.rows[0],events:events.rows,appeals:appeals.rows,limits:"Latest 100 events and 25 appeals; older history remains in database."});
  }catch(e){console.error("Compliance history error",e);res.status(503).json({error:"Could not load case history"});}
});
router.post("/admin/seller-compliance/cases/:id/note",async(req,res)=>{
  const id=Number(req.params.id),note=String(req.body?.note||"").trim();
  if(!Number.isSafeInteger(id)||id<1||note.length<20||note.length>3000){
    res.status(400).json({error:"Case and internal review note of 20–3000 characters required"});return;
  }
  try{
    const result=await db.execute(sql`INSERT INTO seller_compliance_events(case_id,actor_type,actor_id,action,details)
      SELECT c.id,'admin','admin','review_note',${JSON.stringify({note})}::jsonb
      FROM seller_compliance_cases c WHERE c.id=${id} RETURNING id,created_at`);
    if(!result.rows.length){res.status(404).json({error:"Case not found"});return;}
    res.status(201).json({note:result.rows[0]});
  }catch(e){console.error("Compliance review note error",e);res.status(503).json({error:"Could not preserve review note"});}
});
export default router;
