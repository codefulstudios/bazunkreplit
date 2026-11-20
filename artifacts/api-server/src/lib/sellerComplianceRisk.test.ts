import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSellerRisk } from './sellerComplianceRisk.js';

const baseline = {activeListings:0,listingsCreated30d:0,completedSales30d:0,identicalNewStockMax:0,replenishedSkuCount90d:0,importedListings30d:0,commercialDescriptionMatches:0,personalCollectionEvidence:false};

describe('seller compliance scoring', () => {
 it('leaves ordinary sellers in normal monitoring', () => { assert.equal(scoreSellerRisk(baseline).band,'normal'); });
 it('does not automatically flag house clearances as businesses', () => { assert.equal(scoreSellerRisk({...baseline,listingsCreated30d:40,personalCollectionEvidence:true}).score,5); });
 it('flags multiple commercial signals for review', () => { assert.equal(scoreSellerRisk({...baseline,identicalNewStockMax:10,replenishedSkuCount90d:3,importedListings30d:50}).band,'review'); });
 it('caps score at 100', () => { assert.equal(scoreSellerRisk({...baseline,listingsCreated30d:50,completedSales30d:50,identicalNewStockMax:10,replenishedSkuCount90d:3,importedListings30d:50,commercialDescriptionMatches:5}).score,100); });
});
