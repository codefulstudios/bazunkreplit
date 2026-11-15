# Bazunk CapRover test deployment

These files are **test-only** and do not change Render deployments.

- `Dockerfile.web` builds the Vite SPA and serves it with nginx on port 80.
- `Dockerfile.api` builds the Express API and listens on port 8080.
- Both builds use the monorepo root as Docker build context.
- The web build may need environment-specific Vite variables at **build time**, not only at runtime.
- The API **must not be started** until DATABASE_URL points exclusively to the isolated bazunk-test Neon database.
- The API currently runs schema migration statements and starts scheduled/background jobs during startup. Review and disable external side effects (emails, Stripe, eBay, imports, synchronizations) before any test launch.
- Do not reuse production secrets or webhook endpoints without explicit review.
- These are Docker build files only. No CapRover deployment hook or production DNS is configured.
