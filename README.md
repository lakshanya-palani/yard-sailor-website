# Yard Sailor

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add the browser-safe Supabase project URL and publishable (or legacy anon) key. Add the public Mapbox token for map features. Never put service credentials in frontend environment files.
3. Run `npm run dev` and open [http://localhost:5174](http://localhost:5174). The server uses this port strictly and will report an error if it is already in use.

Payments are disabled by default. A Supabase administrator must allow the exact redirect URL `http://localhost:5174/auth/callback` for local authentication.

The image upload function bundles a public origin list that includes `http://localhost:5174`; a configured `ALLOWED_ORIGINS` environment variable takes precedence over that bundled list. See [deployment readiness](docs/DEPLOYMENT_READINESS.md) for backend configuration, deployment requirements, and verification steps.
