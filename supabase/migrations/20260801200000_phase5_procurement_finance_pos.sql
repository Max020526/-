-- NEXORA V1.0 Phase 5: procurement, management ledger and POS foundation.
-- This migration extends the canonical product/order/inventory model; it does not create parallel stock.

alter table public.suppliers add column if not exists vat_number text;
alter table public.suppliers add column if not exists payment_terms_days integer not null default 0 check(payment_terms_days between 0 and 3650);
alter table public.suppliers add column if not exists lead_time_days integer not null default 0 check(lead_time_days between 0 and 3650);
alter table public.suppliers add column if not exists currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$');
alter table public.suppliers add column if not exists updated_by uuid references public.profiles(id) on delete set null;
alter table public.suppliers add column if not exists archived_at timestamptz;

alter table public.warehouses add column if not exists location_type text not null default 'warehouse'
  check(location_type in ('warehouse','store','hybrid'));
alter table public.warehouses add column if not exists updated_at timestamptz not null default now();

alter table public.inventory add column if not exists average_unit_cost numeric(12,2) not null default 0 check(average_unit_cost>=0);
alter table public.inventory_movements add column if not exists unit_cost_snapshot numeric(12,2) check(unit_cost_snapshot>=0);
alter table public.order_items add column if not exists unit_cost_snapshot numeric(12,2) not null default 0 check(unit_cost_snapshot>=0);
alter table public.order_items add column if not exists cogs_amount numeric(12,2) not null default 0 check(cogs_amount>=0);
alter table public.order_items add column if not exists gross_profit_amount numeric(12,2) not null default 0;

do $$ begin
  alter type public.movement_type add value if not exists 'POS_SALE';
exception when duplicate_object then null; end $$;

create table if not exists private.document_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null,
  business_date date not null,
  next_value integer not null default 1 check(next_value>0),
  primary key(organization_id,document_type,business_date)
);
revoke all on private.document_counters from public,anon,authenticated,service_role;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_order_no text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  supplier_reference text,
  status text not null default 'draft' check(status in ('draft','approved','ordered','partially_received','received','cancelled')),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  expected_delivery_date date,
  net_amount numeric(12,2) not null default 0 check(net_amount>=0),
  tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
  total_amount numeric(12,2) not null default 0 check(total_amount>=0),
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  ordered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,purchase_order_no)
);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders(supplier_id);
create index if not exists purchase_orders_warehouse_idx on public.purchase_orders(warehouse_id);
create index if not exists purchase_orders_status_date_idx on public.purchase_orders(organization_id,status,created_at desc);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  ordered_quantity integer not null check(ordered_quantity>0 and ordered_quantity<=999999),
  received_quantity integer not null default 0 check(received_quantity>=0),
  unit_cost numeric(12,2) not null check(unit_cost>=0),
  tax_rate numeric(5,2) not null default 22 check(tax_rate between 0 and 100),
  line_net numeric(12,2) not null check(line_net>=0),
  line_tax numeric(12,2) not null check(line_tax>=0),
  line_total numeric(12,2) not null check(line_total>=0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(purchase_order_id,variant_id),
  check(received_quantity<=ordered_quantity)
);
create index if not exists purchase_order_items_variant_idx on public.purchase_order_items(variant_id);
create index if not exists purchase_order_items_organization_idx on public.purchase_order_items(organization_id);

alter table public.stock_receipts add column if not exists purchase_order_id uuid references public.purchase_orders(id) on delete restrict;
alter table public.stock_receipt_items add column if not exists purchase_order_item_id uuid references public.purchase_order_items(id) on delete restrict;
create index if not exists stock_receipts_purchase_order_idx on public.stock_receipts(purchase_order_id);
create index if not exists stock_receipt_items_purchase_item_idx on public.stock_receipt_items(purchase_order_item_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  expense_no text not null,
  category text not null,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','submitted','approved','paid','rejected','cancelled')),
  net_amount numeric(12,2) not null check(net_amount>=0),
  tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
  total_amount numeric(12,2) not null check(total_amount>0),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  expense_date date not null,
  description text not null,
  attachment_path text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,expense_no),
  check(total_amount=net_amount+tax_amount)
);
create index if not exists expenses_status_date_idx on public.expenses(organization_id,status,expense_date desc);
create index if not exists expenses_supplier_idx on public.expenses(supplier_id);

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  payment_method text not null check(payment_method in ('cash','bank_transfer','card','other')),
  provider_reference text,
  status text not null default 'completed' check(status in ('pending','completed','failed','reversed')),
  idempotency_key text not null,
  paid_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index if not exists purchase_payments_purchase_idx on public.purchase_payments(purchase_order_id);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_type text not null check(source_type in ('order_payment','refund','pos_sale','purchase_payment','expense','cash_variance','adjustment')),
  source_id uuid not null,
  source_no text,
  entry_type text not null check(entry_type in ('sale_income','refund_outflow','pos_income','purchase_outflow','expense_outflow','cash_variance','reversal','adjustment')),
  direction text not null check(direction in ('inflow','outflow')),
  status text not null default 'posted' check(status in ('posted','reversed')),
  amount numeric(12,2) not null check(amount>0),
  tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  occurred_at timestamptz not null,
  channel_id uuid references public.channels(id) on delete restrict,
  location_id uuid references public.warehouses(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  reversal_of uuid references public.financial_entries(id) on delete restrict,
  idempotency_key text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index if not exists financial_entries_period_idx on public.financial_entries(organization_id,occurred_at desc);
create index if not exists financial_entries_source_idx on public.financial_entries(source_type,source_id);
create index if not exists financial_entries_channel_idx on public.financial_entries(channel_id);
create index if not exists financial_entries_location_idx on public.financial_entries(location_id);
create index if not exists financial_entries_actor_idx on public.financial_entries(actor_id);
create index if not exists financial_entries_reversal_idx on public.financial_entries(reversal_of);

create table if not exists public.pos_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  session_no text not null,
  status text not null default 'open' check(status in ('open','closed','cancelled')),
  opening_cash numeric(12,2) not null check(opening_cash>=0),
  cash_sales numeric(12,2) not null default 0 check(cash_sales>=0),
  non_cash_sales numeric(12,2) not null default 0 check(non_cash_sales>=0),
  cash_in numeric(12,2) not null default 0 check(cash_in>=0),
  cash_out numeric(12,2) not null default 0 check(cash_out>=0),
  expected_cash numeric(12,2),
  closing_cash numeric(12,2) check(closing_cash>=0),
  cash_difference numeric(12,2),
  difference_reason text,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  closed_by uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,session_no)
);
create unique index if not exists pos_sessions_one_open_per_user on public.pos_sessions(organization_id,opened_by) where status='open';
create index if not exists pos_sessions_warehouse_idx on public.pos_sessions(warehouse_id,opened_at desc);
create index if not exists pos_sessions_closed_by_idx on public.pos_sessions(closed_by);

alter table public.orders add column if not exists pos_session_id uuid references public.pos_sessions(id) on delete restrict;
create index if not exists orders_pos_session_idx on public.orders(pos_session_id);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  pos_session_id uuid not null references public.pos_sessions(id) on delete restrict,
  movement_type text not null check(movement_type in ('opening','cash_in','cash_out','cash_sale','closing','variance')),
  amount numeric(12,2) not null check(amount>=0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists cash_movements_session_idx on public.cash_movements(pos_session_id,created_at);
create index if not exists cash_movements_organization_idx on public.cash_movements(organization_id);
create index if not exists cash_movements_created_by_idx on public.cash_movements(created_by);

insert into public.permissions(code,description,module,action) values
  ('purchase.read','查看采购单与采购差异','purchase','read'),
  ('purchase.manage','创建与维护采购单','purchase','manage'),
  ('purchase.approve','审批并下达采购单','purchase','approve'),
  ('purchase.receive','按采购单确认部分收货','purchase','receive'),
  ('finance.read','查看经营财务与成本','finance','read'),
  ('finance.manage','创建费用与采购付款','finance','manage'),
  ('finance.approve','审批费用与冲正分录','finance','approve'),
  ('finance.export','导出经营财务数据','finance','export'),
  ('dashboard.owner.read','查看老板经营指标','dashboard','read'),
  ('pos.use','使用 POS 开班与销售','pos','use'),
  ('pos.manage','管理 POS 班次与差异','pos','manage')
on conflict(code) do update set description=excluded.description,module=excluded.module,action=excluded.action,updated_at=now();

insert into public.roles(organization_id,name,code,display_name_zh,description,is_system)
select id,'AUDITOR','auditor','审计员','只读经营财务与审计记录',true from public.organizations
on conflict(organization_id,code) do update set display_name_zh=excluded.display_name_zh,description=excluded.description,updated_at=now();

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
  r.code in ('owner','system_admin') or
  (r.code='buyer' and p.code in ('purchase.read','purchase.manage','purchase.approve','suppliers.read','suppliers.manage')) or
  (r.code='warehouse_manager' and p.code in ('purchase.read','purchase.receive','pos.use','pos.manage')) or
  (r.code='warehouse_staff' and p.code in ('purchase.read')) or
  (r.code='finance' and p.code in ('purchase.read','finance.read','finance.manage','finance.approve','finance.export','dashboard.owner.read')) or
  (r.code='cashier' and p.code in ('pos.use')) or
  (r.code='auditor' and p.code in ('finance.read','finance.export','dashboard.owner.read','audit.read'))
on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['purchase_orders','purchase_order_items','expenses','purchase_payments','financial_entries','pos_sessions','cash_movements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I','organization_isolation_'||t,t);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using (organization_id=(select private.current_organization_id())) with check (organization_id=(select private.current_organization_id()))','organization_isolation_'||t,t);
  end loop;
end $$;

create policy purchase_orders_read on public.purchase_orders for select to authenticated using(private.has_permission('purchase.read'));
create policy purchase_order_items_read on public.purchase_order_items for select to authenticated using(private.has_permission('purchase.read'));
create policy expenses_read on public.expenses for select to authenticated using(private.has_permission('finance.read'));
create policy purchase_payments_read on public.purchase_payments for select to authenticated using(private.has_permission('finance.read'));
create policy financial_entries_read on public.financial_entries for select to authenticated using(private.has_permission('finance.read') or private.has_permission('dashboard.owner.read'));
create policy pos_sessions_read on public.pos_sessions for select to authenticated using(private.has_permission('pos.use') or private.has_permission('pos.manage'));
create policy cash_movements_read on public.cash_movements for select to authenticated using(private.has_permission('pos.use') or private.has_permission('pos.manage'));

revoke all on public.purchase_orders,public.purchase_order_items,public.expenses,public.purchase_payments,public.financial_entries,public.pos_sessions,public.cash_movements from public,anon,authenticated;
grant select on public.purchase_orders,public.purchase_order_items,public.expenses,public.purchase_payments,public.financial_entries,public.pos_sessions,public.cash_movements to authenticated;
grant all on public.purchase_orders,public.purchase_order_items,public.expenses,public.purchase_payments,public.financial_entries,public.pos_sessions,public.cash_movements to service_role;

create or replace function private.prevent_immutable_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception '已确认的业务流水不可修改或删除，请使用冲正流程'; end; $$;
revoke all on function private.prevent_immutable_change() from public,anon,authenticated,service_role;
drop trigger if exists financial_entries_immutable on public.financial_entries;
create trigger financial_entries_immutable before update or delete on public.financial_entries for each row execute function private.prevent_immutable_change();
drop trigger if exists cash_movements_immutable on public.cash_movements;
create trigger cash_movements_immutable before update or delete on public.cash_movements for each row execute function private.prevent_immutable_change();

drop trigger if exists purchase_orders_updated on public.purchase_orders;
create trigger purchase_orders_updated before update on public.purchase_orders for each row execute function private.set_updated_at();
drop trigger if exists purchase_order_items_updated on public.purchase_order_items;
create trigger purchase_order_items_updated before update on public.purchase_order_items for each row execute function private.set_updated_at();
drop trigger if exists expenses_updated on public.expenses;
create trigger expenses_updated before update on public.expenses for each row execute function private.set_updated_at();
drop trigger if exists pos_sessions_updated on public.pos_sessions;
create trigger pos_sessions_updated before update on public.pos_sessions for each row execute function private.set_updated_at();
