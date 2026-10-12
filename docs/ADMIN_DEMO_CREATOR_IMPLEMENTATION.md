# Bazunk Demo Creator — implementation contract

This feature is **not** a way to manufacture authentic buyer reputation. Demo reviews, orders and seller metrics must be excluded from real reputation, accounting, payments and public verified-purchase claims.

## Admin experience
- Admin-only Demo Creator page with account selector, UK/US region selector and separate sections for listings, review fixtures, order fixtures and seller-metric previews.
- Create listing from manual fields, validated product URL preview, or generated sample fields. Assign seller account explicitly.
- Master visibility switch and individual listing/review/sales switches. Switching off must preserve records.
- Search, filter, select, delete individually, bulk delete, and delete by account. Destructive actions require confirmation and audit logging.
- Admin-only previews must identify simulated ratings, purchases, successful sales and repeat buyers.

## Backend data model
- Use a dedicated demo_listing_registry with listing_id unique FK, creator, seller account, region, source URL, enabled flag, created_at and deleted_at.
- Demo review/order/metric fixtures must be stored separately from real reviews and orders.
- Enforce region constraints and seller-account existence; admin authorization on every mutation.
- Use transactions for create/delete and idempotent cleanup. Validate URLs against SSRF and unsafe image-source risks.

## Public browsing and checkout
- Product cards use standard listing design without a prominent demo badge.
- Add-to-cart and quantity management behave normally.
- Clearly disclose unavailability before taking payment. Demo items are never purchasable.
- All server-side checkout entry points (including auction/flash sale variants) reject demo IDs, even when the master switch is off.
- Mixed carts must be blocked with actionable item IDs; real-only carts work normally.
- No Stripe sessions, orders, payouts, credits, shipping labels, or notifications for demo items.
- Do not surface fabricated reviews or successful-sale counts as authentic seller activity.

## Acceptance tests
- Admin and non-admin permissions.
- Listing create/preview/assign, UK/US visibility, toggles and bulk deletion.
- Demo-only cart, mixed cart, genuine cart, direct API checkout bypass attempts.
- Reputation and revenue isolation, removal/restore, audit records.
