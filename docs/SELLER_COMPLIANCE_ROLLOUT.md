# Seller Compliance rollout — implementation checklist

Status: risk-scoring library committed; NOT YET connected to database, UI, checkout or importer endpoints.

## Required integration
1. Add migration: seller_compliance_cases, seller_compliance_events (append-only), seller_declarations, seller_business_details, seller_compliance_appeals. Index seller_id, status, created_at. Restrict evidence access to admins.
2. Derive risk signals server-side from actual listings, sales, SKU restock history and importer events. Run asynchronously after listing/import/sale and on a daily batch; keep thresholds configurable and record rule version.
3. Add seller onboarding declaration and sole-trader/business details. Save declaration timestamp and terms version. Show accurate seller classification on listing/store/checkout.
4. Admin Seller Compliance queue: signals, score breakdown, evidence, history, request-info, review, reclassify, restrict new listings, appeal, reinstate. Require admin reason and audit every decision.
5. Import endpoints: trigger scoring after imports and consider a review gate for unusually large batches. Do not categorically ban private users from importing their own items.
6. Checkout: determine seller classification from trusted server DB only, freeze rate and classification on each order; do not rely on request-body sellerType. Confirm 8% business fee configuration and that sole traders count as traders. Never retroactively debit without an appropriate contractual/legal basis.
7. Add notifications/email templates for declaration, review, info requested, outcome, appeal, restrictions. Avoid disclosing sensitive fraud signals.
8. Test: private clear-out >20 items, business with <20 sales, stock duplicates, imported personal listings, checkout classification tampering, pending review, concurrent reclassification/checkout, mixed-seller carts, appeals, and fee snapshot correctness.
9. Have jurisdiction-specific disclosures and compliance language reviewed for UK/EU/US before enabling enforcement.

## Policy
Scores are risk signals, not a legal finding. No automated reclassification, retrospective fees, or irreversible penalties solely on the score. Preserve legitimate private selling and provide a clear appeal route.
