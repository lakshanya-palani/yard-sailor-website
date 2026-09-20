# Profile and account improvements — September 8, 2026

No new columns, tables, routes, dependencies, or migration are introduced. Public profiles still use only username and avatar_url. The existing private Auth email is displayed only in the owner's editor, outside the public preview.

Prerequisites remain the existing hardening migration `202609070002_security_hardening.sql` and deployed `secure-image-upload` function. The migration enforces profile ownership, username validation, verified avatar paths, and public column permissions. Its live deployment was not audited in this task; reconcile migration history before applying anything. See HARDENING.md. Do not reapply an existing migration.

In Supabase Authentication's email-provider settings, review/enable **Secure password change** for server-enforced reauthentication. Verify Auth email delivery and the reauthentication email template. The Settings form handles `reauthentication_needed` / `reauthentication_not_valid` using official `reauthenticate()` and `updateUser({password, nonce})`. The UI cannot enforce a server security setting. Existing passwords remain supported; new passwords require at least eight characters in this UI and must pass Supabase's configured rules. See https://supabase.com/docs/reference/javascript/auth-updateuser.

Connected providers are read from the verified Auth user's identities. Provider linking/unlinking is intentionally not implemented; this prevents accidental removal of a user's only sign-in method. OAuth setup remains in OAUTH_SETUP.md.

Other-session sign-out uses `signOut({scope:'others'})`, preserving the current session. Supabase revokes sessions' refresh access; previously issued access tokens can remain valid until expiry. See https://supabase.com/docs/reference/javascript/auth-signout.

Deletion requests open an email to the existing support address. The owner must review and verify requests and determine applicable retention obligations. No automatic deletion or response deadline is promised.

Notification, location and visibility toggles are deferred until their behavior can be enforced throughout the application. Bio/location fields were not added without a public profile display that consumes them. Existing username/photo editing was improved instead.

Validation: mocked save checks covered valid normalization, avatar removal, invalid username, absent session and changed account rejection. Browser checks verified live unsaved preview, invalid-field focus and error association, and revert without writing account data. No real password change, session revocation, image upload, or cross-user production RLS test was performed. A full upload/authorization verification still depends on the deployed hardening setup.

Unsaved edits are indicated and browser unload prompts are enabled. In-app navigation is not blocked; save/revert instructions are shown. Uploads occur before profile save: reverting/removing a photo does not delete already stored objects.
