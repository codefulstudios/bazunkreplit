# Bazunk Android — React Native + Expo

Native Android marketplace screens using the same Bazunk listings, Clerk accounts, conversations, watchers and orders as the website/admin. No marketplace WebView.

## Implemented in source

- Browse, category filtering, listing details, pagination and refresh/retry.
- Native Clerk authentication/registration, verification/profile controls and SecureStore sessions.
- Fixed-price GBP listing creation, one compressed main photo from camera/gallery, draft saving, editing, draft publishing and archiving. Archived records are kept in the database and hidden from buyers.
- My listings, saved/watched items, messaging inbox and conversation sending/reading.
- Per-account cart and pending payment session retained on the device. One unit per different listing, up to 30 listings.
- Server-calculated GBP checkout total including Buyer Protection and delivery.
- Stripe hosted checkout in an Android browser tab; server payment confirmation, cancellation of unpaid checkout, and purchases/sales with status and tracking details.
- Native seller reputation and paginated reviews from listing details; purchases/sales review creation, 30-day edits, removal, seller replies and moderation reports.
- Native order details, seller preparation/dispatch/tracking updates and buyer delivery confirmation, using shared website/admin order records.
- Authenticated returns/disputes: eligible-order selection, case details, buyer/seller dispute conversation, HTTPS evidence links, supplied labels and approved return tracking. Website forms use these same real cases.
- Native menu linking all implemented screens.
- Remaining-stock controls from My listings, live availability on listing details, and shared fixed-price stock reservations across app/web cart and accepted-deal checkout.
- Website seller stock controls and Admin → Inventory with quantity editing and Stripe-confirmed expiry recovery.
- Rewards wallet, six credit milestone claims/progress, recent earned-credit history and native arcade leaderboard.
- All six current arcade games: check-in, animated wheel, daily quiz, swipe/tap scratch card, mystery boxes and lucky number. Admin prizes, enablement and daily limits are shared with the website. Interrupted app plays are retained per account in SecureStore and can be recovered.
- Native active/ended auction browsing, detail/countdown and recent bid history, confirmed bidding, My bids/selling auctions, and basic GBP auction creation with one gallery photo and 1/3/7-day duration.

## Apply the update

Extract this changed-files ZIP into the repository on top of the previous browsing, accounts, selling, core-flows, auctions, rewards/arcade, classifieds/flash-sales offers/deals, accepted-deal checkout, shared stock, reputation/reviews, delivery-management and returns/disputes milestones, retaining paths. Only changed/new files are included. Deploy the API changes using your usual process. App source is isolated in `apps/bazunk-android` outside the website pnpm workspace.

In the app folder run `npm ci`. Rebuild the Android development app because native photo and browser dependencies have changed.

## Beginner setup

Use Node 22.13 or newer and VS Code. Copy `.env.example` to `.env` in the app folder:

- `EXPO_PUBLIC_API_URL`: the real public API URL including `/api`.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: publishable key from the SAME Clerk application as the website. Never include a Clerk secret key in the app.

In Clerk Dashboard → Native applications, enable Native API and register Android package `com.bazunk.marketplace` (confirm the package ID before publishing). Native Google login requires the Android OAuth package/signing certificate and matching Clerk credentials; website Google configuration alone does not complete it. Follow https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google.

Clerk native components are beta and need a native/development build, not Expo Go. With your own Expo account:

1. `npx eas-cli@latest build --platform android --profile development`
2. Install the development app on your phone.
3. `npx expo start --dev-client --android`

Preview profile builds an APK; production profile builds an AAB. Configure the same public environment variables for cloud builds. No APK/AAB, signing or store publication was performed by this update.

## Checkout configuration

API server settings, not app secrets:

- Existing Stripe credentials and webhook must work for the chosen test/live environment.
- `MOBILE_API_BASE_URL` must be the HTTPS API base, including `/api`, e.g. `https://bazunk.com/api`. It supplies the public payment-return URL.
- `MOBILE_CHECKOUT_ENABLED=true` and reviewed inventory setup with `STOCK_RESERVATIONS_ENABLED=true` enable app checkout. Both default off.

Payment takes place on Stripe's hosted page in the phone browser. This does not embed the Bazunk website in the app. Return to the cart and check payment status. Browser dismissal is not treated as a successful payment. Paid status requires Stripe confirmation and creation of all expected order rows. The same fulfillment pipeline/webhook creates orders visible to admin. Collected delivery addresses are stored with those orders.

The cart uses the existing fee policy: personal-seller Buyer Protection, no additional buyer protection charge on business items, and the server's existing delivery calculation. Marketplace credits cannot pay checkout or protection fees. Checkout is charged in GBP. Shared inventory/reservation handling is described below; existing tax, delivery and settlement policies are retained.

If checkout creation loses its response, check Orders before trying again. No automatic write retry is used. Shared listing reservations now protect new payment URLs across channels; test actual concurrency before enabling payments.

## Permissions and data

Mobile seller/account/checkout/orders routes use verified Clerk identity and suspension checks. Caller-supplied email cannot select another account. Saved items and conversations use existing authenticated APIs through a protected mobile alias, respecting the corresponding admin feature toggle. Purchases/sales are filtered to the signed-in member.

Phone photos are reduced to 1200 pixels on the longest edge and compressed to JPEG, up to 1 MB, using the same stored image field as website listings. Camera permission is requested only when taking a photo. Microphone permission is disabled. Editing a listing preserves its existing image unless changed.

Categories are a snapshot of the website catalog returned by the API. After website category changes run `node apps/bazunk-android/scripts/sync-listing-categories.cjs` and deploy the API. The catalog equality test detects drift.

## Checks

App: `npm run lint`, `npm run typecheck`, `npm run export:android`.

From repository root, with existing API dependencies installed:

`node --test apps/bazunk-android/scripts/backend-account.test.cjs apps/bazunk-android/scripts/backend-listing.test.cjs apps/bazunk-android/scripts/checkout.test.cjs apps/bazunk-android/scripts/mobile-access.test.cjs apps/bazunk-android/scripts/auctions.test.cjs apps/bazunk-android/scripts/rewards.test.cjs apps/bazunk-android/scripts/specials.test.cjs apps/bazunk-android/scripts/offers.test.cjs apps/bazunk-android/scripts/deal-payments.test.cjs apps/bazunk-android/scripts/inventory.test.cjs apps/bazunk-android/scripts/reviews.test.cjs apps/bazunk-android/scripts/order-management.test.cjs`

Tests mock Clerk, Stripe and database access. They do not prove live integrations or native device operation. The whole backend TypeScript check still reports errors in other sections; the API bundle builds.

Device acceptance: account switching; session restoration; draft editing/publishing/archiving and admin sync; photo permission denial/cancellation; saved state; conversation membership, sending and refresh; cart fee changes and unavailable items; successful/declined/3DS payments; browser cancellation; app restart with pending checkout; paid confirmation and webhook race/retry; order delivery address and tracking. Test Stripe in test mode before enabling live app checkout.

## Still to build

Winning-auction payment checkout and paid reserve/extension setup, flash-sale checkout/reservations, credits/promotions, live streaming, importers, seller verification, push notifications and store-release polish. Messages currently refresh on screen focus or by the Refresh button; no push or realtime socket subscription is added. Browse title search still filters loaded listings rather than the whole marketplace. This source update is not the complete Bazunk app.

## Auction milestone

Requires the existing auctions feature toggle and auction/bid schema, including `extend_enabled`. No database migration or new dependency is introduced. Basic app creation sets no reserve and no automatic extension; auctions created on the website with those features are respected when bidding. App auction prices and bids use GBP. Categories match the shared site catalog.

Website and app bids now share a PostgreSQL transaction with an auction-row lock. The minimum bid and server closing time are checked after obtaining the lock, and bid insertion, winner update and optional extension commit together. Website bid submission now sends the Clerk bearer token and handles connection errors. Verified primary email and suspension checks apply to both bidding entry points. Native responses omit member email addresses and the hidden reserve amount. Older website creation/cancellation endpoints are unchanged and are not a complete auction security audit.

Refresh to see other bidders or a changed ending time; this app milestone does not subscribe to live bid updates. Opening an expired auction settles it under the same lock and sends the existing winner/reserve notifications once in a successful process; notification delivery is best effort, with no durable retry added. Settlement remains driven by reading auction detail, rather than a new background scheduler. A timer alone is not the authoritative result. Winning-auction payment is not part of the fixed-price cart.

Device acceptance must include verified/unverified/suspended login; own-item bid rejection; competing website/app bids; currency conversion; expired and extended auctions; hidden reserve; interrupted creation/bid response; My bids ownership; photo selection; and website/admin visibility. No live auction or real bid was created during source validation.

## Rewards and arcade milestone

Open Menu → Rewards and milestones or Games arcade. Sign in with a verified Clerk account. If no marketplace user record exists, open Account to complete account setup before claiming rewards. This update uses the existing users, user_milestones, reward_games and reward_plays records; credits awarded in the app are the same wallet used by the website/admin. Both credits and games admin feature switches apply. Rewards views show retryable failures rather than treating a failed load as an empty wallet.

The existing reward model uses 100 arcade/promotion credits per £1 of wallet promotion value; internally a 10-credit game prize adds 0.10 to users.credits and to the economy ledger. Native responses normalize that to 10 displayed credits, matching the website's rewards screens. This update does not migrate stored units or change the admin balance display. These credits are not cash and cannot pay for items, Buyer Protection or business final selling fees. Native buying/spending of promotion credits remains to build; use the website dashboard for eligible promotions.

Shared website and app game claims now lock the user's wallet row, read the server time and daily/weekly totals, determine the server-drawn result, apply the remaining weekly cap, and commit the actual play amount, wallet change and economy ledger together. The old handler counted the new prize before checking the cap, which could under-credit or reject a prize while recording it as earned. New writes fix this; historical balances/plays are not retroactively adjusted. The arcade cap stays 150 credits per week; milestone credits are separate. Daily resets occur at 00:00 UTC and weekly resets on Monday at 00:00 UTC, with local reset times displayed in the app. Quiz requests carry the server's day so an old question cannot be scored against a new day's answer.

Game requests use a replay key in the new reward_claim_requests table. The API creates it on first play, alongside the existing ledger initializer. For pre-creation, the same SQL is in backend/rewards-requests.sql. The API database role needs its existing table-creation permissions. App requests are saved before submission, isolated by Clerk user ID, and cleared only after a validated result or a definite rejection. Recover pending plays before starting another game. App reinstall/storage loss removes that local recovery reference; server daily/weekly limits still apply. Website retries reuse a request within the same game window but do not add persistent browser recovery.

Milestone claims now use verified identity and a transaction so the same completed record cannot pay twice. The native screen exposes the six existing automatic credit rewards, not unimplemented fee waivers/exposure benefits. Milestone progress and completion rules are inherited, including sticky completion and existing monthly/streak behavior. New monthly resets, streak tracking, referral rewards and non-credit benefits are not introduced. Existing non-credit claims now report that they have no automatic credit reward instead of marking a benefit delivered without fulfilling it.

Recent earned history shows existing economy ledger entries; older unrecorded milestone grants are not reconstructed. Native leaderboard responses include display handles and points, not account email addresses. Refresh views after another device makes changes; no realtime/push subscription is added.

Device acceptance: all six games; quiz right/wrong and midnight rollover; scratch swiping and accessible reveal; gallery-independent gameplay; disabled games and credits feature switches; admin prize/limit changes; daily exhaustion and the final partial weekly prize; simultaneous website/app plays; double taps; network interruption and recovery after restart; account switching; milestone double claim; reward/history/admin balance agreement. No live reward, game play or wallet change was made during source validation.

## Classifieds and flash sales milestone

Menu now includes native Classifieds, Flash sales and My ads and sales. Classifieds support server search, category/type filters, paging, optional camera/gallery photo, creation, owner editing, 7/30/90-day renewal and removal. Public contact options are phone, HTTPS website and optionally your verified email. Review what you publish; these contact-only ads do not use Bazunk checkout or Buyer Protection.

Flash sales support live/upcoming/ended browsing, category/type filters, server-time countdowns, photo/GBP creation, scheduling and owner cancellation. Registering interest requires explicit consent to share your verified email with the seller. Requests are actually stored; sellers and admin can review the most recent 100 interested members. The website's previous simulated success button now uses this same protected endpoint. Interest is not a purchase, stock reservation or guaranteed deal. No automatic email or marketplace-message notification is added; sellers review the interest list. Flash-sale checkout and fulfillment remain to build.

Classified categories match the website classifieds catalog, separate from marketplace categories. Run `node apps/bazunk-android/scripts/sync-classified-categories.cjs` after catalog changes. Flash-sale categories match the existing website creation options.

The API adds nullable private `classified_ads.owner_email` and `flash_sale_interests`, during startup or on first relevant request. Optional pre-creation SQL is in `backend/classifieds-flash-sales.sql`. The API database role needs schema-change permissions. Old classifieds have no trusted owner record and are not automatically assigned using their public contact email; they require verified admin ownership assignment before native editing. No assignment UI is introduced. New website and app ads use verified Clerk ownership. Public responses omit private ownership and flash seller email; shared contact information and interest records are limited to the selected public contacts or the seller/admin respectively.

Device acceptance: feature switches, owner/non-owner access, public-contact consent, phone/email/website opening, denied photo permissions, edit/renew/remove and expired ad hiding, scheduled sale timezone/countdown, cancellation, duplicate interest and interrupted requests, seller/admin visibility and account switching. If creation loses its response, check My ads and sales before creating again. No live ad, sale or interest was created during validation.

## Offers and deals milestone

Open a GBP listing → Make an offer, or Menu → Offers and deals. Buyers can send a price/message, withdraw pending or accepted unpaid offers, and accept or decline a seller counter. Sellers can accept, decline or counter pending offers. Views have separate Buying/Selling pages with 25 records per page, refresh and retry states. Initial pending offers expire after 48 hours; a counter starts a new 48-hour response period, using the server clock. Expiry is derived on read and enforced at response time; there is no expiry background worker. Accepted offers are unpaid and do not reserve stock. The normal cart still charges the listing price. Use deal checkout to pay an accepted price. Checkout now reserves shared listing inventory; automatic negotiation alerts remain to build.

Website offers were previously browser-local simulations with fabricated seller IDs. The website now uses the same authenticated server records as the app, including its message-centre offer controls. Old browser-local offers are not imported or treated as legitimate server negotiations. Admin → Offers provides a read-only paginated view, including member identities. Member APIs expose display names but omit both private email addresses. Authentication uses the verified Clerk primary email, not body/query email. The existing offers feature switch controls member APIs; admin can review records when the module is disabled.

The API creates marketplace_offers on the first offers request. Optional pre-creation SQL is in backend/offers.sql; the database role needs table/index creation permissions. Prices, seller and listing details come from the database. Responses lock the listing and then offer, verify participant role, state, response version and server expiry, and commit the response together. A duplicate submission with the same request reference/payload returns its original record; a second pending/countered/accepted offer by the same buyer on the same listing is rejected. Other buyers can negotiate independently; acceptance alone does not promise exclusive availability. Withdrawn or declined offers allow a new negotiation. Pending creation references survive retries within the screen, not app reinstall/restart; check My offers after an interrupted creation before submitting again.

No new dependency is introduced. Apply over all seven earlier milestones, preserving paths, then deploy the API and website together. No live offer, response, payment or deployment was performed during validation. Website badge counts reflect the loaded offers page and selected role, not a global notification count.

Device/browser acceptance: buyer/seller account switching and verified/suspended access; GBP versus other currencies; own-listing rejection; offer creation and cross-device visibility; seller accept/decline/counter; buyer counter response and withdrawal; expiry boundaries; simultaneous responses; unavailable listings; duplicate/interrupted submissions; feature switch; pagination and failed-load retries; admin visibility. Test the screens on Android before release.

## Accepted-deal payment milestone

Buyers can open Pay agreed price on an accepted offer or counteroffer in the native app or website. The native screen is a real React Native screen; only Stripe payment opens the phone browser. Review the agreed item price, private-seller Buyer Protection and delivery breakdown before paying. Business seller fees use the disclosed admin category/default rate and are deducted from the agreed item price. Personal sellers keep the agreed item price. Marketplace credits cannot pay for items or fees. The normal cart retains the original listing price; it does not implicitly apply an offer.

API setup: configure existing Stripe keys and signed webhook, `MOBILE_API_BASE_URL` as the public HTTPS API URL including `/api`, and `DEAL_CHECKOUT_ENABLED=true` and `STOCK_RESERVATIONS_ENABLED=true` only after test-mode/device acceptance. The deal flag is independent of `MOBILE_CHECKOUT_ENABLED`; both payment routes also require the shared inventory flag. It defaults off. The offers feature switch also prevents new deal checkouts. Existing checkouts can still be checked, resumed or cancelled when new payments are disabled. The return page links to the app and bazunk.com; use the app directly when testing with a separate development website. No credentials or secret keys are added to app source.

The API initializes nullable paid_at and checkout_locked on marketplace_offers, the existing fee snapshot table, and marketplace_offer_checkouts on first use. Optional pre-creation SQL is in backend/deal-payments.sql; apply after offers.sql. The database role needs schema permissions. This update depends on the existing unique orders(stripe_session_id,line_no) index. The API and website should be deployed together.

The server reads the accepted price and member/seller identities from the offer/listing records, calculates fees on that price and freezes the quote. Each payment attempt stores its exact Stripe creation parameters before contacting Stripe and uses a stable idempotency key. The app/web screen can recover it by offer ID from another device; no device-only checkout token is required. If a response is lost after Stripe creation, retries recover the same session. Pending attempts with no recorded Stripe session after 23 hours require support reconciliation; the server refuses to risk creating another session after Stripe's idempotency retention window. Signed expiry webhooks can attach and close these attempts. A cancelled or expired attempt must be confirmed by Stripe before its offer unlocks. Pending and paid offers cannot be withdrawn.

Payment is confirmed using Stripe's verified session, stored attempt identity, frozen amount/currency and the expected order count. Orders use the same schema, fee fields and address fields as website/admin orders. One order and the paid offer/checkout state commit in a single database transaction, with a deterministic order ID and existing session/line uniqueness. Interrupted confirmation and webhook retries cannot add another order for that session. Confirmation/seller notifications and milestone/referral updates use the existing best-effort behavior; no durable notification retry is introduced. Reserved ordinary carts now use the atomic stock/order fulfillment described below; legacy sessions retain their previous handler.

Fixed-price carts and accepted deals now use shared listing inventory as described below. Existing payment sessions without the new reservation policy are not retrospectively protected. Admin can review payment state under Offers and the actual agreed-price order under Orders.

Device/Stripe test acceptance: private/business fees and admin rate changes; accepted counter price; account ownership and switching; unavailable listing; 3DS, declined card and browser dismissal; lost creation response and retry on another device; app restart; paid/processing status; signed webhook versus screen confirmation; duplicate webhook; expired/unpaid cancellation; disabled settings while a session is open; order price/net/address/admin agreement; and cross-channel availability. No live charge, order or deployment was made during validation. Winning-auction and flash-sale checkout remain to build.

## Shared listing stock milestone

My listings → Manage stock replaces a listing's remaining unsold quantity (0–10,000). Remaining stock includes units held by unpaid checkouts. Setting zero marks an active listing sold; positive stock reactivates a sold listing. Draft and archived statuses remain as they are. Sellers can only access their own private inventory; admin can adjust any listing under Admin → Inventory. Live listing availability has loading/failure/retry states. App carts still support one unit per distinct listing; website cart quantities reserve the full requested amount. This is listing-level fixed-price inventory, not variant/SKU inventory or auction/flash-sale checkout.

**Deployment cutover:** apply this update over all nine preceding milestones. Deploy API and website together. New website cart payments are disabled until `STOCK_RESERVATIONS_ENABLED=true`; native cart and accepted deals additionally require their existing payment flags. This intentionally requires inventory setup before new marketplace payments resume. Credits checkout is unaffected. Before enabling, review the real remaining stock of every active fixed-price listing in Admin → Inventory and expire/reconcile older unpaid Stripe sessions without `inventoryPolicy=listing-stock-v1`. Historical orders cannot safely determine current stock using their titles. Uninitialised inventory defaults to one unit, including newly created listings; update multi-unit listings explicitly. Existing legacy sessions can still confirm through their old handler and do not reserve/deduct the new inventory. No live flags or inventory were changed during this source work.

The API creates `listing_inventory`, `stock_reservations`, `stock_reservation_items` and their index on first use. Optional SQL is in `backend/stock-reservations.sql`, after the existing listing schema. Database schema permissions and the existing unique orders(stripe_session_id,line_no) index are required. Archive listings with reservation history rather than hard-deleting them; the item foreign key preserves that history. No historical stock migration, automatic returns/refund restocking or reservation-history cleanup is introduced.

Each new marketplace Stripe session is card-only and has a requested 35-minute expiry (five minutes above Stripe's minimum to allow creation latency). After Stripe creates the session, the API locks listing IDs in ascending order, verifies frozen seller/quantity, and reserves all requested units transactionally before returning its payment URL. An insufficient-stock attempt is expired at Stripe; stock is released only after a fresh Stripe lookup confirms expiry and no paid status. Concurrent website/app/deal checkouts compete for the same held stock. Quote previews do not themselves reserve inventory. Acceptance of an offer alone does not reserve it. An interrupted ordinary-cart creation may retain a hold until Stripe expiry recovery; accepted deals retain their durable session recovery by offer ID.

Paid confirmation uses the stored fee quote and Stripe amount/currency/identity. For new reserved carts, every order row and all stock deductions commit together; accepted-deal order, stock and paid offer state likewise commit together. Replayed confirmation does not deduct stock or create orders twice. Stock reaches zero → listing sold. Failed order writes roll back stock consumption as well as orders. Notification/milestone delivery remains best effort.

Signed Stripe expiry webhooks and the app's payment status/cancel paths release confirmed expired holds. Admin → Inventory → Check expired checkout holds checks up to 20 locally overdue records against Stripe and reports released versus kept. Local time alone never frees stock. Open, paid or unverified sessions stay held for payment/support review; recovery does not itself fulfill paid orders or unlock expired offer records (the existing deal webhook/status path does that). Failed/missed payment fulfillment should be retried through its signed webhook or buyer confirmation. There is no new background reconciliation worker. A Stripe creation response lost beyond the frozen expiry/replay window can require support reconciliation; do not create a replacement until the original payment is checked.

Required live test-mode/device acceptance: actual PostgreSQL locking/rollback; competing website/app/deal purchases of the final unit; multi-unit/multi-item carts; declined card and 3DS; interrupted creation and confirmation; duplicate paid/expiry webhooks; expiry recovery with Stripe downtime; stock edits beneath held units; ownership/admin access; sold restocking and archive behavior; private/business fees; order totals, address and admin agreement. These source checks are not a production checkout approval or an APK/device test.

## Seller reputation and reviews milestone

Listing → Seller reputation and reviews shows the existing seller profile, verification badge, average stars, positive percentage after at least three reviews, sent sales, repeat buyers, median dispatch and median first reply. Reviews are paginated ten per page and include optional description/dispatch/packaging scores, seller replies and edited labels. Dispatch samples use the previous 90 days and require three records; reply median uses the existing conversation calculation. These figures describe past recorded activity, not guaranteed service. They preserve the current definition of successful sales as sent, not cancelled; returns/dispute outcome refinements remain separate work.

Orders → Review this order / view reviews supports both buyer-to-seller and seller-to-buyer reviews. Reviews are eligible once an order is shipped, out for delivery or delivered. Buyer reviews may include optional aspect scores. Authors may edit for 30 days from original creation, using database time, or remove their review; removing does not allow a replacement for the same order. A seller may publish one reply to a buyer's review. Received reviews and public seller reviews can be reported with a reason and optional details. Reports enter the existing Admin → Reviews moderation queue and do not automatically remove a review. Sign-in, verified primary email and suspension checks apply to every member review action.

App and website review writes now share a transaction service over the existing reviews/review_reports tables. Creation locks the order and verifies current eligibility and actual participants before insertion. Review edits, deletion, replies and reports lock the review; removed/deleted reviews cannot be edited, replied to or reported. Authors can still remove their own moderated reviews, ensuring admin restoration does not undo their withdrawal. Order/role and reviewer identity cannot be changed through request fields. Unique order/role and review/reporter indexes prevent duplicate reviews/reports; a second simultaneous reply is rejected. Existing website optional-score zero values remain compatible as unrated; fractional/out-of-range selected scores are rejected. API failures return structured errors before the app reports success. If a save response is interrupted, refresh the order's review state before resubmission.

The existing reviews feature switch controls the new reads/writes. Native public requests resolve the seller from a listing ID and omit participant email addresses. Native order review responses are limited to the actual buyer/seller. The older website email-based reputation endpoints remain unchanged. No schema migration, dependency, fake review data or new admin panel is introduced. Apply over all ten preceding milestones and deploy the API with this app source. Website consumers retain their existing response shapes; unverified/suspended accounts can no longer submit shared review writes.

Required live device/browser acceptance: buyer/seller/nonparticipant access; verified/suspended sessions; sent versus cancelled orders; website-created reviews visible in the app and vice versa; optional scores; interrupted create/edit/remove; exact editing deadline; simultaneous replies; public paging and private-data checks; feature toggle; report deduplication and admin removal/restoration; deleted review exclusion; account switching, retry states, keyboard and small-screen accessibility. New review notifications use the existing best-effort system messages; durable delivery and push are not added. Existing orders/reputation bootstrap tables and columns must be present. No live review, report, order or admin moderation change was made during validation.


## Native delivery management milestone

Purchases and sales → Open order details / manage delivery shows the recorded item price, your buyer total or seller proceeds, relevant fees, delivery address, carrier/tracking, estimated delivery and created/dispatched/delivered timestamps. Sellers can mark confirmed orders preparing, dispatch confirmed/preparing orders, and add or correct tracking after dispatch. Buyers can confirm receipt after a shipped/out-for-delivery status. Confirmation is blocked while an existing return/dispute has an active status; terminal cases do not block it. These controls do not create refunds, release payouts or restock inventory.

Native management reads/actions require verified Clerk primary email and a nonsuspended account. Ownership, participant role, action and current order status are validated after locking the order row. Prepare/dispatch/delivery repeats with the same result are idempotent and do not repeat notifications. A different dispatch payload after dispatch must use the tracking update action. Tracking updates preserve dispatch/delivery status and timestamps, require carrier and tracking, and accept text up to 80/200 characters respectively. Dispatch itself permits untracked shipments. Failed writes roll back and do not send update messages. Notification delivery uses existing best-effort system messages, with no new durable/push worker.

Website seller dispatch now uses this same guarded transaction service; the Sales screen only offers dispatch for confirmed/preparing orders. Pending/cancelled/refunded orders cannot be dispatched through it. Tracking and statuses remain reported by users/admin; no automatic carrier integration, shipping-label purchase or scan tracking is introduced. Estimated delivery is the existing recorded text, not a new delivery promise. Refresh after interrupted actions before retrying and to see other-device/admin changes. The native view contains no participant emails, payment tokens or admin notes; delivery address is available to the actual buyer/seller.

The subsequent returns/disputes milestone below extends this work with authenticated case creation under the same order-row lock. Admin command views continue to see the same order statuses/dates; no additional order_admin_events entries are added for native actions. Refunds and payouts remain separate admin workflows.

Required live device/browser acceptance: verified/suspended/nonparticipant access; buyer versus seller controls; pending/confirmed/preparing/shipped/out-for-delivery/delivered/refunded states; concurrent website/app dispatch; tracking correction and untracked shipments; open return/dispute blocking; interrupted/repeated actions; real PostgreSQL lock/rollback behavior; admin order agreement; fee/address display; notifications; account switching; and small-screen keyboard/error/retry handling. No live dispatch, delivery confirmation, order, payment or deployment was performed during source validation.


## Returns and disputes milestone

Apply this changed-files update over all twelve preceding milestones. Deploy the website/API together, then distribute the updated Android build. Existing member `/returns` and `/disputes` reads now return explicit camelCase DTOs rather than raw database rows; the included website and native screens understand these responses. Custom clients must send a valid Clerk bearer token and use the new shape. No new dependency or feature flag is required; the existing `disputes_returns` feature gate still applies.

More → Returns and disputes, or Purchases → Open order details, opens native case management. Buyers choose an eligible order, reason, condition for returns, and description. Cases are paged 25 at a time. Disputes retain the existing 30-day window from order creation; return requests are allowed after dispatch and remain subject to review. If no order is eligible, check existing cases or contact Support. Request submission does not promise approval or a refund. A pending/active case prevents opening a second active case for the same order. Exact creation retries return the same ID; changed duplicate content is rejected. Return history allows one return per order; a closed dispute can be followed by a different dispute only if otherwise eligible.

Buyers and sellers can view their cases, support decisions/instructions and return tracking. Dispute conversations show the latest 50 messages with older/newer paging. Messages accept text and optional HTTPS evidence links, not file uploads. Supplied return labels open in the device browser. Unsafe historical URL schemes are hidden; link contents are not verified. Only the buyer can submit tracking after return approval. New messages and shipment changes cannot reopen a closed case. Message references survive an in-screen retry but not app restart: refresh the conversation after interruption before sending again. Screen refresh/focus picks up admin changes; there is no push or automatic background polling.

The website's previous simulated return submission now actually saves a request. Its Returns and Disputes sections use the same account-checked case service as Android. The order list uses authenticated reads and shows a retryable error on failure. Legacy order detail reads are participant-restricted, and its status endpoint delegates supported preparation/dispatch/delivery transitions to the checked order workflow. Arbitrary member status changes are rejected. This does not constitute a security audit of every remaining marketplace API.

Server checks use the verified, nonsuspended Clerk account. Case ownership comes from the linked order's actual buyer/seller, overriding historic case email fields. Cases without an existing linked order remain admin-only for review. Creation locks the order; message/shipment changes lock the case and commit their associated message atomically. Identical retries are idempotent. Native/member case DTOs exclude account email addresses, payment identifiers and internal admin identity. Existing return admin notes were documented as buyer-visible; they are now explicitly labelled as shared return instructions/notes, visible to both case participants. Existing admin messages and resolution notes are shared with participants.

Optional pre-creation SQL is `backend/returns-disputes.sql`. It adds the return carrier and dispute message replay reference/index and ensures the existing dispute workflow columns. The API performs the same idempotent schema setup on first use; its database role must have the corresponding DDL permissions, even when objects already exist. Base orders/returns/disputes tables must exist first. No live migration was run. Admin return refund amounts remain recorded metadata; this milestone does not issue refunds, restock items, grant credits, release payouts, buy labels or send automatic case notifications. Existing admin financial actions are retained, not comprehensively reworked or audited.

Before release, test on real PostgreSQL and a signed Android build: verified/expired/suspended accounts; account switching; buyer/seller/nonparticipant access; eligibility and paging; concurrent case requests and delivery confirmation; interrupted creation/message/tracking retries; admin approval, support messages and case closure; supplied labels; small-screen keyboards and navigation. Confirm website and admin see each app-created case. No live cases, messages, orders, refunds, deployment or APK build were performed here.


## Native regional policy reader

Apply this update over all thirteen previous milestones. More and Account now provide Terms and privacy without requiring sign-in. The native reader has UK, EU and US choices, full shared and regional sections, text selection, search, refresh and retry. UK is the initial reading choice, not inferred residence. Selecting a region does not record consent or change legal rights. No location permission, acceptance record or consent mechanism is introduced.

The website and API now use `artifacts/api-server/src/lib/legalDocuments.ts` as the common policy source. Existing policy wording, summaries and dates are preserved. Update that file and deploy API and website together for future wording changes; Android fetches `/api/legal/:kind/:region` on screen focus and refresh. Valid kinds are terms/privacy and regions uk/eu/usa. The API is public and uses no-store responses. No database or dependency changes are required. Missing, incorrect-region or malformed responses show errors instead of a partial policy. Internet access is required; there is no offline fallback or downloaded policy cache. Search hides nonmatching sections until cleared; the regional summary remains visible. The Support button opens the website in the device browser.

This is presentation of the existing policies, not a new legal review or certification. It does not implement privacy requests, account deletion, cookie consent, app permission management or versioned acceptance. Before release, check all six views on a signed Android build, signed-out access, small screens/font scaling, text search, screen-reader labels, interrupted requests and region switching. Verify the configured API matches the website deployment.

## Milestone 15: commerce and seller tools

Added auction-winner/flash-sale checkout, Google Play credit purchasing, listing promotion management, seller verification, four importer modes and live-session/chat screens. These use the existing Bazunk backend/admin records. See `SETUP-COMMERCE.md` for installation, required server and store configuration, scope limits and release checks. Apply over all fourteen preceding native updates and deploy API/website together. The new native purchase dependency requires an Android rebuild, not only an over-the-air JavaScript update.

Purchases are gated until configured. Flash checkout currently sells one item per sale record. Didit and Stripe use secure browser flows; live video uses YouTube/Twitch while Bazunk hosts product links and chat. This is source code, not a signed installable app or a completed store release.

## Milestone 16: importer, checkout and live-session usability

Apply this small native patch after milestone 15 (commerce and seller tools). Free eBay entry now supports selecting the item's condition and an optional HTTPS ebayimg.com image URL. Category search keeps the selected category visible, and My Listings is directly accessible. The existing server validates imported details and image hosts.

Auction checkout is shown only for ended auctions with bids and a met/no reserve; the API still verifies the actual winner. Flash Buy is shown only to signed-in non-owners for active sales, with a separate payment-status shortcut for returning buyers. Refresh sale/auction details after their countdown changes; server checks remain authoritative.

Live chat now shows message times, an empty state, recent-message count and a second refresh button after the messages. Ending a hosted session requires confirmation and reminds the seller to stop the provider broadcast separately. No background polling is added. No API, database, dependency or configuration changes are required by milestone 16.
