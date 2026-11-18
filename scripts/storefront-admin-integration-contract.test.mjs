import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const root="artifacts/sellbuydeal/src/";
test("Design Center advertising editor opens the persisted settings panel",()=>{
 const design=read(root+"pages/admin/AdminDesignSystemPage.tsx");
 const settings=read(root+"pages/admin/AdminSettingsPage.tsx");
 assert.match(design,/key:"advertising",label:"Advertising"/);
 assert.match(design,/<AdminSettingsPage key=\{designTab\} embedded initialTab=\{designTab\}/);
 assert.match(settings,/id: "advertising", label: "Advertising"/);
 assert.match(settings,/tab === "advertising"/);
 assert.match(settings,/async function save\(\)/);
});
test("Published footer copy does not depend on Theme Studio activation",()=>{
 const footer=read(root+"components/Footer.tsx");
 assert.match(footer,/const footerAbout=s.footer_about\?\.trim\(\)\|\|""/);
 assert.match(footer,/data-theme-edit="footer_about"/);
});
test("Cashback customer route leads to dashboard cashback section",()=>{
 const app=read(root+"App.tsx");
 const dashboard=read(root+"pages/DashboardPage.tsx");
 assert.match(app,/<Redirect to="\/dashboard\?section=cashback"/);
 assert.match(dashboard,/id: "cashback"/);
 assert.match(dashboard,/activeSection === "cashback" && <CashbackPage embedded/);
 assert.match(dashboard,/new URLSearchParams\(window.location.search\)/);
});
test("Seller dashboard panels are not rendered twice",()=>{
 const dashboard=read(root+"pages/DashboardPage.tsx");
 assert.equal((dashboard.match(/activeSection === "seller-analytics" &&/g)||[]).length,1);
 assert.equal((dashboard.match(/activeSection === "shipping-centre" &&/g)||[]).length,1);
});

test("Storefront errors use non-blocking toast notifications",()=>{
 for(const file of ["pages/ListingPage.tsx","pages/SellerProfilePage.tsx","context/AuthContext.tsx"]){
  const source=read(root+file);
  assert.doesNotMatch(source,/window\.alert\(/);
  assert.match(source,/toast\(\{/);
 }
});
test("External live providers have accurate viewing instructions",()=>{
 const providers=read(root+"data/livestreams.ts");
 const live=read(root+"pages/LivePage.tsx");
 for(const provider of ["tiktok","instagram","facebook","zoom"])assert.match(providers,new RegExp(provider+":\\s*\\{[^\\n]*canEmbed: false, viewingNote:"));
 assert.match(live,/meta\.viewingNote/);
 assert.match(live,/target="_blank"/);
});
