#!/bin/sh
set -eu

key="${VITE_CLERK_PUBLISHABLE_KEY:-}"
api="${VITE_API_URL:-${VITE_API_BASE_URL:-}}"
case "$key" in
  *[!A-Za-z0-9_+/=-]*) echo "Invalid Clerk publishable key characters" >&2; exit 1 ;;
esac
case "$api" in
  https://bazunk-api-test.apps.bazunk.com) ;;
  *) echo "ERROR: Test storefront requires VITE_API_URL=https://bazunk-api-test.apps.bazunk.com" >&2; exit 1 ;;
esac
if [ -z "$key" ]; then
  echo "WARNING: VITE_CLERK_PUBLISHABLE_KEY is not set; Bazunk web will not render." >&2
fi
printf 'window.__BAZUNK_CONFIG__ = { clerkPublishableKey: "%s", apiBaseUrl: "%s" };\n' "$key" "$api" > /usr/share/nginx/html/bazunk-config.js
