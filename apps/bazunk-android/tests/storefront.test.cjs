const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/storefront.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {activeCategory,parseVisibility,sectionEnabled,featureEnabled}=mod.exports;
test('hidden and coming-soon categories stay out of discovery',()=>{const v=parseVisibility({hidden:['books'],display:{electronics:'coming_soon','video-games':'active'}});assert.equal(activeCategory(v,'books'),false);assert.equal(activeCategory(v,'electronics'),false);assert.equal(activeCategory(v,'video-games'),true)});
test('malformed visibility cannot enable categories',()=>{assert.throws(()=>parseVisibility({hidden:[],display:[]}));assert.throws(()=>parseVisibility({hidden:[],display:{books:true}}))});
test('optional promotions respect admin visibility',()=>{assert.equal(sectionEnabled({home_sections_layout:'[{"id":"promos","enabled":false}]'},'promos'),false);assert.equal(featureEnabled(null,'games'),false);assert.equal(featureEnabled({feature_games:'false'},'games'),false);assert.equal(featureEnabled({feature_games:'true'},'games'),true)});
