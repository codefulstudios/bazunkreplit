import test from "node:test";
import assert from "node:assert/strict";
import {canAcceptBid,minimumBid,qualifiesForSale,mayFinalize} from "./auctionRules.js";

test("simultaneous same-value bids: only first bid satisfies updated minimum", () => {
  const base={status:"active",endTime:2000,now:1000,seller:"seller@example.com",bidder:"a@example.com",amount:12,start:10,increment:2};
  assert.equal(canAcceptBid({...base,current:10}),true);
  assert.equal(canAcceptBid({...base,current:12,bidder:"b@example.com"}),false);
  assert.equal(minimumBid(10,12,2),14);
});
test("reserve met, reserve missed and no bids", () => {
  assert.equal(qualifiesForSale(50,50),true);
  assert.equal(qualifiesForSale(49.99,50),false);
  assert.equal(qualifiesForSale(null,50),false);
  assert.equal(qualifiesForSale(1,null),true);
});
test("expiry and duplicate closeout state guard", () => {
  assert.equal(mayFinalize("active",1000,1000),true);
  assert.equal(mayFinalize("active",1001,1000),false);
  assert.equal(mayFinalize("ended",1000,2000),false);
  assert.equal(mayFinalize("cancelled",1000,2000),false);
});
test("reject seller bids and expired auction bids", () => {
  const base={status:"active",endTime:2000,now:1000,seller:"seller@example.com",bidder:"buyer@example.com",amount:10,start:10,current:null,increment:1};
  assert.equal(canAcceptBid({...base,bidder:"SELLER@example.com"}),false);
  assert.equal(canAcceptBid({...base,now:2000}),false);
  assert.equal(canAcceptBid({...base,amount:0}),false);
});
