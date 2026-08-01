-- Phase 4 FK coverage and duplicate-policy cleanup reported by Supabase Advisor.
create index if not exists orders_updated_by_idx on public.orders(updated_by) where updated_by is not null;
create index if not exists payments_verified_by_idx on public.payments(verified_by) where verified_by is not null;
create index if not exists shipments_organization_idx on public.shipments(organization_id);
create index if not exists shipments_warehouse_idx on public.shipments(warehouse_id);
create index if not exists shipments_packed_by_idx on public.shipments(packed_by) where packed_by is not null;
create index if not exists shipments_shipped_by_idx on public.shipments(shipped_by) where shipped_by is not null;
create index if not exists shipments_completed_by_idx on public.shipments(completed_by) where completed_by is not null;
create index if not exists shipment_items_organization_idx on public.shipment_items(organization_id);
create index if not exists shipment_items_picked_by_idx on public.shipment_items(picked_by) where picked_by is not null;
create index if not exists shipment_items_verified_by_idx on public.shipment_items(verified_by) where verified_by is not null;
create index if not exists fulfillment_exceptions_organization_idx on public.fulfillment_exceptions(organization_id);
create index if not exists fulfillment_exceptions_shipment_idx on public.fulfillment_exceptions(shipment_id) where shipment_id is not null;
create index if not exists fulfillment_exceptions_order_item_idx on public.fulfillment_exceptions(order_item_id) where order_item_id is not null;
create index if not exists fulfillment_exceptions_created_by_idx on public.fulfillment_exceptions(created_by);
create index if not exists fulfillment_exceptions_resolved_by_idx on public.fulfillment_exceptions(resolved_by) where resolved_by is not null;
create index if not exists order_events_organization_idx on public.order_events(organization_id);
create index if not exists order_events_actor_idx on public.order_events(actor_id) where actor_id is not null;
create index if not exists order_notes_organization_idx on public.order_notes(organization_id);
create index if not exists order_notes_created_by_idx on public.order_notes(created_by);
create index if not exists returns_organization_idx on public.returns(organization_id);
create index if not exists returns_approved_by_idx on public.returns(approved_by) where approved_by is not null;
create index if not exists returns_received_by_idx on public.returns(received_by) where received_by is not null;
create index if not exists returns_inspected_by_idx on public.returns(inspected_by) where inspected_by is not null;
create index if not exists return_items_organization_idx on public.return_items(organization_id);
create index if not exists return_items_warehouse_idx on public.return_items(warehouse_id);
create index if not exists refunds_organization_idx on public.refunds(organization_id);
create index if not exists refunds_payment_idx on public.refunds(payment_id) where payment_id is not null;
create index if not exists refunds_requested_by_idx on public.refunds(requested_by) where requested_by is not null;
create index if not exists refunds_processed_by_idx on public.refunds(processed_by) where processed_by is not null;
create index if not exists outbox_events_organization_idx on public.outbox_events(organization_id);
create index if not exists business_command_results_actor_idx on private.business_command_results(actor_id) where actor_id is not null;

drop policy if exists staff_select_shipments on public.shipments;
drop policy if exists staff_select_returns on public.returns;

notify pgrst,'reload schema';
