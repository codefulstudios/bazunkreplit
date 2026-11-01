const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const text=readFileSync(require('node:path').resolve(__dirname, '../../../artifacts/api-server/src/routes/stripe.ts'),'utf8');
const route=text.slice(text.indexOf('router.post("/mobile/account"'),text.indexOf('router.post("/stripe/sync-user"'));
async function call({auth={isAuthenticated:true,userId:'u1'},verified=true,banned=false,fail=false}={}) {
 let handler, synced;
 new Function('router','getAuth','clerkClient','isBanned','storage','logger','db','sql',route)(
 {post:(_,h)=>handler=h},()=>auth,
 {users:{getUser:async()=>({emailAddresses:[{id:'e1',emailAddress:'Owner@Example.com',verification:{status:verified?'verified':'unverified'}}],primaryEmailAddressId:'e1',fullName:'Owner'})}},async()=>banned,
 {upsertUser:async email=>{synced=email;if(fail)throw Error('db');return {name:'Owner',username:'owner'};}},{error:()=>{}},{execute:async()=>({rows:[{username:'owner'}]})},()=>null);
 let status=200,body;
 await handler({body:{email:'victim@example.com'}},{setHeader:()=>{},status:n=>{status=n;return {json:x=>body=x}},json:x=>body=x});
 return {status,body,synced};
}
test('rejects anonymous requests',async()=>assert.equal((await call({auth:{}})).status,401));
test('rejects unverified email and suspended accounts',async()=>{assert.equal((await call({verified:false})).status,403);assert.equal((await call({banned:true})).status,403)});
test('ignores caller email and syncs verified session identity',async()=>{const r=await call();assert.equal(r.status,200);assert.equal(r.synced,'owner@example.com');assert.equal(r.body.email,r.synced)});
test('returns retryable error after database failure',async()=>assert.equal((await call({fail:true})).status,500));
