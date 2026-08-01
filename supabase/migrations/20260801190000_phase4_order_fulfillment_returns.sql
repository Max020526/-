-- NEXORA V1.0 Phase 4: order operations, fulfillment, returns and refunds.
--
-- The legacy order_status enum is retained as a compatibility projection for
-- older clients. lifecycle_status, payment_status and fulfillment_status are
-- the canonical, deliberately independent state machines used from Phase 4.

alter table public.orders
  add column if not exists lifecycle_status text not null default 'pending',
  add column if not exists fulfillment_status text not null default 'reserved',
  add column if not exists priority smallint not null default 0,
  add column if not exists confirmed_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists ready_pickup_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.orders set
  lifecycle_status = case status::text
    when 'PENDING_PAYMENT' then 'pending'
    when 'PAID' then 'confirmed'
    when 'PICKING' then 'processing'
    when 'PACKED' then 'processing'
    when 'READY_FOR_PICKUP' then 'processing'
    when 'SHIPPED' then 'processing'
    when 'COMPLETED' then 'completed'
    when 'CANCELLED' then 'cancelled'
    else lifecycle_status end,
  fulfillment_status = case status::text
    when 'PICKING' then 'picking'
    when 'PACKED' then 'packed'
    when 'READY_FOR_PICKUP' then 'ready_pickup'
    when 'SHIPPED' then 'shipped'
    when 'COMPLETED' then case when fulfillment_type='PICKUP' then 'picked_up' else 'delivered' end
    when 'CANCELLED' then 'unfulfilled'
    else coalesce(nullif(fulfillment_status,''),'reserved') end,
  payment_status = lower(payment_status);

alter table public.orders drop constraint if exists orders_lifecycle_status_check;
alter table public.orders add constraint orders_lifecycle_status_check check (
  lifecycle_status in ('draft','pending','confirmed','processing','completed','cancelled')
);
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (
  lower(payment_status) in ('unpaid','pending','paid','partially_refunded','refunded','failed')
);
alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check check (
  fulfillment_status in ('unfulfilled','reserved','picking','packed','shipped','ready_pickup','delivered','picked_up')
);
alter table public.orders drop constraint if exists orders_priority_check;
alter table public.orders add constraint orders_priority_check check (priority between 0 and 9);
create index if not exists orders_operations_queue_idx
  on public.orders(organization_id,lifecycle_status,fulfillment_status,priority desc,created_at);
create index if not exists orders_payment_queue_idx
  on public.orders(organization_id,payment_status,created_at);

create or replace function private.normalize_order_phase4_states()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.payment_status := lower(new.payment_status);
  if tg_op='INSERT' then
    new.lifecycle_status := coalesce(nullif(new.lifecycle_status,''),'pending');
    new.fulfillment_status := coalesce(nullif(new.fulfillment_status,''),'reserved');
  elsif new.status is distinct from old.status then
    new.lifecycle_status := case new.status::text
      when 'PENDING_PAYMENT' then 'pending'
      when 'PAID' then 'confirmed'
      when 'PICKING' then 'processing'
      when 'PACKED' then 'processing'
      when 'READY_FOR_PICKUP' then 'processing'
      when 'SHIPPED' then 'processing'
      when 'COMPLETED' then 'completed'
      when 'CANCELLED' then 'cancelled'
      else new.lifecycle_status end;
    new.fulfillment_status := case new.status::text
      when 'PICKING' then 'picking'
      when 'PACKED' then 'packed'
      when 'READY_FOR_PICKUP' then 'ready_pickup'
      when 'SHIPPED' then 'shipped'
      when 'COMPLETED' then case when new.fulfillment_type='PICKUP' then 'picked_up' else 'delivered' end
      when 'CANCELLED' then 'unfulfilled'
      else new.fulfillment_status end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.normalize_order_phase4_states() from public,anon,authenticated;
drop trigger if exists orders_phase4_state_normalization on public.orders;
create trigger orders_phase4_state_normalization
before insert or update of status,payment_status,lifecycle_status,fulfillment_status on public.orders
for each row execute function private.normalize_order_phase4_states();

alter table public.inventory
  add column if not exists quantity_quarantined integer not null default 0,
  add column if not exists quantity_damaged integer not null default 0;
alter table public.inventory drop constraint if exists inventory_quantity_quarantined_check;
alter table public.inventory add constraint inventory_quantity_quarantined_check check (quantity_quarantined>=0);
alter table public.inventory drop constraint if exists inventory_quantity_damaged_check;
alter table public.inventory add constraint inventory_quantity_damaged_check check (quantity_damaged>=0);

alter table public.inventory_movements
  add column if not exists balance_dimension text not null default 'on_hand',
  add column if not exists reserved_before integer,
  add column if not exists reserved_after integer,
  add column if not exists request_id uuid;
alter table public.inventory_movements drop constraint if exists inventory_movements_balance_dimension_check;
alter table public.inventory_movements add constraint inventory_movements_balance_dimension_check check (
  balance_dimension in ('on_hand','reserved','quarantine','damaged','write_off')
);
create unique index if not exists inventory_movements_request_reference_unique_idx
  on public.inventory_movements(request_id,reference_type,reference_id,variant_id,balance_dimension)
  where request_id is not null;

alter table public.payments
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists currency text not null default 'EUR',
  add column if not exists payment_method text not null default 'manual',
  add column if not exists refunded_amount numeric(12,2) not null default 0,
  add column if not exists idempotency_key text,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();
update public.payments payment set organization_id=orders.organization_id,status=lower(payment.status)
from public.orders orders where orders.id=payment.order_id;
alter table public.payments alter column organization_id set not null;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (
  status in ('pending','authorized','paid','partially_refunded','refunded','failed','cancelled')
);
alter table public.payments drop constraint if exists payments_refunded_amount_check;
alter table public.payments add constraint payments_refunded_amount_check check (
  refunded_amount>=0 and refunded_amount<=amount
);
create unique index if not exists payments_provider_reference_unique_idx
  on public.payments(provider,provider_reference) where provider_reference is not null;
create unique index if not exists payments_idempotency_unique_idx
  on public.payments(organization_id,idempotency_key) where idempotency_key is not null;
create index if not exists payments_organization_order_idx on public.payments(organization_id,order_id,created_at);
drop trigger if exists payments_updated on public.payments;
create trigger payments_updated before update on public.payments
for each row execute function private.set_updated_at();

alter table public.shipments
  drop constraint if exists shipments_order_id_key;
alter table public.shipments
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists warehouse_id uuid references public.warehouses(id) on delete restrict,
  add column if not exists fulfillment_method text not null default 'DELIVERY',
  add column if not exists pickup_code_hash text,
  add column if not exists ready_at timestamptz,
  add column if not exists packed_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists notified_at timestamptz,
  add column if not exists packed_by uuid references public.profiles(id) on delete set null,
  add column if not exists shipped_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists notes text,
  add column if not exists idempotency_key text,
  add column if not exists updated_at timestamptz not null default now();
update public.shipments shipment set organization_id=orders.organization_id,
  warehouse_id=(select item.warehouse_id from public.order_items item where item.order_id=shipment.order_id limit 1),
  fulfillment_method=orders.fulfillment_type,status=lower(shipment.status)
from public.orders orders where orders.id=shipment.order_id;
alter table public.shipments alter column organization_id set not null;
alter table public.shipments alter column warehouse_id set not null;
alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipments add constraint shipments_status_check check (
  status in ('pending','picking','packed','ready_pickup','shipped','delivered','picked_up','cancelled','exception')
);
alter table public.shipments drop constraint if exists shipments_fulfillment_method_check;
alter table public.shipments add constraint shipments_fulfillment_method_check check (fulfillment_method in ('DELIVERY','PICKUP'));
create unique index if not exists shipments_order_active_unique_idx
  on public.shipments(order_id) where status not in ('cancelled');
create unique index if not exists shipments_idempotency_unique_idx
  on public.shipments(organization_id,idempotency_key) where idempotency_key is not null;
create index if not exists shipments_fulfillment_queue_idx
  on public.shipments(organization_id,warehouse_id,status,created_at);
drop trigger if exists shipments_updated on public.shipments;
create trigger shipments_updated before update on public.shipments
for each row execute function private.set_updated_at();

create table if not exists public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check(quantity>0),
  picked_quantity integer not null default 0 check(picked_quantity>=0),
  verified_quantity integer not null default 0 check(verified_quantity>=0),
  picked_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  picked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shipment_id,order_item_id),
  check(picked_quantity<=quantity and verified_quantity<=quantity)
);
create index if not exists shipment_items_order_item_idx on public.shipment_items(order_item_id);
drop trigger if exists shipment_items_updated on public.shipment_items;
create trigger shipment_items_updated before update on public.shipment_items
for each row execute function private.set_updated_at();

create table if not exists public.fulfillment_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  shipment_id uuid references public.shipments(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  exception_type text not null check(exception_type in ('shortage','wrong_item','damaged','not_found','scan_mismatch','other')),
  status text not null default 'open' check(status in ('open','resolved','cancelled')),
  quantity integer check(quantity is null or quantity>0),
  notes text not null,
  resolution text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists fulfillment_exceptions_queue_idx
  on public.fulfillment_exceptions(organization_id,status,created_at);
create index if not exists fulfillment_exceptions_order_idx on public.fulfillment_exceptions(order_id);
drop trigger if exists fulfillment_exceptions_updated on public.fulfillment_exceptions;
create trigger fulfillment_exceptions_updated before update on public.fulfillment_exceptions
for each row execute function private.set_updated_at();

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null,
  public_message_zh text,
  internal_data jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  request_id uuid,
  occurred_at timestamptz not null default now()
);
create index if not exists order_events_timeline_idx on public.order_events(order_id,occurred_at,id);
create unique index if not exists order_events_request_type_unique_idx
  on public.order_events(request_id,event_type) where request_id is not null;

create table if not exists public.order_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  note_type text not null default 'internal' check(note_type in ('internal','customer_contact')),
  content text not null check(length(trim(content)) between 1 and 2000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists order_notes_order_idx on public.order_notes(order_id,created_at);

alter table public.returns
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists return_no text,
  add column if not exists request_id uuid,
  add column if not exists idempotency_key text,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists received_by uuid references public.profiles(id) on delete set null,
  add column if not exists inspected_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists inspected_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists customer_note text,
  add column if not exists updated_at timestamptz not null default now();
update public.returns return_record set organization_id=orders.organization_id,
  status=lower(return_record.status),return_no=coalesce(return_record.return_no,'RET-'||replace(return_record.id::text,'-',''))
from public.orders orders where orders.id=return_record.order_id;
alter table public.returns alter column organization_id set not null;
alter table public.returns alter column return_no set not null;
alter table public.returns alter column status set default 'requested';
alter table public.returns drop constraint if exists returns_status_check;
alter table public.returns add constraint returns_status_check check (
  status in ('requested','approved','received','inspected','refund_pending','completed','rejected')
);
create unique index if not exists returns_return_no_unique_idx on public.returns(return_no);
create unique index if not exists returns_idempotency_unique_idx
  on public.returns(organization_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists returns_request_id_unique_idx on public.returns(request_id) where request_id is not null;
create index if not exists returns_operations_queue_idx on public.returns(organization_id,status,created_at);
drop trigger if exists returns_updated on public.returns;
create trigger returns_updated before update on public.returns
for each row execute function private.set_updated_at();

create sequence if not exists public.return_number_sequence;
revoke all on sequence public.return_number_sequence from public,anon,authenticated;

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  return_id uuid not null references public.returns(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity integer not null check(quantity>0),
  reason text not null,
  item_condition text check(item_condition in ('unopened','good','worn','damaged','wrong_item','unknown')),
  disposition text check(disposition in ('restockable','quarantine','damaged','write_off')),
  inspection_notes text,
  media_paths jsonb not null default '[]'::jsonb,
  inventory_posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(return_id,order_item_id),
  check(jsonb_typeof(media_paths)='array')
);
create index if not exists return_items_order_item_idx on public.return_items(order_item_id);
create index if not exists return_items_variant_idx on public.return_items(variant_id);
drop trigger if exists return_items_updated on public.return_items;
create trigger return_items_updated before update on public.return_items
for each row execute function private.set_updated_at();

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  return_id uuid references public.returns(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0),
  currency text not null default 'EUR' check(currency~'^[A-Z]{3}$'),
  status text not null default 'pending' check(status in ('pending','processing','succeeded','failed','cancelled')),
  adapter text not null default 'manual',
  provider_reference text,
  idempotency_key text not null,
  reason text not null,
  requested_by uuid references public.profiles(id) on delete set null,
  processed_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create unique index if not exists refunds_provider_reference_unique_idx
  on public.refunds(adapter,provider_reference) where provider_reference is not null;
create index if not exists refunds_order_idx on public.refunds(order_id,created_at);
create index if not exists refunds_return_idx on public.refunds(return_id) where return_id is not null;
drop trigger if exists refunds_updated on public.refunds;
create trigger refunds_updated before update on public.refunds
for each row execute function private.set_updated_at();

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0 check(attempts>=0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index if not exists outbox_events_delivery_idx on public.outbox_events(status,available_at,created_at);

create table if not exists private.business_command_results (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null,
  command_type text not null,
  aggregate_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  request_id uuid not null default gen_random_uuid(),
  result jsonb,
  created_at timestamptz not null default now(),
  primary key(organization_id,idempotency_key,command_type)
);
revoke all on private.business_command_results from public,anon,authenticated,service_role;

insert into public.permissions(code,module,action,description) values
  ('orders.read','orders','read','查看订单、付款与时间线'),
  ('orders.manage','orders','manage','确认订单、备注和受控状态转换'),
  ('orders.cancel','orders','cancel','取消未履约订单并释放库存'),
  ('payments.manage','payments','manage','核验内部付款状态'),
  ('fulfillment.read','fulfillment','read','查看拣货、打包和发货队列'),
  ('fulfillment.manage','fulfillment','manage','执行拣货、打包、发货和自提'),
  ('returns.read','returns','read','查看退货与质检记录'),
  ('returns.manage','returns','manage','审核、收货和质检退货'),
  ('refunds.manage','refunds','manage','创建和确认内部退款记录')
on conflict(code) do update set module=excluded.module,action=excluded.action,description=excluded.description,updated_at=now();

with grants(role_code,permission_code) as (values
  ('system_admin','orders.read'),('system_admin','orders.manage'),('system_admin','orders.cancel'),('system_admin','payments.manage'),
  ('system_admin','fulfillment.read'),('system_admin','fulfillment.manage'),('system_admin','returns.read'),('system_admin','returns.manage'),('system_admin','refunds.manage'),
  ('order_cs','orders.read'),('order_cs','orders.manage'),('order_cs','orders.cancel'),('order_cs','payments.manage'),
  ('order_cs','fulfillment.read'),('order_cs','returns.read'),('order_cs','returns.manage'),
  ('warehouse_manager','orders.read'),('warehouse_manager','fulfillment.read'),('warehouse_manager','fulfillment.manage'),
  ('warehouse_manager','returns.read'),('warehouse_manager','returns.manage'),
  ('warehouse_staff','orders.read'),('warehouse_staff','fulfillment.read'),('warehouse_staff','fulfillment.manage'),
  ('warehouse_staff','returns.read'),
  ('finance','orders.read'),('finance','returns.read'),('finance','refunds.manage')
)
insert into public.role_permissions(role_id,permission_id)
select role.id,permission.id from grants
join public.roles role on role.code=grants.role_code
join public.permissions permission on permission.code=grants.permission_code
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select role.id,permission.id from public.roles role cross join public.permissions permission
where role.code='owner' and permission.module in ('orders','payments','fulfillment','returns','refunds')
on conflict do nothing;

do $$ declare table_name_value text; begin
  foreach table_name_value in array array[
    'shipment_items','fulfillment_exceptions','order_events','order_notes','return_items','refunds','outbox_events'
  ] loop
    execute format('alter table public.%I enable row level security',table_name_value);
    execute format('drop policy if exists organization_isolation_%1$s on public.%1$I',table_name_value);
    execute format('create policy organization_isolation_%1$s on public.%1$I as restrictive for all to authenticated using (organization_id=(select private.current_organization_id())) with check (organization_id=(select private.current_organization_id()))',table_name_value);
  end loop;
end $$;

do $$ declare table_name_value text; begin
  foreach table_name_value in array array['orders','payments','shipments','returns'] loop
    execute format('alter table public.%I enable row level security',table_name_value);
    execute format('drop policy if exists phase4_organization_isolation_%1$s on public.%1$I',table_name_value);
    execute format('create policy phase4_organization_isolation_%1$s on public.%1$I as restrictive for all to authenticated using (organization_id=(select private.current_organization_id())) with check (organization_id=(select private.current_organization_id()))',table_name_value);
  end loop;
end $$;

drop policy if exists phase4_staff_read_shipments on public.shipments;
create policy phase4_staff_read_shipments on public.shipments for select to authenticated
using((select private.has_permission('fulfillment.read')));
drop policy if exists phase4_staff_read_shipment_items on public.shipment_items;
create policy phase4_staff_read_shipment_items on public.shipment_items for select to authenticated
using((select private.has_permission('fulfillment.read')));
drop policy if exists phase4_staff_read_exceptions on public.fulfillment_exceptions;
create policy phase4_staff_read_exceptions on public.fulfillment_exceptions for select to authenticated
using((select private.has_permission('fulfillment.read')));
drop policy if exists phase4_order_events_read on public.order_events;
create policy phase4_order_events_read on public.order_events for select to authenticated using(
  (select private.has_permission('orders.read')) or exists(
    select 1 from public.orders where orders.id=order_events.order_id and orders.customer_id=(select auth.uid())
  )
);
drop policy if exists phase4_staff_read_notes on public.order_notes;
create policy phase4_staff_read_notes on public.order_notes for select to authenticated
using((select private.has_permission('orders.read')));
drop policy if exists phase4_returns_read on public.returns;
create policy phase4_returns_read on public.returns for select to authenticated using(
  (select private.has_permission('returns.read')) or exists(
    select 1 from public.orders where orders.id=returns.order_id and orders.customer_id=(select auth.uid())
  )
);
drop policy if exists phase4_return_items_read on public.return_items;
create policy phase4_return_items_read on public.return_items for select to authenticated using(
  (select private.has_permission('returns.read')) or exists(
    select 1 from public.returns return_record join public.orders orders on orders.id=return_record.order_id
    where return_record.id=return_items.return_id and orders.customer_id=(select auth.uid())
  )
);
drop policy if exists phase4_refunds_read on public.refunds;
create policy phase4_refunds_read on public.refunds for select to authenticated using(
  (select private.has_permission('returns.read')) or exists(
    select 1 from public.orders where orders.id=refunds.order_id and orders.customer_id=(select auth.uid())
  )
);
drop policy if exists phase4_outbox_admin_read on public.outbox_events;
create policy phase4_outbox_admin_read on public.outbox_events for select to authenticated
using((select private.has_permission('audit.read')));

revoke insert,update,delete,truncate on public.orders,public.order_items,public.payments,public.shipments,
  public.returns,public.shipment_items,public.fulfillment_exceptions,public.order_events,public.order_notes,
  public.return_items,public.refunds,public.outbox_events from anon,authenticated;
grant select on public.orders,public.order_items,public.payments,public.shipments,public.returns,
  public.shipment_items,public.fulfillment_exceptions,public.order_events,public.order_notes,
  public.return_items,public.refunds to authenticated;

notify pgrst,'reload schema';
