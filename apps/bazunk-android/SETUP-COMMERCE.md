# Android commerce and seller tools — 7 October 2026

This is milestone 15, a source patch over all fourteen earlier Android updates. Extract at the repository root, preserving paths. It includes API and website changes as well as Android code. Deploy the API and website together; rebuild Android because RevenueCat adds a native dependency. This package does not contain an APK or AAB and does not configure external accounts.

## Included

- Auction-winner and flash-sale checkout with server-priced fees, saved Stripe checkout, resume/cancel and server-confirmed orders. Existing orders/admin delivery and dispute tools see the resulting orders.
- Credit wallet, recent activity and Google Play credit-pack purchasing through RevenueCat. Webhook confirmation awards credits; app responses never award credits directly. Purchases and refunds are idempotent, with actual purchase amount/currency recorded separately from credits.
- Supported listing promotions: choose an owned active listing, see admin-configured cost/duration, confirm purchase, view active promotions and stop one early. Stops do not automatically refund credits. Credit spending, promotion creation and ledger entry commit together. The website promotion purchase also now uses one transaction and verified ownership.
- Seller verification status and Didit verification launch in the system browser, with refresh on return.
- Free one-time entry of your own eBay items, and personal-key Amazon/eBay search and import. AliExpress imports by product ID into a draft. Free eBay has no monthly quota in this implementation.
- Live session publishing/ending, featured-product navigation and Bazunk chat. Video opens a YouTube/Twitch link in the provider app/browser. Native camera broadcasting and an embedded video player are not included.

## API deployment and schema

Keep existing Clerk, Stripe, database and marketplace configuration. All earlier native migrations/startup schema must already be present. Two new tables are created lazily: `special_checkouts` and `play_credit_purchases`; the former has a unique active reservation index. `backend/combined-commerce.sql` provides optional pre-provisioning of those objects. Existing credit ledger, inventory, promotion, verification and live tables remain required. No SQL was run against your live database.

The service needs permission to create its existing runtime schema objects. Review database backups and restore procedure before rollout. This patch does not migrate the legacy credit unit: internally one stored unit still represents 100 visible credits, matching the existing wallet and promotion economy. Do not multiply or rescale persisted balances when applying this patch.

### Auction and flash checkout

Set server `MOBILE_API_BASE_URL` to the public HTTPS API prefix, for example `https://bazunk.com/api`. Configure the existing Stripe integration and signed webhook handling for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`. Only after test-mode checks succeed, set `SPECIAL_CHECKOUT_ENABLED=true`; the respective auctions/flash-sales feature flags must also be enabled. New checkout starts are disabled by default. Existing payment status checks/cancellations remain available.

An auction can be paid only by its recorded winner after it ends and its reserve is met. Each flash-sale record supports **one item sold once**, because the existing flash-sale schema has no stock quantity. A checkout reserves that source until Stripe confirms payment or expiration/cancellation. Multi-unit flash inventory is not implemented. A paid flash sale is marked ended. These source records are distinct from ordinary listing inventory; do not advertise the same single item in both flows without managing availability.

Fees use server-side settings: private seller Buyer Protection defaults to 5% + £0.70; business selling fee defaults to 8%, subject to category configuration. This checkout is GBP only and follows the existing delivery rule (£3.99 below £50, otherwise £0). Credits cannot pay items, protection, delivery or business fees. Changing these policies later requires shared fee configuration/code review.

Server-confirmed payments create an ordinary order with the frozen fee and shipping-address snapshot. This update does not add automatic seller payout/Stripe Connect transfers, new order emails, reward milestones or referral awards for these two checkout types. Use existing order administration to fulfil orders. Interrupted attempts older than the safe Stripe idempotency window require support reconciliation rather than a new automatic charge. Webhook delivery/retry monitoring is required to release expired reservations and recover delayed order creation.

### Google Play credit packs

1. In your Google Play and RevenueCat accounts, connect this Android application's actual package and credentials, configure consumable one-time credit products and place them in the current RevenueCat offering. Product IDs must match exactly.
2. Set API `PLAY_CREDIT_PRODUCTS` to a JSON object mapping Play product IDs to visible credit quantities, for example `{"bazunk_100":100,"bazunk_500":500}`. These examples do not establish prices. The UI displays the actual localized Google Play price. Do not change the quantity of a sold product ID: create a new product ID for a new pack, and retain old mappings to reconcile old purchases/refunds.
3. Set a strong server-only `REVENUECAT_WEBHOOK_AUTH`. Configure RevenueCat to send that exact value in the Authorization header to `https://YOUR-API/api/billing/revenuecat` (adjust the prefix to your deployment). Subscribe to non-renewing purchases and cancellations/refunds. Keep this secret out of Android and source control.
4. Set Android `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` to the public Android SDK key, and rebuild the app. Authentication uses the Clerk user ID as the RevenueCat app user ID. Purchases require a verified primary email and an existing Bazunk account.
5. Use a separate test backend/database with `PLAY_ALLOW_SANDBOX=true` for license testing. Never turn sandbox awards on for a production wallet. Leave it absent/false in production.
6. After verifying the full Play-to-webhook-to-wallet path, enable API `PLAY_CREDITS_ENABLED=true`. Keep it false during setup. The webhook remains capable of processing outstanding purchases/refunds even when new purchases are disabled.

No Stripe credit-purchase link is added to Android. An SDK success displays a pending message until the webhook updates the server balance. Refunds reverse awarded credits once; if those credits were spent, the wallet may become negative and cannot fund a new promotion. Keep a support process for delayed webhooks, account/email changes and refunded purchases. Provider transaction IDs are retained for reconciliation. Play fees/taxes/RevenueCat costs are not calculated as net revenue by this patch; ledger cash is the reported customer payment amount.

Install Android dependencies with `npm ci` from `apps/bazunk-android`. Use a fresh development build for native testing and a signed production AAB on Play's internal test track for real billing tests. Expo Go/JavaScript export cannot validate real purchases. Existing EAS preview/development/production profiles remain available; account/project/signing setup is still required.

## Verification, importers and live selling

Verification reuses existing `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, workflow configuration and signed webhook route. Confirm `PUBLIC_BASE_URL` and `PUBLIC_API_URL` point at the intended deployments. Complete verification in Didit's browser flow, return to the app and refresh. Pending sessions disable another app submission; if the original browser session was lost, use support. This update does not persist a resume link or introduce native document capture.

Importers use the existing encrypted personal RapidAPI keys. Set and preserve `RAPIDAPI_USER_KEY_ENCRYPTION_SECRET` securely; changing it without migrating existing keys makes them unreadable. Users must subscribe to the matching Real-Time Amazon Data, Real-Time eBay Data and AliExpress DataHub products used by the existing adapters. Allowances/pricing depend on the provider subscription; no fixed free allowance is promised. Existing authorized Bazunk admin accounts retain the server-key behavior; ordinary sellers use their own key. No live provider requests were tested.

Free eBay is manual entry of the seller's own item details, one item at a time, without scraping, search or automatic synchronization. The form offers a condition selector (used by default) and an optional HTTPS ebayimg.com photo URL. Sellers can edit further photos and details in My Listings. Quantity now also populates listing inventory. RapidAPI imports follow existing adapter behavior; the new AliExpress flow is a one-time draft and does not synchronize stock or prices. Sellers must have the right to list the products and reuse supplied content.

Live selling requires the existing `live` feature flag and live tables. Start video on YouTube/Twitch first, then publish the link and an owned active product in Bazunk. The API supports up to ten product IDs; the current native picker selects one. Chat refresh is manual; no push, presence, realtime subscription, camera broadcast or viewer metrics are introduced. Only the owner can edit/end their session.

Native promotions cover the thirteen listing visibility/badge placements exposed in the new catalog. Scheduling, follower notifications, advanced analytics, social-share tools, video additions and auction add-ons remain in their existing website flows.

## Release checks still required

On a signed Android test build and staging database, exercise small screens, keyboard/scrolling, accessibility, back navigation, sign-out/account switches, expired sessions and offline retries. Test Stripe completion/cancel/expiration, webhook retries and failed order writes; auction eligibility and simultaneous flash buyers; Play purchase/refund including spent credits; promotion ownership and charge rollback; Didit completion; each provider key/import; live publishing/product links/chat/end. Confirm records appear correctly in web admin. Review privacy disclosures/Data Safety for RevenueCat and external verification/import/video services before store submission.

Source checks and mocked tests do not replace these device/provider tests. No external account, live payment, verification case, stream, deployment or store submission was created during this work.
