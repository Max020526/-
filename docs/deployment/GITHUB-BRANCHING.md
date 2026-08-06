# GitHub branching and protection

## Branches

- `main`: approved Production releases only.
- `develop`: integrated Staging release candidate.
- `feature/*`: features from `develop`.
- `fix/*`: ordinary fixes from `develop`.
- `chore/*`: infrastructure/maintenance from `develop`.
- `docs/*`: documentation from `develop`.
- `hotfix/*`: exceptional production repairs, reviewed into `main` and back-merged to `develop`.

`develop` was created from protected `main` on 2026-08-06. This deployment-governance branch is a bootstrap exception because `develop` did not exist when the work began.

## Pull-request policy

- Short-lived branches target `develop`.
- Only `develop` or `hotfix/*` may target `main`.
- A PR must pass `PR policy`, `Code quality and builds`, migration tests, secret scan and Netlify Deploy Preview.
- Conversations must be resolved.
- No direct pushes, force pushes or deletions on either long-lived branch.
- Production release PRs require the Owner/approved reviewer.

## GitHub Environments

The `staging` and `production` GitHub Environments were created on 2026-08-06. `staging` is remotely restricted to `develop`; `production` is remotely restricted to protected branches. Their secrets and Production reviewer still require manual configuration.

Staging secrets:

- `STAGING_SUPABASE_PROJECT_REF`
- `STAGING_SUPABASE_ACCESS_TOKEN`
- `STAGING_DATABASE_PASSWORD`
- `STAGING_NETLIFY_AUTH_TOKEN`
- `STAGING_ADMIN_SITE_ID`
- `STAGING_OPERATIONS_SITE_ID`
- `STAGING_STOREFRONT_SITE_ID`

Production secrets:

- `PRODUCTION_SUPABASE_PROJECT_REF`
- `PRODUCTION_SUPABASE_ACCESS_TOKEN`
- `PRODUCTION_DATABASE_PASSWORD`
- `PRODUCTION_NETLIFY_AUTH_TOKEN`
- `PRODUCTION_ADMIN_SITE_ID`
- `PRODUCTION_OPERATIONS_SITE_ID`
- `PRODUCTION_STOREFRONT_SITE_ID`

Add a second trusted maintainer before enabling the Production required reviewer. GitHub does not permit the deployment initiator to approve their own protected deployment.

## Protection settings

`main` and `develop` now block force push/deletion, enforce admins, require conversation resolution and require the six real GitHub CI checks emitted by this PR:

- `PR policy`
- `Code quality and builds`
- `Storefront quality and build`
- `Migration and database tests`
- `Secret scan`
- `Dependency review`

The obsolete `netlify/nexora-wholesale/deploy-preview` requirement was removed from `main` because the current Netlify site has Deploy Previews disabled. Remaining actions:

GitHub Dependency Graph, Secret Scanning and Push Protection are enabled for this public repository.

1. Configure a second trusted reviewer before requiring approvals; a repository owner cannot approve their own PR.
2. In **Settings → Environments → production**, add that maintainer as Required reviewer and disable administrator bypass if the plan/UI allows it.
3. Add the Environment secrets listed above; current remote audit found no repository, Staging or Production Action secrets.
4. Require the relevant Netlify Deploy Preview checks on `develop` only after dedicated Staging sites emit stable check names.
5. Keep approval count at zero until a second reviewer exists; otherwise the single owner can deadlock every PR.
