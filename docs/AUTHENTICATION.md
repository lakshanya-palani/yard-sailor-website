# Yard Sailor authentication

## Architecture and inspected setup

This branch uses React 19, Vite 8, JavaScript/JSX, React Router's BrowserRouter,
and the installed official `@supabase/supabase-js` v2 package. It already had a
single Supabase client, Google/Facebook buttons on `/login` and `/register`, a
PKCE `/auth/callback` route, protected routes, profile setup, and Supabase email
sign-in. Existing email functionality is preserved; no password system was added.

`src/context/useAuth.js` exposes `{ user, loading, error }` anywhere in the app.
One shared SDK auth listener restores the session, propagates login/logout and
refresh events, and avoids an older initial session overwriting a newer event.
Supabase owns storage and refresh; application state stores only the current user.
Navbar, route guards, cart, and saved items consume this shared state.

SocialLogin calls the existing `startSocial` helper, which checks provider
availability and calls `supabase.auth.signInWithOAuth`. Facebook requests `email`.
The callback exchanges the PKCE code using the SDK and verifies the user before
checking profile completion. No provider tokens are manually handled or copied.
The callback is deduplicated across StrictMode effects, removes credentials from
browser history, and presents friendly failures. Return paths are same-origin
application paths kept in sessionStorage for up to 30 minutes; unavailable storage
falls back to `/`. The redirect is computed from `window.location.origin`.

`auth.users.id` remains the canonical identity. Existing `public.profiles` uses
`id`, `username`, `avatar_url` and existing private/internal columns. A new OAuth
user chooses a username in the existing setup screen; its upsert uses the auth ID.
Existing profiles are read, not recreated at each login. Metadata supplies navbar
name/avatar fallbacks, with initials if the image fails. Provider images are not
written into profiles because existing upload validation permits validated assets
only. Account linking is left to Supabase; no name-based merging was introduced.

## Database and security

No new table, SQL migration, RLS policy, or npm dependency is needed for this change.
The existing `202609070002_security_hardening.sql` enables RLS on profiles and adds
restrictive owner-only insert/update/delete policies (`id = auth.uid()`), revokes
anonymous writes, limits public reads to id/username/avatar_url, and validates
profile writes. The base profiles creation and permissive policies predate the
checked-in migrations. Live database configuration was not accessible or verified.

Before rollout, use Supabase SQL Editor to inspect the deployed schema/policies:

```sql
select relrowsecurity from pg_class where oid = 'public.profiles'::regclass;
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'profiles';
select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.profiles'::regclass;
```

Confirm RLS is enabled, profiles.id is a unique/primary UUID key referencing
`auth.users(id)`, and authenticated own-profile insert/update is permitted while
other-user writes and anonymous writes fail. Do not add broad policies to bypass
errors. Verify these behaviors with two test users and the public client key.

## Environment

Copy `.env.example` values into ignored `.env.local`:

- `VITE_SUPABASE_URL`: Project URL from Supabase Project Settings / API.
- `VITE_SUPABASE_ANON_KEY`: browser-safe legacy anon or publishable API key.
- `VITE_MAPBOX_TOKEN`: existing map feature only, unrelated to OAuth.

The existing local file already has these three variable names. No real values
were copied into tracked files. Never put service-role/secret keys or OAuth client
secrets into `VITE_*`. Restart Vite after changing environment values.

## Redirects: two different destinations

Let `SUPABASE_URL` be the exact value of `VITE_SUPABASE_URL`. For hosted Supabase,
the provider callback is `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
Copy the actual callback from the Supabase provider panel, especially if using a
custom Supabase domain.

| Register in | Development value | Production value |
| --- | --- | --- |
| Google Authorized redirect URIs | `SUPABASE_URL/auth/v1/callback` | Same for the same Supabase project |
| Meta Valid OAuth Redirect URIs | `SUPABASE_URL/auth/v1/callback` | Same for the same Supabase project |
| Supabase Redirect URLs | `http://localhost:5173/auth/callback` | `https://YOUR_PRODUCTION_DOMAIN/auth/callback` |
| Supabase Redirect URLs, if using IP address | `http://127.0.0.1:5173/auth/callback` | Not needed |
| Google Authorized JavaScript origins | `http://localhost:5173`, `http://127.0.0.1:5173` if used | `https://YOUR_PRODUCTION_DOMAIN` |
| Supabase Site URL | `http://localhost:5173` for a development project | `https://YOUR_PRODUCTION_DOMAIN` |

Use `npm run dev -- --port 5173 --strictPort` to avoid an unexpected alternate
port. If using Vite preview, separately allow `http://localhost:4173/auth/callback`.
The local frontend still uses the hosted Supabase callback in Google/Meta; do not
register the frontend `/auth/callback` as their provider callback. A local Supabase
CLI stack is a different setup, not configured by this project.

## Supabase dashboard steps

1. Open the project matching `VITE_SUPABASE_URL`.
2. Authentication → URL Configuration: set Site URL and add the exact frontend
   callback URLs in the table. Keep a live project's Site URL on production; just
   add development callbacks to its allowlist if sharing the project.
3. Authentication → Sign In / Providers → Google: enable Google, paste the Web
   OAuth Client ID and Client Secret from Google Cloud, and save.
4. In the same provider list, enable Facebook. Paste the Meta App ID into Client ID
   and App Secret into Client Secret, and save.
5. Copy the callback shown in each provider panel into the corresponding provider
   configuration below. Credentials belong here, never in frontend code.
6. After testing login, check Authentication → Users for the identity and verify
   the existing profile setup saves the same UUID to public.profiles.

Reference: [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## Google Cloud steps

1. Create/select a Google Cloud project. Open Google Auth Platform.
2. Configure Branding (Yard Sailor, support/developer contact, homepage/privacy
   URLs), Audience (External for public users), and test users while testing.
3. In Data Access, configure only `openid`, `userinfo.email`, `userinfo.profile`.
4. Clients → Create client → Web application. Add the frontend origins from the
   table and the Supabase callback as an Authorized redirect URI.
5. Copy Client ID and Client Secret into Supabase's Google provider and save.
6. Before public launch, publish the OAuth application and complete any requested
   branding/domain verification. Confirm production origins and redirect URI.

Reference: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Meta/Facebook steps

1. At Meta for Developers, create/select an app with the Facebook Login
   authentication/account-creation use case.
2. Facebook Login → Settings: enable Web OAuth/Client OAuth login as applicable,
   register the exact Supabase callback under Valid OAuth Redirect URIs, and save.
3. Use Cases → Authentication and Account Creation: configure `public_profile`
   and `email`, ready for testing. Supabase needs email permission.
4. Settings → Basic: copy App ID and App Secret into Supabase's Facebook provider.
5. App Roles → Roles: invite test users and have them accept; Development mode
   restricts login to app roles.
6. Before launch, complete required domain, privacy URL, contact, icon and data
   deletion settings. Supply truthful deletion instructions/process. Complete the
   verification/permission review required by your Meta dashboard and switch to
   Live mode. Basic login permissions may not require full review.

Reference: [Supabase Facebook setup](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

## Production and verification

Set the production environment variables at build time. Use HTTPS. Add the exact
production callback to Supabase and update Site URL, Google origins and Meta app
settings. If using another Supabase project, update provider callbacks and
credentials for that project. Configure the host to serve `index.html` for SPA
routes including `/auth/callback`, preserving the query string. No localhost URL
is hardcoded in runtime auth logic.

Automated checks:

- `node tests/social-auth.mjs`: 14 checks including actual SDK Google/Facebook
  PKCE initiation with mock provider settings, callback exchange/verification,
  failure paths, return-path safety and existing email-flow compatibility.
- `node tests/auth-session.mjs`: shared listener, StrictMode resubscription,
  stale initial session race, login/logout notifications, restoration, load error,
  storage unavailability, SDK persistence across client recreation and SDK logout.
  Network responses and identities in these tests are fixtures.
- `npm run build`: passes, with existing large-chunk warning.
- Changed auth files lint with no errors (existing SavedContext ref warning).
- Repository-wide lint reports 16 pre-existing errors and 9 warnings outside this
  auth implementation; no
  TypeScript/typecheck script exists.

The separate `tests/favorites.mjs` database harness could not run without its
required external PGlite module-path argument; it is not an OAuth test.

Browser automation could not start because the available browser tool's sandbox
kernel failed. No live provider login or live RLS test was performed. Once providers
are configured, manually test both buttons, provider cancellation, return to a
protected page, new-user setup, repeated login without duplicate profile rows,
refresh persistence, sign-out, missing/broken avatar and another-tab sign-out.
