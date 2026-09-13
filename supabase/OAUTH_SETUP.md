# Google and Facebook sign-in

Reviewed September 8, 2026. Both providers currently report disabled through the project's public Auth settings. The application implementation is ready; successful provider consent and callback have not yet been tested with real provider credentials.

## Supabase redirect configuration

In the existing project, open **Authentication → URL Configuration**. Review and preserve existing entries. Add these exact Redirect URLs:

- `http://localhost:5173/auth/callback`
- `https://YOUR_PRODUCTION_DOMAIN/auth/callback` (replace with the actual deployed domain)
- `http://127.0.0.1:5173/auth/callback` only if you also use that local origin.

Keep the Site URL set to the intended production site; do not replace it with localhost. The production domain has not been verified in this task. Ensure the hosting service serves the React application at `/auth/callback` on a direct request. The existing email confirmation template should use Supabase's confirmation link and respect the requested redirect, rather than hard-code a different destination.

The **provider callback** is different from the application callback above. Copy it from **Authentication → Providers → Google/Facebook**. For the current hosted project it is:

`https://kqceoaqkqsrwgcqaergx.supabase.co/auth/v1/callback`

The local Vite frontend uses this hosted Supabase project, so use this same provider callback for local testing. Recheck it if the project or Auth domain changes. [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## Google

1. In **Google Cloud Console → Google Auth Platform**, select/create the project. Configure Branding and Audience, including support contact and the site's real homepage/privacy URLs. While testing, add your test users.
2. In Data Access, configure `openid`, email, and profile scopes.
3. In **Clients → Create client → Web application**, add authorized JavaScript origins `http://localhost:5173` and the actual production origin. Add the Supabase provider callback above under **Authorized redirect URIs**.
4. Copy the generated **Client ID** and **Client secret** directly into **Supabase → Authentication → Providers → Google**, enable it, and save. Complete Google's applicable production publishing/verification requirements before opening sign-in to the public.

See the [official Google setup guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Facebook

1. In **Meta for Developers → My Apps**, select/create the app and add the Facebook Login authentication use case.
2. In Facebook Login settings, enable the web OAuth flow and add the Supabase callback above to **Valid OAuth Redirect URIs**. Configure the actual website domain/URL in the app settings.
3. Ensure `public_profile` and `email` are available for testing. Supabase needs an email; the frontend explicitly requests the email scope.
4. From **App settings → Basic**, copy **App ID** and **App secret** directly into **Supabase → Authentication → Providers → Facebook**, enable it, and save.
5. In development mode, test with authorized app roles/testers. Before public availability, supply Meta's required privacy and user-data deletion information and complete the Live mode, permission review, and verification requirements shown for your app. Do not claim a deletion URL works until its process exists.

See the [official Facebook setup guide](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

## Secrets and account behavior

Provider secrets belong in Supabase **Auth provider settings**, not Vite variables, frontend code, Git, logs, chat, or Stripe Edge Function secrets. No new frontend environment variables, database migrations, dependencies, or custom OAuth server are needed. Keep using the existing public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The shared Supabase client uses PKCE. `/auth/callback` exchanges the code once, verifies the user, and restores a same-origin return path saved in session storage for up to 30 minutes. New users without a username continue through existing profile setup; existing profiles are read, not recreated. Account identity/linking remains Supabase's responsibility; the frontend never merges accounts by a supplied email. Different provider emails may represent different accounts.

Complete OAuth in the initiating browser/tab. Email confirmation now also uses the PKCE callback. If opened in another browser without its verifier, the page explains that the user can log in with their password after confirming email. See [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Verification after configuration

1. Sign out, visit `/cart`, and start Google login. Complete consent in the same tab. Confirm return to cart (through profile setup if needed), then refresh to check session restoration.
2. Repeat with Facebook and `/messages`. Check profile, existing listings, and seller actions. For an existing account using the same verified email, confirm Supabase retained its user identity and data.
3. Cancel each provider's consent and confirm a useful error/retry path. Check Login ↔ Sign Up preserves the intended destination.
4. Test existing email/password login, new registration/email confirmation, logout, and protected routes again on localhost and production.

Already checked: 14 automated cases using the installed Supabase SDK with mocked transport (OAuth URL/PKCE construction, email/password session persistence, registration, callback verification/error paths, return-path validation and profile routing); production build passed. Browser checks confirmed both disabled-provider fallbacks and signed-out `/cart` redirect to `/login?redirect=%2Fcart`. These checks do not establish successful live Google/Facebook authentication. Complete the steps above before treating the providers as operational.
