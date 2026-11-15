# Bazunk CapRover test deployment

## Web application (bazunk-web-test)
The repository root `captain-definition` points to `deploy/caprover/Dockerfile.web`.
Set CapRover Git deployment branch to `caprover-test`. Container HTTP port: **80**.
Do not enable persistent data.

## API application (bazunk-api-test)
**Do not point the API at the same repository root captain-definition**, as that deploys the web image.
The API-specific definition is `deploy/caprover/captain-definition.api`, for a future dedicated API deployment process.
Container HTTP port: **8080**.
Do not start the API until DATABASE_URL is an isolated Neon `bazunk_test` database, and external integrations and incoming traffic are safely restricted.
The API image sets `BAZUNK_CAPROVER_TEST=true`, which disables scheduled jobs, but does not disable all request-driven external integrations.

## Important
The website's frontend API configuration may still target Render; verify the Vite build-time environment and client API URL before calling the test deployment isolated.
No production domain changes or Render shutdowns are authorized.
