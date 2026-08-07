# NEXORA deployment architecture

## Required topology

NEXORA uses three isolated lifecycle environments. During internal testing, Admin and Operations remain route groups in one deployable root application. Storefront and Wholesale remain separate future surfaces.

| Lifecycle | Internal application | Storefront | Supabase |
|---|---|---|---|
| Local | root Next.js process | independent local process when needed | Supabase CLI |
| Preview | CI; Netlify Deploy Preview optional | CI only until deployment approval | Supabase Preview Branch or Staging |
| Staging | `nexora-wholesale-staging` | deferred | `nexora-fashion-staging` |
| Production | `nexora-wholesale` | existing customer site remains unchanged | Production Supabase |

Auth, Storage, Edge Functions, data and API keys are isolated because Staging and Production are separate Supabase projects. Sharing a database and relying on a data flag is not acceptable isolation.

## Current repository state (2026-08-07)

- GitHub repository: `Max020526/WholesaleSystem`, public, single repository.
- `main` and `develop` exist remotely and are protected by the approved PR/CI flow.
- The root Next.js application combines Admin, Operations and legacy shop routes.
- The approved original storefront was previously local-only in a nested repository and is now preserved under `apps/storefront` without its caches, dependencies or nested Git metadata.
- Netlify has one Git-connected `nexora-wholesale` production site, one paused/manual `nexora-store-test` site and an undeployed `nexora-wholesale-staging` site.
- Deploy Previews remain optional and are currently disabled.
- The new `nexora-fashion-staging` project has the 61 canonical migrations and isolated test seed/accounts. Production was not modified during reconciliation.
- `nexora-wholesale-staging` still needs its Git link and new Staging Supabase environment values before first deployment.

## Compatibility migration

The target is a monorepo, but moving every route in one deployment-governance PR would mix infrastructure work with high-risk business changes. The transition is therefore explicit:

1. This PR adds shared environment validation, banners, robots protection, CI, seed separation and deployment documentation.
2. Until extraction, one `nexora-wholesale-staging` site builds the root app. `NEXT_PUBLIC_APP_SURFACE=admin` identifies the internal host but does not remove Warehouse, Inventory or Product routes.
3. This governance PR preserves the original Storefront source in `apps/storefront`; no Storefront Staging Netlify site is created in the current phase.
4. Admin and Operations are extracted only after route, auth, RBAC and end-to-end parity tests exist.
5. Netlify base directories change to `apps/*` only after those packages build independently.

`apps/admin` and `apps/operations` remain ownership placeholders. `apps/storefront` is a complete independently buildable application, but must not replace the production Storefront until its Draft PR and Staging acceptance tests pass.

## Security invariants

- `main` can only represent Production; `develop` can only represent Staging.
- Preview, Staging and Local builds cannot use the Production Supabase project ref.
- Production cannot use the Staging project ref.
- No public variable may contain a service-role/secret key.
- Staging and Preview always emit `noindex`, `nofollow` and a visible banner.
- Production Admin and Operations also remain non-indexable; only Production Storefront may be indexed.
- Database migrations run before production frontend publication.
- Production seeds never include test users, orders, inventory or finance records.

## Data flow

```text
feature/fix/chore -> PR -> GitHub CI -> develop
develop -> nexora-fashion-staging + nexora-wholesale-staging -> internal UAT
develop -> release PR -> main -> production approval
production approval -> backup verified -> migrations -> health checks -> frontends
```
