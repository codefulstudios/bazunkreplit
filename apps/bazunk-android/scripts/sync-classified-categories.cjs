const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),esbuild=createRequire(path.join(root,'artifacts/api-server/package.json'))('esbuild');
const code=esbuild.transformSync(fs.readFileSync(path.join(root,'artifacts/sellbuydeal/src/data/classifieds.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
const result={exports:{}};new Function('module','exports',code)(result,result.exports);
const categories=result.exports.CLASSIFIED_CATEGORIES.map(({slug,label,color,subcategories})=>({slug,name:label,color,subcategories}));
fs.writeFileSync(path.join(root,'artifacts/api-server/src/lib/classifiedCategories.ts'),'// Snapshot of website classifieds taxonomy. Catalog equality is tested.\nexport const CLASSIFIED_CATEGORIES = '+JSON.stringify(categories,null,2)+';\n');
console.log('Updated classifieds taxonomy snapshot.');
