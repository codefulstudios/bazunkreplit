import { describe, it, expect } from 'vitest';
import { scoreSellerRisk } from './sellerComplianceRisk.js';

const baseline = {activeListings:0,listingsCreated30d:0,completedSales30d:0,identicalNewStockMax:0,replenishedSkuCount90d:0,importedListings30d:0,commercialDescriptionMatches:0,personalCollectionEvidence:false};

describe('seller compliance scoring', () => {
 it('leaves ordinary sellers in normal monitoring', () => { expect(scoreSellerRisk(baseline).band).toBe('normal'); });
 it('does not automatically flag house clearances as businesses', () => { expect(scoreSellerRisk({...baseline,listingsCreated30d:40,personalCollectionEvidence:true}).score).toBe(5); });
 it('flags multiple commercial signals for review', () => { expect(scoreSellerRisk({...baseline,identicalNewStockMax:10,replenishedSkuCount90d:3,importedListings30d:50}).band).toBe('review'); });
 it('caps score at 100', () => { expect(scoreSellerRisk({...baseline,listingsCreated30d:50,completedSales30d:50,identicalNewStockMax:10,replenishedSkuCount90d:3,importedListings30d:50,commercialDescriptionMatches:5}).score).toBe(100); });
});
