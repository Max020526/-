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

## Current remote findings

- `nexora-wholesale` is Git-connected to `main`, allows only `main`, and currently skips PR builds.
- Its production context currently resolves to the Staging Supabase project. Do not deploy this branch until the Production site variables are corrected.
- `nexora-store-test` was manually deployed, is paused, has no Git build configuration and has no application environment variables.
- No dedicated Staging Admin/Operations site exists.

## Create/configure each site

1. Add new site → Import from Git → `Max020526/WholesaleSystem`.
2. Set production branch to `main` for Production sites or `develop` for Staging sites.
3. During compatibility phase, Admin/Operations use base directory empty. Storefront uses base directory `apps/storefront`. Build command is `npm run build:netlify`, publish directory `.next`.
4. Set Node `22.13.0`.
5. Configure the variables from `ENVIRONMENT-MATRIX.md`; never copy all variables between Staging and Production.
6. Enable Deploy Previews for PRs on the three Staging sites. Their Preview context must use `NEXT_PUBLIC_APP_ENV=preview` and Staging/Preview Supabase credentials.
7. Disable Deploy Previews on Production sites or explicitly scope their Preview context to Staging credentials. Never inherit Production values into Deploy Preview.
8. Add password/SSO protection to Staging and do not publish Staging addresses on the public storefront.
9. Confirm `/robots.txt`, `X-Robots-Tag` and the visible banner on Staging/Preview.

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
