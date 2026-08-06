# Netlify setup

## Target sites

| Site | Branch | Surface | Suggested domain |
|---|---|---|---|
| nexora-admin-production | main | admin | admin.nexora.example |
| nexora-operations-production | main | operations | operations.nexora.example |
| nexora-storefront-production | main | storefront | www.nexora.example |
| nexora-admin-staging | develop | admin | admin-staging.nexora.example |
| nexora-operations-staging | develop | operations | operations-staging.nexora.example |
| nexora-storefront-staging | develop | storefront | shop-staging.nexora.example |

Until Admin/Operations extraction is complete, their temporary sites leave Base directory empty and use the matching `NEXT_PUBLIC_APP_SURFACE`; do not point them at the placeholder folders. The approved original Storefront source is preserved at `apps/storefront`, so its two sites use that Base directory after this Draft PR passes CI and Staging review. Never publish the root legacy `/shop` routes as the customer website.

## Current remote findings — 2026-08-06 read-only audit

- `nexora-wholesale` is Git-connected to `Max020526/WholesaleSystem`, Production branch `main`, base `/`, build `npm run verify:environment && npm run build:netlify`, publish `.next`.
- Netlify UI reports Node `24.x`, while version-controlled `netlify.toml` requires `22.13.0`; explicitly set `NODE_VERSION=22.13.0` to remove this ambiguity.
- Branch deploys are disabled and Deploy Previews are set to “Don’t deploy pull requests”. This is why PR #16 has no Netlify Preview check.
- Deploy logs are public, and “All deployment methods can deploy to production” is enabled. This conflicts with Git-only controlled publishing and must be tightened before Production release.
- `NEXT_PUBLIC_SUPABASE_URL` is correctly context-separated now: Production targets Production Supabase; Deploy Previews and Branch deploys target Staging Supabase.
- The site is still missing required guards/identity variables such as `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_SURFACE`, `NEXT_PUBLIC_APP_NAME`, `STAGING_SUPABASE_PROJECT_REF` and cross-app URLs. The new strict build will fail until they are added per context.
- `nexora-store-test` was manually deployed from CLI, is paused and is not an acceptable long-term Staging site.
- No dedicated Staging Admin/Operations site exists.

## Create/configure each site

1. Add new site → Import from Git → `Max020526/WholesaleSystem`.
2. Set production branch to `main` for Production sites or `develop` for Staging sites.
3. During compatibility phase, Admin/Operations use base directory `/` (repository root). Storefront uses base directory `apps/storefront` only after its integration PR is approved. Build command is `npm run build:netlify`, publish directory `.next`.
4. Set Node `22.13.0`.
5. Configure the variables from `ENVIRONMENT-MATRIX.md`; never copy all variables between Staging and Production.
6. Enable Deploy Previews for PRs on the three Staging sites. Their Preview context must use `NEXT_PUBLIC_APP_ENV=preview` and Staging/Preview Supabase credentials.
7. Disable Deploy Previews on Production sites or explicitly scope their Preview context to Staging credentials. Never inherit Production values into Deploy Preview.
8. Add password/SSO protection to Staging and do not publish Staging addresses on the public storefront.
9. Confirm `/robots.txt`, `X-Robots-Tag` and the visible banner on Staging/Preview.
10. Under **Build & deploy → Build settings**, change Deploy log visibility to private/team-only where the plan allows it.
11. Under **Build & deploy → Enforce deployment methods**, restrict Production publishing to the approved Git workflow; do not leave CLI/API/MCP/manual deploys able to overwrite Production.

## Exact Staging fields

### `nexora-admin-staging`

- Repository: `Max020526/WholesaleSystem`
- Production branch for this Staging site: `develop`
- Base directory: `/`
- Build command: `npm run build:netlify`
- Publish directory: `.next`
- Node: `22.13.0`
- `NEXT_PUBLIC_APP_ENV=staging`
- `NEXT_PUBLIC_APP_SURFACE=admin`
- Add the remaining variables from `ENVIRONMENT-MATRIX.md` using only Staging values.

### `nexora-operations-staging`

- Repository/branch/base/build/publish/Node: same as Admin Staging.
- `NEXT_PUBLIC_APP_ENV=staging`
- `NEXT_PUBLIC_APP_SURFACE=operations`
- Add Staging Admin URL and Staging Supabase values.

### Deploy Preview contexts

- Enable **Project configuration → Build & deploy → Branches and deploy contexts → Deploy Previews → Any pull request against your production branch** on the two Staging sites.
- Set Preview context `NEXT_PUBLIC_APP_ENV=preview`.
- Preview Supabase URL/key must be Staging or an isolated Preview Branch; never inherit Production.
- Enable password/SSO protection under **Project configuration → Visitor access** when available.

Do not create/connect a Storefront Netlify site in this governance PR. Although `apps/storefront` now contains the preserved source, it is not approved until CI, migration reconciliation and a dedicated integration review pass.

## Variable templates

Production Admin example (values are placeholders):

```text
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_SURFACE=admin
NEXT_PUBLIC_APP_NAME=NEXORA Admin
NEXT_PUBLIC_SUPABASE_URL=<production-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<production-publishable-key>
NEXT_PUBLIC_SITE_URL=<production-admin-url>
NEXT_PUBLIC_STOREFRONT_URL=<production-storefront-url>
PRODUCTION_SUPABASE_PROJECT_REF=<production-ref>
STAGING_SUPABASE_PROJECT_REF=<staging-ref>
SUPABASE_SECRET_KEY=<production-server-secret>
```

Staging values follow the same shape with `APP_ENV=staging`, Staging URLs/keys and a Staging-only server secret.

## Migration-first production publishing

During the transition, stop automatic Production publishing. After the approved database workflow succeeds, trigger locked Production frontend deploys in Admin → Operations → Storefront order. Re-enable automatic Git publishing only when one release workflow can guarantee the database-first order.

## Verification

- Site deploy log prints `NEXORA 环境检查通过: environment/surface`.
- Main + Staging URL fails the build.
- Develop + Production URL fails the build.
- Deploy Preview + Production URL fails the build.
- Refreshing deep links does not produce a 404.
- Staging/Preview has noindex and Production Storefront is indexable.
