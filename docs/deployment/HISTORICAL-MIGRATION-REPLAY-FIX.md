# Historical migration replay fix

## Root cause

`20260731201429_harden_and_complete_core.sql` unconditionally revoked EXECUTE on `public.rls_auto_enable()`. No NEXORA migration creates that function. It is a Supabase-hosted bootstrap event-trigger function: Production currently exposes it as `SECURITY DEFINER`, `search_path=pg_catalog`, and the `ensure_rls` event trigger calls it. A fresh local Supabase database does not guarantee that hosted bootstrap object exists, so replay stopped with SQLSTATE 42883 on migration 2.

No later NEXORA migration depends on calling `rls_auto_enable()`; the only Git reference was the REVOKE.

## Chosen fix

The historical hardening migration now checks `to_regprocedure('public.rls_auto_enable()')` and performs the REVOKE only when the platform object exists. This is option C: make the historical migration self-contained and idempotent without inventing a local copy of a platform-owned event trigger.

Creating a duplicate function was rejected because NEXORA does not own its lifecycle. Removing the hardening entirely was rejected because hosted projects should still revoke browser execution.

## Other replay-only corrections

The same controlled historical-replay rule is used where an earlier environment had optional legacy RPCs or Production-specific fixture data:

- optional legacy RPC revokes use `to_regprocedure`;
- the MAX repair migration records a NOTICE and exits when the Production account is absent;
- enum assignments use an explicit `public.product_status` cast;
- product-media migration uses the canonical generated storage path and `file_size_bytes`;
- storefront wrapper definitions are replayable before the later forward security reconciliation.

These edits repair a clean replay. They are not permission to re-run historical files remotely.

## Why historical edits are allowed here

The repository did not yet contain a reproducible baseline and its remote history timestamps do not match Git timestamps. The edits are narrowly limited to missing prerequisites, optional-object guards and SQL type/schema compatibility. Existing Production objects remain unchanged.

Because remote migration versions differ from Git, `db push` must remain frozen. Before any Production deployment, an approved baseline/reconciliation must prove object parity and decide how remote history will be aligned. This PR does not run `migration repair`.
