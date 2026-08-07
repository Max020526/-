# Netlify setup

## Approved compatibility-phase topology

| Site | Branch | Source | Purpose |
|---|---|---|---|
| `nexora-wholesale` | `main` | repository root | existing Production internal system; unchanged by Staging work |
| `nexora-wholesale-staging` | `develop` | repository root | unified internal Staging system |

The root Next.js application currently owns Admin, Warehouse, Inventory, Product, Purchasing, Orders, Finance and Settings routes. RBAC, permissions, warehouse scope and category scope decide what each signed-in employee can see and operate. A logical workspace is not a separate deployable application.

Do not create `nexora-admin-staging`, `nexora-operations-staging`, `nexora-storefront-staging` or B2B Staging in this phase. Reconsider separate sites only after `apps/admin` or `apps/operations` contains an independently buildable package with its own UI/PWA or release lifecycle. The independent Storefront source remains in `apps/storefront`, but its Staging/Production Netlify rollout is deferred.

## Remote audit — 2026-08-07

- `nexora-wholesale-staging` already exists with project ID `dc319a74-3560-4711-9660-2da58e4870a5` and URL `https://nexora-wholesale-staging.netlify.app`.
- It has never been deployed and is not linked to a Git repository.
- Production and Deploy Preview visibility are currently Public.
- Environment-variable names are present, but the Staging site's Production deploy context still points to the old Staging Supabase project `iucikdtxpwnvhdcpulqa`.
- The approved replacement Staging project is `hpyhxljzsppocknycilz`; do not deploy until both the URL and publishable key use that project and the guard ref is updated.
- Deploy Preview is not required during the single-Staging phase and may remain disabled.
- `nexora-wholesale` remains the existing Production site and must not be changed while configuring Staging.
- `nexora-store-test` is a paused CLI/manual site and is not an approved long-term environment.

## Exact unified Staging configuration

Configure the existing `nexora-wholesale-staging` project:

- Repository: `Max020526/WholesaleSystem`
- Production branch for this Netlify project: `develop`
- Base directory: repository root / empty
- Build command: `npm run build:netlify`
- Publish directory: `.next`
- Node.js: `22.13.0`
- Deploy Preview: disabled for now
- Branch deploys: disabled unless explicitly needed later
- Production visibility: Private while only the Netlify Team Owner performs UAT
- Deploy Preview visibility: Private

On Netlify Personal, a private project can be viewed by the Team Owner. Shared password protection requires Pro; if external testers need access without Netlify membership, keep application Auth/RLS enabled and reassess the access plan before sharing the URL.

## Required Staging variables

The Netlify “Production” context below means the primary deploy of this Staging project. It must still contain only Staging values.

```text
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_SURFACE=admin
NEXT_PUBLIC_APP_NAME=NEXORA Internal Staging
NEXT_PUBLIC_SUPABASE_URL=https://hpyhxljzsppocknycilz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<new-staging-publishable-key>
NEXT_PUBLIC_SITE_URL=https://nexora-wholesale-staging.netlify.app
NEXT_PUBLIC_ADMIN_URL=https://nexora-wholesale-staging.netlify.app
NEXT_PUBLIC_OPERATIONS_URL=https://nexora-wholesale-staging.netlify.app
NEXT_PUBLIC_STOREFRONT_URL=https://nexora-wholesale-staging.netlify.app
PRODUCTION_SUPABASE_PROJECT_REF=<production-project-ref-guard-only>
STAGING_SUPABASE_PROJECT_REF=hpyhxljzsppocknycilz
STRICT_ENV_VALIDATION=true
SUPABASE_SECRET_KEY=<new-staging-server-secret>
```

`NEXT_PUBLIC_APP_SURFACE=admin` is the compatibility identifier for the unified internal root application. It does not disable `/warehouse`, `/inbound`, `/inventory` or `/products`; those routes remain controlled by Supabase Auth, RBAC and RLS.

Never copy Production values into this project. `SUPABASE_SECRET_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.

## Staging behavior already enforced by code

- A visible `STAGING 测试环境 — 当前数据不会进入正式系统` banner appears when `NEXT_PUBLIC_APP_ENV=staging`.
- Non-Production metadata sets `noindex` and `nofollow`.
- `robots.txt` disallows all crawling outside the Production Storefront.
- Every Staging response sends `X-Robots-Tag: noindex, nofollow, noarchive`.
- Build validation stops Staging if its Supabase URL/ref does not match the declared Staging project.
- Build validation stops Production URLs/refs from being used by Staging.

## Git-connected deployment flow

```text
feature/* or fix/*
  -> Pull Request to develop
  -> GitHub CI passes
  -> merge to develop after approval
  -> nexora-wholesale-staging builds automatically
  -> internal UAT
```

Do not use Netlify Drop, CLI production deploys or manual folder uploads for the Staging source of truth. Deploy Preview remains optional and disabled until concurrent PR testing is needed.

## Supabase and external-service safeguards

- Staging connects only to `nexora-fashion-staging` (`hpyhxljzsppocknycilz`).
- Staging Auth Site URL and Redirect URLs use `https://nexora-wholesale-staging.netlify.app`.
- Test email uses a sandbox/test recipient strategy; do not send to real customers.
- Payment remains test/manual and must not contain Production secrets.
- Logistics integrations remain disabled or use test endpoints.
- Test records use `TEST-*` identifiers and never copy Production customer data.

## Verification before UAT

- GitHub repository is linked and the site branch is `develop`.
- First build log reports `NEXORA 环境检查通过：staging/admin`.
- `/`, `/login`, `/admin`, `/warehouse`, `/inbound`, `/inventory`, `/products` and `/settings/users` refresh without 404.
- The STAGING banner is visible on desktop and mobile.
- `/robots.txt` disallows crawling and responses include `X-Robots-Tag: noindex, nofollow, noarchive`.
- Owner, Warehouse Manager and Product Operator see only their RBAC-authorized modules.
- Browser requests use `hpyhxljzsppocknycilz.supabase.co` and never the Production or old Staging project.
- Employee registration/server routes use only the new Staging server secret.
- No real email, payment or logistics event is emitted.

Only after these checks pass should the inbound → product completion → approval → publish end-to-end test begin. Production deployment and PR merge remain separate approvals.
