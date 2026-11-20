# Messaging and saved-item reliability — 7 October 2026

Apply at the repository root after the existing Android updates, preserving paths. This patch contains only its seven changed/new files. It does not replace the importer, payment, live, or shared README/setup files, so the separate importer fixes can remain installed.

## Changes

- Saving/removing a watched listing now locks the listing row and commits the watcher change and cached count in one database transaction. Concurrent changes cannot overwrite each other's count through these routes. Failed count writes roll back the saved-item change. Saving your own or inactive listing is rejected; removal still works for inactive listings.
- Sending a message commits the message and conversation timestamp together. A failed conversation update no longer leaves a partially saved message. This does not add request idempotency: if the network response is lost after a successful commit, refresh the conversation before resending.
- Inbox names are resolved in the main query rather than one extra query per conversation. The response shape is unchanged for the website and Android.
- Conversation/listing route IDs are validated before querying, message bodies must be strings, and messaging/watcher failures return JSON errors with no-store headers rather than an unhandled response. Existing membership/ownership checks remain in place. These changes also fix the previous TypeScript return-path errors in messages.ts and watchers.ts.
- Android Saved Items now verifies `watched:false` before treating removal as successful, blocks repeated taps synchronously, disables pagination while a removal is pending and has a refresh button.
- Android conversations reject malformed timestamps/IDs, show an empty-conversation message, and add a refresh button after the messages.

No database migration, new dependency, environment setting or paid service is required for this patch. Deploy the API changes and rebuild/update the Android application using your existing process. The two existing backend route files are shared with the website; no website UI files are changed.

## Validation

226 mocked tests passed, including eight new tests covering concurrent/replayed saves, rollback, owner/inactive restrictions, malformed IDs, atomic message writes, nonparticipant rejection, nontext message rejection and retryable errors without internal detail disclosure. The harness mocks providers and database transactions; real PostgreSQL concurrency and device behavior still need staging checks.

Native lint, TypeScript and Android Metro/Hermes JavaScript export passed. API production bundle build passed. Full API TypeScript still reports eight existing diagnostics in clerkProxyMiddleware.ts, admin.ts, referrals.ts and stripe.ts; none are in this patch. The remaining diagnostics have not been suppressed or hidden.

No live database, account, message, payment, deployment, APK/AAB, emulator or physical device was used. Test a buyer/seller conversation, saved-item removal and refresh on a signed Android build before release. This source archive is not an installable Android app.
