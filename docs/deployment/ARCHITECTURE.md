# NEXORA deployment architecture

## Required topology

NEXORA uses three isolated lifecycle environments and three deployable application surfaces. Wholesale remains reserved.

| Lifecycle | Admin | Operations | Storefront | Supabase |
|---|---|---|---|---|
| Local | local process | local process | local process | Supabase CLI |
| Preview | Netlify Deploy Preview | Netlify Deploy Preview | Netlify Deploy Preview | Supabase Preview Branch or Staging |
| Staging | dedicated site | dedicated site | dedicated site | dedicated Staging project |
| Production | dedicated site | dedicated site | dedicated site | dedicated Production project |

Auth, Storage, Edge Functions, data and API keys are isolated because Staging and Production are separate Supabase projects. Sharing a database and relying on a data flag is not acceptable isolation.

## Current repository state (2026-08-06)

- GitHub repository: `Max020526/WholesaleSystem`, public, single repository.
- `main` exists remotely; this change creates `develop` from the current `main` baseline before opening the governance PR.
- The root Next.js application combines Admin, Operations and legacy shop routes.
- The approved original storefront was previously local-only in a nested repository and is now preserved under `apps/storefront` without its caches, dependencies or nested Git metadata.
- Netlify has one Git-connected `nexora-wholesale` production site and one paused/manual `nexora-store-test` site.
- Deploy Previews are disabled on the current production site (`skip_prs=true`).
- The current production Netlify site is configured with the Staging Supabase URL. This must be corrected before the new build guard is deployed.
- Production and Staging Supabase projects exist and are separate, but their migration histories have drifted from each other and from the 50 migration files currently in Git.

## Compatibility migration

The target is a monorepo, but moving every route in one deployment-governance PR would mix infrastructure work with high-risk business changes. The transition is therefore explicit:

1. This PR adds shared environment validation, banners, robots protection, CI, seed separation and deployment documentation.
2. Until extraction, temporary Admin and Operations sites may build the root app and set `NEXT_PUBLIC_APP_SURFACE` to their matching surface.
3. This governance PR preserves the original Storefront source in `apps/storefront`; a dedicated UI/functional PR must still validate it before any Storefront Netlify site is repointed.
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
feature/fix/chore -> PR -> CI + Deploy Preview -> develop
develop -> Staging Supabase + three Staging sites -> UAT
develop -> release PR -> main -> production approval
production approval -> backup verified -> migrations -> health checks -> frontends
```
