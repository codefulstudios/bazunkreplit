/** Server-side seller type policy. Never use client-supplied type to calculate fees. */
export type SellerClassification = 'private' | 'sole_trader' | 'business';
export const DECLARATION_VERSION = '2026-10-11-v1';
export function parseSellerClassification(value: unknown): SellerClassification {
 if (value === 'private' || value === 'sole_trader' || value === 'business') return value;
 throw new Error('Invalid seller classification');
}
export function isCommercialSeller(type: SellerClassification): boolean {
 return type === 'business' || type === 'sole_trader';
}
export function validateReviewDecision(input: {sellerEmail:string;reviewer:string;reason:string;oldType:SellerClassification;newType:SellerClassification}): void {
 if (!input.sellerEmail.trim() || !input.reviewer.trim()) throw new Error('Seller and reviewer required');
 if (input.reason.trim().length < 20) throw new Error('Document a substantive reason');
 if (input.oldType === input.newType) throw new Error('Seller type unchanged');
}
