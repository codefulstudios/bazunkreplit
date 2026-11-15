#!/bin/sh
set -eu

key="${VITE_CLERK_PUBLISHABLE_KEY:-}"
case "$key" in
  *[!A-Za-z0-9_+/=-]*)
    echo "Invalid Clerk publishable key characters" >&2
    exit 1
    ;;
esac

if [ -z "$key" ]; then
  echo "WARNING: VITE_CLERK_PUBLISHABLE_KEY is not set; Bazunk web will not render." >&2
fi

printf 'window.__BAZUNK_CONFIG__ = { clerkPublishableKey: "%s" };\n' "$key" > /usr/share/nginx/html/bazunk-config.js
