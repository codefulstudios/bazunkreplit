import { describe, expect, it } from 'vitest';
import { isCommercialSeller, parseSellerClassification, validateReviewDecision } from './sellerClassification.js';

describe('seller classification policy', () => {
 it('charges business classification to sole traders', () => { expect(isCommercialSeller('sole_trader')).toBe(true); expect(isCommercialSeller('business')).toBe(true); expect(isCommercialSeller('private')).toBe(false); });
 it('rejects invalid account types', () => { expect(() => parseSellerClassification('private_business')).toThrow(); });
 it('requires human review rationale for changes', () => { expect(() => validateReviewDecision({sellerEmail:'seller@example.com',reviewer:'admin',reason:'short',oldType:'private',newType:'business'})).toThrow(); });
});
