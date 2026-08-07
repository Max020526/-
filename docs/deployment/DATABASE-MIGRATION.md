# Database migration policy

## Create and test

1. Start from current `develop` and create a short-lived branch.
2. Run `supabase --help` and `supabase migration new <description>`; do not invent a migration filename.
3. Develop against local Supabase only.
4. Run `supabase db reset` to replay the full history.
5. Run `supabase db lint --local --level error` and `supabase test db`.
6. Review RLS, grants, `security_invoker` views and every `security definer` function.
7. Commit the new migration; never modify or delete a migration already applied remotely.

## Staging

Merging to `develop` triggers `.github/workflows/staging-database.yml`. It links only to the secrets in the GitHub `staging` environment, runs a dry-run, applies pending migrations and lists the resulting history. It does not run Staging seed automatically.

After migration, validate Auth, RLS, RPCs, Storage and a complete inbound-to-publish flow with `TEST-*` records.

## Production

Production migration is manual, protected by the GitHub `production` environment and requires:

- workflow execution from `main`;
- exact confirmation phrase;
- recorded backup/PITR reference;
- Production-only credentials;
- successful dry-run before apply.

The workflow deliberately excludes all seed files.

## Destructive changes

Use Expand and Contract:

1. Add the new structure without removing the old one.
2. Release code that understands both structures.
3. Backfill in bounded, observable batches.
4. Verify reads/writes and rollback compatibility.
5. Remove the old structure in a later release.

Each destructive migration must state lock risk, data-loss risk, backup, rollback/forward-fix and previous-frontend compatibility in the PR.

## Drift response

The audit found remote migration-history drift. Before any new remote migration:

1. Export only migration version/name/checksum metadata from Git, Staging and Production.
2. Identify Dashboard changes and remote-only migration records.
3. Pull legitimate schema drift into a new migration.
4. Use `migration repair` only after human review; it changes history, not schema.
5. Prove a fresh local `db reset` and a disposable Staging rebuild before Production.

Never “fix” drift by editing old SQL or resetting Production.
