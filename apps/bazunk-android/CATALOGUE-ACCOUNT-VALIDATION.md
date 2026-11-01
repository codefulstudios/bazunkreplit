# Android catalogue and account validation — 26 October 2026

Implemented:
- Category / subcategory / sub-subcategory browsing from website taxonomy and live visibility overrides. Changing a parent clears children.
- Search and all category filters are sent to the server before pagination; explicit Search catalogue button and keyboard submission.
- Numeric saved links resolve to public listing references, with catalogue metadata supplementing detail responses.
- Swipeable HTTPS image gallery, cleaned text descriptions, specifications, seller identity/verification and delivery fields. Missing postage is not presented as free.
- Variant-bearing items cannot enter the ID-only cart without options. Website listing action is provided; native variation selection and checkout are not implemented.
- Unavailable/zero-stock items cannot be added. Seller/contact action opens the website instead of a broken native reviews route. Share opens native sharing.
- Website profile endpoint accepts optional name/username fields; account refreshes when app returns to foreground. My listings opens the website until native inventory is connected.

Verification:
- TypeScript, Expo lint and 14 regression tests pass.
- Live public detail BZK-EBY-UK-20261025-152230-027 returned HTTP 200 (ID 470).
- Live server search q=duvet and category=home-kitchen/sub=bedding each returned HTTP 200 with results.
- Website profile without authentication returned HTTP 401, as required.
- SecureStore token cache remains connected to ClerkProvider. Native Clerk AuthView handles sign-in and registration; signOut is awaited and profile state cleared.

Device checks still required before claiming authentication complete:
1. Existing website login loads matching profile/name/username.
2. Registration and any verification tasks finish inside the native AuthView.
3. Force-close and reopen restores the saved session and website profile.
4. Sign out, reopen, confirm signed-out state; sign in with a different account and confirm no old profile appears.
5. Inspect gallery/layout and category controls on a small Android screen.

No new APK built. Browser website actions may require their own browser login. Payments, native variant selection, and native seller/contact flows are not completed by these changes.
