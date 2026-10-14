import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

const connectionString=process.env.AUCTION_TEST_DATABASE_URL;
test("PostgreSQL auction locks serialize bids and closeout, including reserve handling", {skip:!connectionString && "AUCTION_TEST_DATABASE_URL not set"},async()=>{
  const pool=new pg.Pool({connectionString});
  const id="auction-regression-"+Date.now();
  const setup=await pool.connect();
  try {
    await setup.query("CREATE TEMP TABLE auction_lock_test (id text primary key,status text not null,current_bid numeric, reserve_price numeric, winner_bid numeric, end_time timestamptz not null)");
    // Temporary tables are session-local; use a dedicated schema-scoped test table visible to every connection.
  } finally {setup.release();}
  const table="auction_integrity_ci_test";
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id text primary key,status text not null,current_bid numeric,reserve_price numeric,winner_bid numeric,end_time timestamptz not null)`);
    await pool.query(`INSERT INTO ${table}(id,status,current_bid,reserve_price,end_time) VALUES($1,'active',10,20,now()+interval '10 minutes')`,[id]);
    const place=async(amount:number)=>{
      const client=await pool.connect();
      try {
        await client.query("BEGIN");
        const r=await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);
        if(r.rows[0].status!=="active" || amount<Number(r.rows[0].current_bid)+2){await client.query("ROLLBACK");return false;}
        await client.query(`UPDATE ${table} SET current_bid=$2,winner_bid=$2 WHERE id=$1`,[id,amount]);
        await client.query("COMMIT");return true;
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    };
    const results=await Promise.all([place(12),place(12)]);
    assert.equal(results.filter(Boolean).length,1,"exactly one competing bid accepted");
    const row=await pool.query(`SELECT current_bid,reserve_price FROM ${table} WHERE id=$1`,[id]);
    assert.equal(Number(row.rows[0].current_bid),12);
    assert.ok(Number(row.rows[0].current_bid)<Number(row.rows[0].reserve_price),"reserve not met");
    await pool.query(`UPDATE ${table} SET end_time=now()-interval '1 second' WHERE id=$1`,[id]);
    const close=()=>pool.query(`UPDATE ${table} SET status='ended',winner_bid=CASE WHEN winner_bid<reserve_price THEN NULL ELSE winner_bid END WHERE id=$1 AND status='active' AND end_time<=now() RETURNING id`,[id]);
    const closed=await Promise.all([close(),close(),close()]);
    assert.equal(closed.reduce((n,r)=>n+r.rowCount,0),1,"only one closeout succeeds");
    const ended=await pool.query(`SELECT status,winner_bid FROM ${table} WHERE id=$1`,[id]);
    assert.equal(ended.rows[0].status,"ended");
    assert.equal(ended.rows[0].winner_bid,null);
  }finally{
    await pool.query(`DELETE FROM ${table} WHERE id=$1`,[id]).catch(()=>{});
    await pool.end();
  }
});
