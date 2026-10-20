import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=p=>readFileSync(p,"utf8");
test("Icon appearance editor is available under Design Center assets",()=>{
 const d=read("artifacts/sellbuydeal/src/pages/admin/AdminDesignSystemPage.tsx");
 assert.match(d,/<IconAppearanceEditor/);
 const editor=read("artifacts/sellbuydeal/src/pages/admin/IconAppearanceEditor.tsx");
 for(const x of ["Homepage categories","Homepage promotion cards","Save Icon Appearance","Restore Original","Icon size","Icon colour"])assert.ok(editor.includes(x));
});
test("Category and promo styles are opt-in and scoped",()=>{
 const css=read("artifacts/sellbuydeal/src/design-system/protected.css");
 const hero=read("artifacts/sellbuydeal/src/components/Hero.tsx");
 const promo=read("artifacts/sellbuydeal/src/components/HomepagePromoCards.tsx");
 assert.match(hero,/data-design-icons/);assert.match(promo,/data-design-icons/);
 assert.match(css,/bz-design-home-categories\[data-design-icons="true"\]/);
 assert.match(css,/bz-design-home-promos\[data-design-icons="true"\]/);
});
test("API does not accept arbitrary icon styling",()=>{
 const s=read("artifacts/api-server/src/routes/admin.ts");
 assert.match(s,/design_icon_style_\(categories\|promos\)/);
 assert.match(s,/Icon design failed accessibility validation/);
});
