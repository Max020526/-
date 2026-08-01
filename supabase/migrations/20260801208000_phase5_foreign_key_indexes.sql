-- Phase 5 foreign-key coverage reported by the Supabase database advisor.
-- These indexes keep user/audit joins and parent-row updates predictable as data grows.

create index if not exists expenses_approved_by_idx
  on public.expenses (approved_by);
create index if not exists expenses_created_by_idx
  on public.expenses (created_by);
create index if not exists expenses_updated_by_idx
  on public.expenses (updated_by);

create index if not exists pos_sessions_opened_by_idx
  on public.pos_sessions (opened_by);

create index if not exists purchase_order_items_created_by_idx
  on public.purchase_order_items (created_by);

create index if not exists purchase_orders_approved_by_idx
  on public.purchase_orders (approved_by);
create index if not exists purchase_orders_created_by_idx
  on public.purchase_orders (created_by);
create index if not exists purchase_orders_updated_by_idx
  on public.purchase_orders (updated_by);

create index if not exists purchase_payments_created_by_idx
  on public.purchase_payments (created_by);

create index if not exists suppliers_updated_by_idx
  on public.suppliers (updated_by);
