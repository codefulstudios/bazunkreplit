# Native Theme Studio and advertising — 27 October 2026

Published public settings drive Android's mobile light/dark palettes, with the existing design_mobile_inherit_web option selecting storefront palettes. Invalid palettes fall back to the website's validated defaults. Native controls subscribe to system appearance; expo-system-ui enables Android appearance support. Text/background pairs are checked for readability. No admin draft values or credentials are used.

Theme coverage:
- Page, surface, field, primary/secondary text and action colours across native screen controls, drawer, navigation, account modal and loading/error controls.
- Hero, categories, spotlight and promo section appearances, hero media, logo, section order/content, announcement colour, footer text/social links and published search/cart/social icon choices using native glyphs.
- Visual editor headings, paragraphs, images, buttons, cards, banners and sections; hidden state; light/dark colours; mobile overrides; font size/weight, safe system font families, padding/gap, width, radius/border, spacing, image height/fit and native shadow equivalents.
- Unsupported browser-specific details use native equivalents: arbitrary web fonts/CSS are not loaded, hover has no touch equivalent, image crop position remains centred, and multi-column custom blocks remain stacked on phones. SEO/favicon settings do not change native launcher metadata.

Advertising:
All 11 existing placement keys are supported: homepage, browse top/bottom, category top, auctions, classifieds, flash sales, rewards, live left/bottom, and support. Existing admin enable switches and text title/body/CTA/destination fields are shared. Native placements have an Advertisement label and use a consistent high-contrast branded card. Empty or disabled creatives leave no placeholder. HTTPS and safe internal links open the browser; failures offer an error message.

Custom HTML/AdSense scripts do not execute in native views. A slot configured as custom/AdSense can use the same admin text fields as its native creative; without text it is omitted. No new tracking SDK, impressions or marketing-consent state is introduced. Sections currently routed to the website continue to use the website's ads; this work does not activate unfinished native marketplace APIs.

Validation: TypeScript, Expo lint and 24 tests pass, including previously pending admin controls checks. Android bundle export succeeds. Physical-device appearance, launcher update, and external-ad interaction remain to be checked. No EAS APK build or deployment performed.
