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
- Native text advertising placements are now implemented; see THEME-ADVERTISING.md.
- Native palettes, section appearance and visual elements are now connected. Browser-only details use the documented native equivalents; see THEME-ADVERTISING.md.
- Native launcher icon/OS splash still require an APK update.
- Fees, delivery, stock, permissions and payments must remain server-calculated/enforced. This change does not complete checkout or member features.

Validation status:
Regression tests added for feature routes, maintenance, homepage configuration and safe links.
The environment was restored on 27 October. Typecheck, lint, all 24 tests and Android export now pass. Physical-device validation remains outstanding.

