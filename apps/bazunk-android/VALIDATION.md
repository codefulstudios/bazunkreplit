# Commerce and seller tools validation — 7 October 2026

218 mocked tests passed: 197 existing checks and 21 new checks in `scripts/combined-commerce.test.cjs`.

New coverage includes auction winner/reserve/timing/self-purchase restrictions; flash availability and competing buyers; server fee totals; checkout concurrency, paid amount/identity validation, repeated callbacks and rollback after a failed order insert; Stripe-confirmed cancellation; safe streaming hosts; malformed wallet/promotion data and SKU configuration; RevenueCat webhook authentication, store/environment restrictions, concurrent replay, refund-before-purchase ordering, duplicate refunds and ledger rollback; promotion ownership, insufficient funds, retry deduplication, and atomic charge/promotion rollback for native and website purchases.

These tests use mocked providers and an in-memory transaction harness. They do not prove real PostgreSQL locking, provider connectivity, Play billing, device rendering or production webhook delivery.

Passed:

- Native Expo lint and TypeScript.
- Android Metro/Hermes JavaScript export (6.4 MB bundle). This is not an APK/AAB.
- Website TypeScript and Vite production build.
- API production bundle build.

The website retains existing large-chunk and UI sourcemap warnings. Full API TypeScript still fails in existing `clerkProxyMiddleware.ts` (missing `http-proxy-middleware` types and implicit parameters), `admin.ts`, `messages.ts`, `referrals.ts`, `stripe.ts` and `watchers.ts`. No errors were reported in this patch's changed/new files. This is not a claim of a clean repository-wide type check.

RevenueCat `react-native-purchases` 10.11.0 was installed through Expo's offline installer after the online compatibility lookup timed out; package.json and package-lock.json are included. TypeScript and Android JavaScript export succeed, but native compatibility still requires a signed development/store build. No Gradle build, APK/AAB, emulator, physical-device test, external purchase, live provider import, verification case, stream, live database migration, deployment or store submission was performed.

`SETUP-COMMERCE.md` records activation requirements and remaining scope: one sold item per flash-sale record; provider-hosted video rather than native camera broadcast; manual one-item free eBay import; supported placement/badge promotions; no added automatic payouts/order emails/reward dispatch for special checkouts. Payment starts and credit-pack purchases default to disabled pending configuration. Apply this source patch over all fourteen previous Android milestones, deploy API and website together, then rebuild Android and perform the documented staging/device checks.

## Milestone 16 usability patch — 7 October 2026

Native lint, TypeScript and Android Metro/Hermes export passed after the importer, checkout-button and live-session UI changes. This patch adds no backend, dependencies or database changes. Existing server validation remains authoritative. No new mocked tests were added for these small presentation changes, and the previous milestone's 218-test result above is historical, not a new run. Device interaction and a signed APK/AAB build were not performed. Apply after milestone 15 and verify category filtering, condition/photo import, owner/buyer sale controls and the end-stream confirmation on a device.
