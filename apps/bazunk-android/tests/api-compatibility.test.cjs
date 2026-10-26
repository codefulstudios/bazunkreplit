const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file){const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);return module.exports;}
const api=load('src/api.ts');const commerce=load('src/commerce.ts');
const listing={id:470,publicId:'BZK-EBY-UK-20261025-152230-027',title:'Duvet',category:'home',price:'12'};
test('numeric saved links resolve through the public ID before fetching details',async()=>{const calls=[];global.fetch=async url=>{calls.push(url);return {ok:true,text:async()=>JSON.stringify(calls.length===1?[listing]:listing)}};assert.equal((await api.loadListing('470')).id,470);assert.match(calls[0],/\/listings\?ids=470$/);assert.ok(calls[1].endsWith('/listings/'+listing.publicId));});
test('public links fetch details directly',async()=>{global.fetch=async url=>{assert.ok(url.endsWith('/listings/'+listing.publicId));return {ok:true,text:async()=>JSON.stringify(listing)}};assert.equal((await api.loadListing(listing.publicId)).id,470);});
test('removed listings produce a clear message',async()=>{global.fetch=async()=>({ok:true,text:async()=>JSON.stringify([])});await assert.rejects(api.loadListing('470'),/no longer available/);});
test('account connects to deployed profile route using bearer authentication',async()=>{global.fetch=async(url,options)=>{assert.ok(url.endsWith('/listings/profile/me'));assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer test');return {ok:true,json:async()=>({email:'buyer@example.com',name:null,username:null})}};assert.deepEqual(await api.loadAccount('test'),{email:'buyer@example.com',name:'',username:null});});
test('fee breakdown includes validated bundle discounts',()=>{const q={currency:'GBP',subtotal:20,bundleDiscount:2,buyerProtectionFee:1,delivery:3,total:22,items:[{id:470,title:'Duvet',price:20}]};assert.equal(commerce.parseQuote(q).total,22);assert.throws(()=>commerce.parseQuote({...q,bundleDiscount:-2}));assert.throws(()=>commerce.parseQuote({...q,total:99}));});
