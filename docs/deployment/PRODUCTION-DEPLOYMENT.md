# Production deployment

## Release prerequisites

- Staging Admin, Operations and Storefront are deployed from `develop`.
- Staging UAT and security tests are signed off.
- `develop → main` Release PR is reviewed and all checks pass.
- Migration drift is resolved and the migration plan is understood.
- Production backup/PITR is healthy and a backup reference is recorded.
- Netlify Production variables point only to Production Supabase.
- Payment, email and logistics modes have been reviewed.

## Ordered release

1. Freeze the release candidate and update CHANGELOG/release notes.
2. Merge the approved Release PR to `main`.
3. Keep Netlify Production auto-publish locked.
4. Dispatch `Deploy Production Database` from `main`.
5. A required GitHub `production` reviewer validates the backup reference and approves.
6. Review the dry-run and apply pending migrations.
7. Run RLS/function/Storage health checks.
8. Publish Production Admin.
9. Verify Owner login, permissions and dashboards.
10. Publish Production Operations.
11. Verify warehouse selection, quick inbound and inventory reads.
12. Publish Production Storefront.
13. Verify catalog, images, checkout in the approved live/test mode and stock reservation.
14. Confirm error monitoring and audit logs.
15. Create a GitHub Release and semantic tag (`v1.0.0`, `v1.0.1`, etc.).

## Stop conditions

Stop and do not publish remaining frontends when migration dry-run differs from the reviewed plan, a migration fails, RLS checks fail, the wrong Supabase ref is detected, inventory changes unexpectedly, or backup status is uncertain.

## Hotfix

Create `hotfix/<description>` from `main`, open a PR to `main`, run all checks, deploy through the same protected process, then back-merge the hotfix to `develop`.
