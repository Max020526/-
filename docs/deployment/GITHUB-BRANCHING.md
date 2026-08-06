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

The `staging` and `production` GitHub Environments were created on 2026-08-06. Their secrets and deployment restrictions still require manual configuration.

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

Set a required reviewer and prevent self-review on `production`. Restrict deployment branches to `main`; restrict `staging` to `develop`.

## Protection settings

Existing `main` protection blocks force push/deletion, enforces admins and requires conversation resolution. `develop` now has the same destructive-operation protections and requires the six GitHub CI checks emitted by this PR. Remaining actions:

GitHub Dependency Graph, Secret Scanning and Push Protection are enabled for this public repository.

1. Configure a second trusted reviewer before requiring approvals; a repository owner cannot approve their own PR.
2. Add a required reviewer and `main` deployment-branch restriction to the `production` Environment.
3. Restrict the `staging` Environment to `develop`.
4. Replace the obsolete main Netlify check only after the new production sites are Git-connected.
5. Require the relevant Netlify Deploy Preview checks on `develop` after the three Staging sites are enabled.
