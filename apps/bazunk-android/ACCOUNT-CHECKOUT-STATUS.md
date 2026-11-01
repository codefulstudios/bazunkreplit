# Account, cart and checkout — 31 October 2026

Implemented: native Clerk sign-in/sign-up UI, session token cache (existing), automatic auth-modal dismissal after activation, authenticated website profile loading and cart return button. Guest carts migrate from the old ID-only storage and merge atomically into account carts. Account switching isolates carts; guest items are retained if an open payment or limits prevent a merge. Quantities 1–50, removal and persistence are supported.

Checkout now persists an attempt before network submission, uses authenticated mobile checkout routes, displays server-calculated GBP totals and discounts, opens Stripe hosted checkout, and rechecks on foreground/restore. Unpaid checkout can resume or cancel. Cart is cleared only after payment and all order rows are confirmed. Standard delivery only; GB/US delivery address collected by Stripe. Existing website fee rules apply; express/collection and native variation selection remain unavailable.

Backend dependency: the companion mobileCheckout.ts router, route registration and fulfillment delivery-address patch must be deployed before app checkout works. Do not deploy the recovered Android branch as the website backend: backend changes are based on current main and supplied in a separate PR.

Validation: mobile typecheck, lint and unit/contract tests; backend mocked-route tests for auth, stale prices, duplicate requests, lost responses, ownership, paid-order confirmation and cancellation. These are not live Clerk/Stripe/device tests.

Still required before claiming end-to-end completion: deploy/review backend changes, verify Stripe webhook configuration and signed Clerk requests against that deployment, use a Stripe test-mode environment for paid/declined/cancelled/interrupted flows, build signed APK, test Google/email registration and sign-in, sign-out/relaunch and account switching on Android, verify existing website profile and cart restoration, and confirm delivery details in seller orders. No live payment or account registration was performed.

## Follow-up — 1 November 2026

Checkout recovery no longer requires a fresh catalogue quote. It fetches the owned payment first and can recover frozen Stripe creation without resubmitting cart prices. Recovery-only calls cannot create a new attempt. Current quotes are not shown as if they were the pending checkout's frozen total.

The seller inventory response now includes quantity, delivery price, carrier and third-level category. The app loads and edits these fields, sends only changed fulfillment fields, preserves unavailable fields on older servers, and can explicitly clear a known third-level category. Shared input validation rejects fractional/invalid stock and invalid delivery charges.

Checks: Android typecheck and lint passed; 42 tests in tests/ passed; nine mocked checkout backend tests passed. The broader legacy scripts run has 15 files unable to start because the recovered backend esbuild dependency is absent. No full backend typecheck or live payment validation was completed. Browser inspection found no signed-in Bazunk account. Real-account create/edit/photo/archive tests remain blocked on sign-in and deployment; native camera/gallery require Android device testing.

Still outstanding: stock reservations across app/web checkout; additional delivery methods beyond standard; deployment and signed APK; Stripe test-mode confirmation and order creation against the database. PR112 remains draft and must not be described as production-ready.
