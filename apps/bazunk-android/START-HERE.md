# Bazunk Android recovered project — 24 October 2026

This folder combines the original native browsing project and 18 later archives. It is the full recovered Android source, not another incremental patch and not an APK.

## What you need to do next

Create or sign in to your own Expo account at https://expo.dev/signup. Tell ChatGPT when you are signed in; do not send passwords or access tokens in chat. The next setup is linking an Expo project and creating its Android signing credentials. You do not need a Google Play account just to install a preview APK.

## Windows build launcher

If you want to build from this download, install Node.js 24 LTS from https://nodejs.org, extract the ZIP, and double-click BUILD-TEST-APK.cmd in this folder. It installs dependencies, checks the source, asks you to sign into Expo, links or creates the Expo project and starts a preview build. Accept generating a new Android keystore only for the first build of your new app; retain the same Expo project and signing key for subsequent updates. Expo builds in the cloud; Android Studio is not required. Check your Expo account's build allowance before starting.

When Expo reports the build succeeded, open its APK download link on your phone and install it. A preview build runs without your computer or a development server. This launcher has been source-reviewed but could not be exercised on Windows here.

## GitHub build button after initial setup

The repository workflow is named **Build Bazunk test APK**. It must be merged into the repository's default branch before GitHub displays its manual Run workflow button. Initial Expo linking and Android signing credential setup must succeed before the noninteractive workflow can build.

Repository Settings → Secrets and variables → Actions:
- Secret EXPO_TOKEN: your Expo access token, entered only in GitHub's secret field.
- Variable EXPO_PROJECT_ID: the actual UUID shown by your Expo project.
- Variable EXPO_PUBLIC_API_URL: the intended API prefix (defaults to https://bazunk.com/api).
- Variable EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: the public key for the same Clerk application as Bazunk. Without it the app has browsing-only access.
- Optional variable EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: the public Android SDK key after Play billing setup. Not required for a browsing test.

Set matching EXPO_PUBLIC_* values in Expo's preview environment too: cloud builds need the same runtime configuration as local checks. Never put Stripe secret keys, database passwords, Clerk secret keys or RapidAPI server secrets into the app.

Once configured, Actions → Build Bazunk test APK → Run workflow creates a signed preview APK using Expo. The build log gives the Expo build page and installation link. No automatic build on every website change is configured.

## Current readiness

Passed on the combined recovered source: npm ci, TypeScript, Expo lint, Android Metro/Hermes export and five importer validation tests. These are source checks, not a signed native APK build or device test.

No Expo project/account or Android signing credentials were configured during recovery. No APK has yet been produced. The current main website repository has no dedicated mobile route files from these milestones. Public browsing may work against existing APIs; login/account provisioning, native commerce, messaging and other mobile features require backend integration and live testing. Old server/web files were preserved separately for review and must not overwrite today's live site. No production deployment or database migration was performed.

README.md, VALIDATION.md and the milestone setup notes describe historical work; this file is the current recovery status. The old logo is preserved, pending an update to current branding.

## Administration

The intended admin is the existing Bazunk web admin. Once the API integration is finished, the website and app share marketplace data. Website Visual Editor layout changes do not automatically change native Android screens.

Build references: https://docs.expo.dev/build-reference/apk/ and https://docs.expo.dev/build/building-on-ci/
