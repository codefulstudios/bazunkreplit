import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCommercialSeller, parseSellerClassification, validateReviewDecision } from './sellerClassification.js';

describe('seller classification policy', () => {
 it('charges business classification to sole traders', () => { assert.equal(isCommercialSeller('sole_trader'),true); assert.equal(isCommercialSeller('business'),true); assert.equal(isCommercialSeller('private'),false); });
 it('rejects invalid account types', () => { assert.throws(() => parseSellerClassification('private_business')); });
 it('requires human review rationale for changes', () => { assert.throws(() => validateReviewDecision({sellerEmail:'seller@example.com',reviewer:'admin',reason:'short',oldType:'private',newType:'business'})); });
});
