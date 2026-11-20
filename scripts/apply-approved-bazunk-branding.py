#!/usr/bin/env python3
"""Install the approved Bazunk branding images and switch sitewide references.

Copy the reviewed PNG/ICO assets from the Bazunk branding package into
artifacts/sellbuydeal/public before invoking this script.
Run from the repository root. It refuses to run if any asset is missing.
"""
from pathlib import Path

root = Path("artifacts/sellbuydeal")
public = root / "public"
required = [
    "bazunk-brand-orange.png", "bazunk-brand-blue.png",
    "bazunk-brand-dark.png", "bazunk-brand-mixed.png",
    "bazunk-brand-icon.png", "bazunk-brand-favicon.png",
    "bazunk-brand-favicon.ico",
]
missing = [name for name in required if not (public / name).is_file()]
if missing:
    raise SystemExit("Missing branding assets: " + ", ".join(missing))

src = root / "src"
replacements = {
    "components/Navbar.tsx": [('"/bazunk-logo-header.png"', '"/bazunk-brand-orange.png"')],
    "components/Footer.tsx": [('"/bazunk-logo-header.png"', '"/bazunk-brand-dark.png"')],
    "pages/admin/AdminLayout.tsx": [('src="/bazunk-logo.png"', 'src={isDark ? "/bazunk-brand-dark.png" : "/bazunk-brand-orange.png"}')],
    "pages/LoginPage.tsx": [('src="/bazunk-logo.png"', 'src="/bazunk-brand-dark.png"')],
    "App.tsx": [('${window.location.origin}${basePath}/bazunk-logo.png', '${window.location.origin}${basePath}/bazunk-brand-orange.png')],
    "components/ShareCardModal.tsx": [('"/bazunk-logo-header.png"', '"/bazunk-brand-orange.png"')],
}
for name, changes in replacements.items():
    path = src / name
    text = path.read_text()
    for before, after in changes:
        if before not in text:
            print(f"No match (possibly already updated): {name}: {before}")
        text = text.replace(before, after)
    path.write_text(text)
index = root / "index.html"
text = index.read_text().replace('href="/favicon.svg"', 'href="/bazunk-brand-favicon.png"')
index.write_text(text)
print("Branding references updated. Run frontend build and tests before deploying.")
