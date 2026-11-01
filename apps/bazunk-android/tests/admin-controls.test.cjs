const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
function load(file){const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);return module.exports;}
const policy=load('src/admin-policy.ts'),home=load('src/homepage-sections.ts');
test('feature controls cover detail, creation and saved-link routes',()=>{
 for(const [path,key] of [['/sell','quick_sell'],['/auction?id=4','auctions'],['/auction-create','auctions'],['/conversation','messaging'],['/game','games'],['/saved','watchers'],['/case-detail','disputes_returns']]){
  assert.equal(policy.routeFeature(path),key);
  assert.equal(policy.allowedRoute({['feature_'+key]:'false'},path),false);
  assert.equal(policy.allowedRoute({},path),true);
 }
 assert.equal(policy.allowedRoute(null,'/'),false);
 assert.equal(policy.allowedRoute({maintenance_mode:'true'},'/account'),false);
});
test('published homepage order and disabled sections survive parsing',()=>{
 const rows=home.DEFAULT_HOME_SECTIONS.map(x=>({...x})).reverse();rows[0].enabled=false;
 assert.deepEqual(home.parseHomeSections(JSON.stringify(rows)),rows);
 assert.deepEqual(home.parseHomeSections('broken'),home.DEFAULT_HOME_SECTIONS);
});
test('published content is applied without mutating defaults',()=>{
 const parsed=home.parseSectionContent(JSON.stringify({rewards:{title:'New rewards'}}));
 assert.equal(parsed.rewards.title,'New rewards');
 assert.notEqual(home.SECTION_CONTENT_DEFAULTS.rewards.title,'New rewards');
});
test('settings and links reject malformed or unsafe values',()=>{
 assert.throws(()=>policy.parsePublicSettings({feature_games:false}));
 assert.equal(policy.safeWebsitePath('//external.test'),'/');
 assert.equal(policy.safeWebsitePath('javascript:alert(1)'),'/');
 assert.equal(policy.safeWebsitePath('/rewards?tab=games'),'/rewards?tab=games');
 assert.equal(policy.publicMedia('http://insecure.test/logo'),undefined);
});

