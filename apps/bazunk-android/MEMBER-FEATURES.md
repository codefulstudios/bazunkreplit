# Native selling and member integrations — 28 October 2026

Connected to the marketplace API contracts, replacing unfinished /mobile routes for:
- Creation, draft saving and editing through /listings; authenticated seller identity and UK/USA marketplace region are supplied. Native camera/gallery photos use the website's data-image payload, with a ten-photo limit, main-photo selection and size checks below the server's 10 MB request limit.
- Own inventory through /listings/mine. Archive now PATCHes status=inactive rather than deleting records. The API returns the latest 100 listings, so the app no longer pretends offset pagination is available.
- Saved items through /watchers/mine and /listings/:id/watch, with active listing details loaded in batches. Existing website-only local-storage entries cannot be recovered unless they were also saved to the server.
- Conversation list, messages and send actions through /messages/conversations. Incoming messages can be refreshed; this is not a websocket chat implementation.
- Offers: deployed snake-case response mapping, amount request field, seller accept/decline/counter and buyer accept-counter/decline-counter actions. Removed fictional expiry/version/payment state, unsupported withdrawal and broken deal-payment navigation. Latest 100 offers are shown.
- Buyer orders through /orders, seller orders through /orders/seller (latest 300), detail through /orders/:id, and confirmed/preparing seller dispatch through /orders/:id/dispatch. Missing currency/amounts remain explicitly unknown. Returns/disputes still open the website.
- Menu, account and selling links now reach these native screens. Listing actions expose server-backed save, message and offer actions, respecting feature settings.

Preservation and limits:
Editing retains existing region, variants, specifications and unknown metadata. It does not overwrite delivery/stock fields the inventory API omits. Third-level category is retained when the API omits it and the user has not changed the hierarchy. For existing listings, delivery/stock management still uses the website. Agreed-offer payments, cart checkout and order creation from payment are separate unfinished work.

Verification:
Typecheck, Expo lint and all 32 automated tests pass. Android JavaScript bundle exports successfully. Tests cover photo payload limits, retained metadata, authenticated identity paths, saved IDs/batching, offer contracts and order mapping, plus existing regression suites.
Unauthenticated live API checks timed out from this environment, so live endpoint success is not claimed. No production listings, messages, offers, orders or dispatch notices were created during testing. A real Clerk session and Android device are still required for end-to-end camera permissions, uploads, message exchange, offers and account order visibility.
