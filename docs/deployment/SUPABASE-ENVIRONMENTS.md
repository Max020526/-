# Supabase environments

## Remote allocation

- Production: existing `NEXORA_WHOLESALE` project. Rename to `nexora-fashion-production` after confirming integrations.
- Staging: existing independent NEXORA test project. Rename to `nexora-fashion-staging` after confirming integrations.

Do not write project URLs, publishable keys, secret keys, access tokens or database passwords into Git. Project refs may appear only in secret/environment stores, except generic placeholders in documentation.

## Isolation

Each project owns independent Database, Auth, Storage, Edge Functions and API keys. Accounts with the same email remain separate identities. Never export Production Auth users or customer data into Staging.

Required Storage buckets in each project:

- `product-images`
- `product-videos`
- `finance-documents`
- `return-images`
- `user-avatars`

Current projects expose only two buckets, so the missing buckets and their policies must be created by reviewed migrations/configuration before the related features are enabled. Paths should use stable business IDs, for example `products/{product_id}/{variant_id}/{filename}`.

## Migration state found during audit

- Git currently contains 50 migration files.
- Production reports 54 migration-history rows.
- Staging reports 56 migration-history rows.
- Both remote projects have RLS enabled on every table currently in `public`.

The counts prove migration-history drift. Do not run `db push`, `migration repair`, reset or production DDL until the histories are compared by version and the extra remote entries are explained. Capture any Dashboard-only schema changes with a new reviewed migration; never edit an already-applied migration.

For that reason the Staging database workflow is currently manual and requires typing `DEPLOY_STAGING`. Automatic develop-to-Staging migration deployment may be restored only after `docs/database/SCHEMA-DRIFT.md` is closed by a reviewed reconciliation PR.

## Local and Preview

- Local uses `supabase start` and `supabase db reset`.
- Preview uses a Supabase Preview Branch when available; otherwise it uses Staging.
- Supabase Preview Branches are isolated and may use `supabase/seeds/staging.sql`.
- No Production data is cloned into preview branches.

## Seed policy

- `supabase/seeds/base.sql` includes reference-only data from the legacy base seed.
- `supabase/seeds/staging.sql` creates deterministic `TEST-*` organization, warehouse, product, variant and inventory data.
- Test Auth users and orders are created through test workflows, not stored passwords/static Auth SQL.
- Production deployment workflows never include seed files.

## Auth and redirects

Configure Site URL and Redirect URLs separately in each project. Production contains only Production domains; Staging contains only Staging/Deploy Preview patterns. Use custom SMTP sandbox/test recipients in Staging and production SMTP only in Production.

## Manual checklist

1. Confirm the two project names and document their refs in GitHub/Netlify secret stores.
2. Compare `supabase_migrations.schema_migrations` version lists against Git.
3. Check Security and Performance Advisors in both projects.
4. Confirm RLS policies, function execute grants and Storage policies.
5. Enable leaked-password protection and MFA policy for privileged Production accounts.
6. Confirm Production backups/PITR and record a restore drill.
7. Never use `supabase db reset --linked` on Production.

## Current Advisor snapshot — 2026-08-06

Production:

- Security: 1 WARN, leaked-password protection disabled.
- Performance: 168 INFO (167 unused-index notices plus one Auth connection notice). Do not remove indexes solely from a low-traffic snapshot.

Staging:

- Security: 8 WARN. Review anon/authenticated execution on `rpc_create_storefront_order`, `rpc_get_storefront_catalog`, `rpc_get_storefront_order` and authenticated execution on `rpc_merge_customer_cart`; leaked-password protection is also disabled.
- Performance: 190 INFO, all unused-index notices.

Console paths for both projects:

1. **Authentication → URL Configuration**: Site URL and Redirect URLs must contain only that environment's Admin/Operations/Storefront domains.
2. **Authentication → SMTP Settings**: Staging uses sandbox/test recipients; Production uses verified production SMTP.
3. **Authentication → Sign In / Security**: enable leaked-password protection; require MFA for privileged Production users.
4. **Storage**: verify buckets, MIME/size limits and policies; never copy Production objects into Staging.
5. **Database → Advisors**: review Security and Performance findings after every approved migration.
6. **Database → Backups** (Production): verify scheduled backups/PITR and record a restore rehearsal before release.
7. **Project Settings → API/Data API**: verify explicit grants for tables/functions because new public objects may no longer be auto-exposed; RLS remains mandatory.
