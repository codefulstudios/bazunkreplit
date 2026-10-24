const fs=require('node:fs'); const path=require('node:path'); const assert=require('node:assert/strict'); const test=require('node:test'); const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const esbuild=createRequire(path.join(root,'artifacts/api-server/package.json'))('esbuild');
const compiled=esbuild.buildSync({entryPoints:[path.join(root,'artifacts/api-server/src/lib/mobileListing.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const mod={exports:{}}; new Function('module','exports',compiled)(mod,mod.exports);
const validate=mod.exports.validateMobileListing;
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64');
const item={title:'Hamster cage',description:'A clean cage in good condition.',price:'20.00',category:'pet-supplies',subcategory:'',condition:'good',currency:'GBP',status:'active',image:jpeg};
test('normalizes valid listing and drops injected seller/add-on fields',()=>{const r=validate({...item,sellerEmail:'victim@example.com',premiumVideo:true});assert.equal(r.price,'20.00');assert.equal(r.sellerEmail,undefined);assert.equal(r.premiumVideo,undefined)});
test('rejects invalid prices',()=>{for(const price of ['-1','0','Infinity','1.999','100000000'])assert.throws(()=>validate({...item,price}))});
test('rejects unknown category and unrelated subcategory',()=>{assert.throws(()=>validate({...item,category:'invalid'}));assert.throws(()=>validate({...item,subcategory:'refrigerators'}))});
test('requires a photo for publishing but permits photo-less draft',()=>{assert.throws(()=>validate({...item,image:null}));assert.equal(validate({...item,status:'draft',image:null}).status,'draft')});
test('rejects local file paths, non-JPEG and oversized image',()=>{for(const image of ['file:///phone/photo.jpg','data:image/jpeg;base64,YQ==','data:image/jpeg;base64,'+'A'.repeat(1400001)])assert.throws(()=>validate({...item,image}))});
test('allows an existing owner photo but rejects arbitrary external replacements',()=>{const old='https://images.example.com/old.jpg';assert.equal(validate({...item,image:old},old).image,old);assert.throws(()=>validate({...item,image:'https://evil.example.com/replace.jpg'},old))});
test('rejects arbitrary statuses and conditions',()=>{assert.throws(()=>validate({...item,status:'sold'}));assert.throws(()=>validate({...item,condition:'invalid'}))});
test('category catalog matches website source',()=>{const header='// Snapshot of the website category catalog. Keep in sync using scripts/sync-listing-categories.cjs.\n';assert.equal(fs.readFileSync(path.join(root,'artifacts/api-server/src/lib/listingCategories.ts'),'utf8'),header+fs.readFileSync(path.join(root,'artifacts/sellbuydeal/src/data/categories.ts'),'utf8'))});
const source=fs.readFileSync(path.join(root,'artifacts/api-server/src/routes/listings.ts'),'utf8');
const raw=source.slice(source.indexOf('const mobileSeller: RequestHandler'),source.indexOf('router.get("/mobile/listings/mine"'));
const middlewareCode=esbuild.transformSync(raw,{loader:'ts',format:'cjs'}).code;
async function authCheck({signedIn=true,verified=true,banned=false}={}){
 let next=false,status=200,body;
 const middleware=new Function('getAuth','clerkClient','isBanned','storage','db','sql',middlewareCode+';return mobileSeller;')(()=>({isAuthenticated:signedIn,userId:signedIn?'u1':null}),{users:{getUser:async()=>({primaryEmailAddressId:'p1',emailAddresses:[{id:'p1',emailAddress:'Owner@Example.com',verification:{status:verified?'verified':'unverified'}}],fullName:'Owner'})}},async()=>banned,{upsertUser:async()=>({name:'Owner'})},{execute:async()=>({rows:[{username:'owner'}]})},()=>null);
 const res={locals:{},status:n=>{status=n;return {json:x=>body=x}}};
 await middleware({body:{sellerEmail:'victim@example.com'}},res,()=>next=true);return {next,status,body,seller:res.locals.mobileSeller};
}
test('seller guard rejects anonymous, unverified and suspended sessions',async()=>{assert.equal((await authCheck({signedIn:false})).status,401);assert.equal((await authCheck({verified:false})).status,403);assert.equal((await authCheck({banned:true})).status,403)});
test('seller guard derives owner identity from Clerk',async()=>{const r=await authCheck();assert.equal(r.next,true);assert.equal(r.seller.email,'owner@example.com')});
