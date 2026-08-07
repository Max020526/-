# Release checklist

## Pull Request / Preview

- [ ] Branch starts from current `develop` and uses an approved prefix.
- [ ] PR handles one task and includes migration/env impact.
- [ ] Install, lint, typecheck, tests and both application/Netlify builds pass.
- [ ] Full local migration replay, database lint and SQL tests pass.
- [ ] Secret scan and dependency review pass.
- [ ] If Deploy Preview is enabled, it uses Preview/Staging Supabase, never Production.
- [ ] If Deploy Preview is enabled, its banner and `noindex,nofollow,noarchive` are present.
- [ ] Desktop/mobile and refreshed deep links work.

## Staging

- [ ] `develop` deployed to the unified `nexora-wholesale-staging` site.
- [ ] Staging migration workflow succeeded.
- [ ] Staging Auth, Storage and redirect URLs are isolated.
- [ ] Owner/Admin/Warehouse Manager/Staff permissions checked.
- [ ] Complete `TEST-*` inbound → product completion → publish flow passed in the internal Staging system.
- [ ] Storefront/order acceptance remains deferred until the independent Storefront deployment is approved.
- [ ] Inventory increase/reservation/release/consume and audit logs verified.
- [ ] Test payment, email sandbox and logistics stubs confirmed.
- [ ] Test data cleanup does not touch Production.

## Production approval

- [ ] Release PR `develop → main` approved.
- [ ] CHANGELOG/version prepared.
- [ ] Migration drift resolved and dry-run reviewed.
- [ ] Destructive changes use Expand/Contract.
- [ ] Backup/PITR reference recorded.
- [ ] GitHub Production reviewer available.
- [ ] All Production Netlify variables point to Production services.

## Production release

- [ ] Database migration completed before frontend publishing.
- [ ] RLS/functions/Storage health checks passed.
- [ ] Admin deployed and login/permissions checked.
- [ ] Operations deployed and inventory reads checked.
- [ ] Storefront deployed and catalog/images/checkout checked.
- [ ] Monitoring/audit logs checked.
- [ ] Release tag created.
- [ ] Rollback deploy IDs recorded.
