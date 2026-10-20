import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=p=>readFileSync(p,"utf8");
test("Every editor has a clearly linked target",()=>{
 const a=read("artifacts/sellbuydeal/src/pages/admin/AdminDesignSystemPage.tsx");
 const b=read("artifacts/sellbuydeal/src/pages/admin/DesignSectionsEditor.tsx");
 const c=read("artifacts/sellbuydeal/src/pages/admin/IconAppearanceEditor.tsx");
 const guide=read("artifacts/sellbuydeal/src/pages/admin/DesignTargetGuide.tsx");
 assert.match(a,/DesignTargetGuide/);assert.match(b,/DesignTargetGuide/);assert.match(c,/DesignTargetGuide/);
 for(const key of ["sections","colours","branding","homepage","footer","advertising","assets"])assert.ok(guide.includes(key+":{"),key);
 assert.match(guide,/target="_blank"/);assert.match(guide,/rel="noopener noreferrer"/);
});
test("Editors explain where overlapping colour controls apply",()=>{
 const icons=read("artifacts/sellbuydeal/src/pages/admin/IconAppearanceEditor.tsx");
 const section=read("artifacts/sellbuydeal/src/pages/admin/DesignSectionsEditor.tsx");
 assert.match(icons,/override the same tile colours/);
 assert.match(section,/open Icons & Graphics/);
});
