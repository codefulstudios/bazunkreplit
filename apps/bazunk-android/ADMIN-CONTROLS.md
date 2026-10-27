# Shared Android admin controls

Implemented against the website public settings contract on 27 October 2026:
- One app-wide public-settings source. Refresh at launch, on return to foreground, every minute while active, and on pull-to-refresh.
- Last successful feature settings retained with a visible retry notice on refresh failure. Category failure hides category choices rather than enabling stale categories.
- Maintenance overlay blocks interaction, including the drawer.
- Feature toggles cover menu items and native detail/create routes (Direct Sale uses feature_quick_sell). Server authorization and feature enforcement remain authoritative.
- Homepage and browse share taxonomy names, sorting, visibility and third levels. Hidden selections reset when taxonomy changes.
- Published logo, hero title/subtitle/buttons, search placeholder, category title, footer copyright/tagline, announcement enablement/text.
- Published optional homepage section ordering/visibility and section content/card destinations. Disabled feature destinations filtered from cards.
- No admin credentials or draft editor data added to the app.

Not full visual/editor parity:
- Native advertisement placements are not implemented.
- Web-only CSS, visual-element layouts, custom fonts, animation/GIF selection and complete Theme Studio palettes are not ported.
- Native launcher icon/OS splash still require an APK update.
- Fees, delivery, stock, permissions and payments must remain server-calculated/enforced. This change does not complete checkout or member features.

Validation status:
Regression tests added for feature routes, maintenance, homepage configuration and safe links.
The coding environment disconnected during implementation. Typecheck, lint, tests and Android export have NOT been run for this change. Do not mark this release verified or build a user APK until those checks pass and controls are exercised on a device.
