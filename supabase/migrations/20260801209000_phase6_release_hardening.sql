-- Phase 6 release hardening: make append-only ledgers immutable at the database boundary.
-- This migration is intentionally committed for review; apply it only through the release runbook.

begin;

revoke insert, update, delete, truncate on table public.audit_logs from anon, authenticated;
revoke insert, update, delete, truncate on table public.inventory_movements from anon, authenticated;
revoke update, delete, truncate on table public.audit_logs from service_role;
revoke update, delete, truncate on table public.inventory_movements from service_role;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable
before update or delete on public.audit_logs
for each row execute function private.prevent_immutable_change();

drop trigger if exists inventory_movements_immutable on public.inventory_movements;
create trigger inventory_movements_immutable
before update or delete on public.inventory_movements
for each row execute function private.prevent_immutable_change();

comment on trigger audit_logs_immutable on public.audit_logs is
  'Phase 6: audit records are append-only; corrections require a compensating audit record.';
comment on trigger inventory_movements_immutable on public.inventory_movements is
  'Phase 6: inventory ledger is append-only; corrections require reversal or adjustment movements.';

commit;
