# Account, cart and checkout — 31 October 2026

Implemented: native Clerk sign-in/sign-up UI, session token cache (existing), automatic auth-modal dismissal after activation, authenticated website profile loading and cart return button. Guest carts migrate from the old ID-only storage and merge atomically into account carts. Account switching isolates carts; guest items are retained if an open payment or limits prevent a merge. Quantities 1–50, removal and persistence are supported.

Checkout now persists an attempt before network submission, uses authenticated mobile checkout routes, displays server-calculated GBP totals and discounts, opens Stripe hosted checkout, and rechecks on foreground/restore. Unpaid checkout can resume or cancel. Cart is cleared only after payment and all order rows are confirmed. Standard delivery only; GB/US delivery address collected by Stripe. Existing website fee rules apply; express/collection and native variation selection remain unavailable.

Backend dependency: the companion mobileCheckout.ts router, route registration and fulfillment delivery-address patch must be deployed before app checkout works. Do not deploy the recovered Android branch as the website backend: backend changes are based on current main and supplied in a separate PR.

Validation: mobile typecheck, lint and unit/contract tests; backend mocked-route tests for auth, stale prices, duplicate requests, lost responses, ownership, paid-order confirmation and cancellation. These are not live Clerk/Stripe/device tests.

Still required before claiming end-to-end completion: deploy/review backend changes, verify Stripe webhook configuration and signed Clerk requests against that deployment, use a Stripe test-mode environment for paid/declined/cancelled/interrupted flows, build signed APK, test Google/email registration and sign-in, sign-out/relaunch and account switching on Android, verify existing website profile and cart restoration, and confirm delivery details in seller orders. No live payment or account registration was performed.
