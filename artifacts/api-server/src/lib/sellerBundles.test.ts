import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calculateSellerBundles } from "./sellerBundles.js";
test("combines shipping once per seller and discounts eligible multiples",()=>{
  const result=calculateSellerBundles([
    {sellerEmail:"one@example.com",priceMinor:2000,quantity:2},
    {sellerEmail:"two@example.com",priceMinor:1500,quantity:1}
  ],[{sellerEmail:"one@example.com",combinedShippingMinor:399,multiItemDiscountPercent:10,minItems:2,enabled:true},
     {sellerEmail:"two@example.com",combinedShippingMinor:250,multiItemDiscountPercent:10,minItems:2,enabled:true}]);
  assert.equal(result.shippingMinor,649);
  assert.equal(result.discountMinor,400);
});
test("does not discount single items",()=>{
  assert.equal(calculateSellerBundles([{sellerEmail:"A",priceMinor:999,quantity:1}],
    [{sellerEmail:"a",combinedShippingMinor:100,multiItemDiscountPercent:20,minItems:2,enabled:true}]).discountMinor,0);
});
test("rejects negative or non-integer values",()=>{
  assert.throws(()=>calculateSellerBundles([{sellerEmail:"a",priceMinor:-1,quantity:1}],[]));
});
