# Secrets management

## Public configuration

Only browser-safe values may use `NEXT_PUBLIC_*`:

- application environment/surface/name;
- public site URLs;
- Supabase project URL;
- Supabase publishable key (or legacy anon key).

A publishable/anon key is not authorization. RLS and restricted RPCs remain mandatory.

## Server-only secrets

Never prefix these with `NEXT_PUBLIC_` and never commit them:

- Supabase secret/service-role key;
- Supabase access token and database password;
- Netlify auth token;
- Stripe secret key;
- webhook signing secret;
- SMTP/API private keys.

Store them in the matching Netlify site context or GitHub Environment. Production secrets are never available to feature branches or Deploy Preview jobs.

## Controls

- `.gitignore` excludes `.env*` except `.env.example`.
- `.env.example` contains placeholders only.
- Build validation rejects public secret names and secret-looking values.
- GitHub runs a secret scan on every PR.
- Netlify secret scanning remains enabled.
- Rotate a secret immediately if it appears in logs, commits, screenshots or browser bundles.

## Rotation response

1. Revoke/rotate at the provider first.
2. Update only the correct Staging or Production secret stores.
3. Remove the value from Git history if committed.
4. Redeploy affected server functions/apps.
5. Verify no unauthorized activity and document the incident.

Do not paste real secrets into PR descriptions, issues, docs or chat transcripts.
