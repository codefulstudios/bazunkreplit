#!/usr/bin/env node
// Read-only smoke checks. Never toggle categories or create Stripe sessions against production.
import assert from "node:assert/strict";
const base=(process.env.BAZUNK_API_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
async function get(path) {
 const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),20000);
 try {const r=await fetch(base+path,{headers:{Accept:"application/json"},signal:ctrl.signal});const body=await r.json();assert.equal(r.status,200,`${path}: HTTP ${r.status} ${JSON.stringify(body).slice(0,250)}`);return body;}finally{clearTimeout(timer);}
}
const health=await get("/api/healthz");assert.equal(health.status,"ok");
const settings=await get("/api/settings/category-visibility");assert.ok(Array.isArray(settings.hidden),"Missing hidden array");
const hidden=new Set(settings.hidden);
const routes=["/api/listings?limit=30","/api/promotions/related","/api/auctions?limit=30","/api/flash-sales?limit=30","/api/classifieds?limit=30"];
for(const path of routes){
 const data=await get(path);
 const items=Array.isArray(data)?data:Array.isArray(data.listings)?data.listings:Array.isArray(data.items)?data.items:null;
 assert.ok(items,`${path}: unknown response format`);
 for(const item of items){
  const category=String(item.category??"");
  const subcategory=String(item.subcategory??"");
  assert.ok(!hidden.has(category),`${path}: hidden category leaked: ${category}`);
  assert.ok(!hidden.has(category+"__"+subcategory),`${path}: hidden subcategory leaked: ${category}/${subcategory}`);
 }
 console.log("PASS",path,items.length,"items");
}
console.log("PASS production read-only smoke tests");
