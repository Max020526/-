# Rollback and recovery

## Frontend rollback

1. Stop further publishes.
2. In each affected Netlify Production site, identify the last verified deploy.
3. Restore Admin, Operations and Storefront independently as needed.
4. Run login, catalog, inventory and checkout health checks.
5. Open a `hotfix/*` PR and record the incident.

Do not rebuild an old commit with new environment variables and call it a rollback; restore the exact verified deploy first.

## Database recovery

Database rollback is not equivalent to frontend rollback. Choose one:

- backward-compatible frontend rollback when the migration is additive;
- forward-fix migration when data has already been written to the new structure;
- reviewed down migration only when explicitly designed and tested;
- point-in-time recovery for severe corruption, followed by reconciliation of external events.

Before recovery, capture migration history, logs, affected row counts and the time window. Never run a destructive command against an unresolved project ref.

## Expand/Contract compatibility

- Expansion releases must keep the previous frontend working.
- Backfill jobs must be idempotent and observable.
- Contract/removal waits at least one subsequent verified release.
- RLS and RPC compatibility is part of rollback testing.

## Required evidence

- Incident start/end time and owner.
- Netlify deploy IDs before/after rollback.
- Supabase project/environment and backup reference.
- Data reconciliation result.
- Root cause, preventive action and linked hotfix PR.
