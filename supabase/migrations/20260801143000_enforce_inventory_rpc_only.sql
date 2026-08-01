-- Inventory is a ledger-backed fact. Browser roles may read it, but every write
-- must be performed by an audited SECURITY DEFINER transaction function.

drop policy if exists manage_insert_inventory on public.inventory;
drop policy if exists manage_update_inventory on public.inventory;
drop policy if exists manage_delete_inventory on public.inventory;
drop policy if exists staff_all_inventory on public.inventory;

drop policy if exists manage_insert_inventory_movements on public.inventory_movements;
drop policy if exists manage_update_inventory_movements on public.inventory_movements;
drop policy if exists manage_delete_inventory_movements on public.inventory_movements;
drop policy if exists staff_all_inventory_movements on public.inventory_movements;

revoke insert, update, delete, truncate on table public.inventory from anon, authenticated;
revoke insert, update, delete, truncate on table public.inventory_movements from anon, authenticated;

-- Read policies remain unchanged. SECURITY DEFINER functions used for inbound,
-- stocktake, reservations, sales, returns and online limits retain owner rights.
notify pgrst, 'reload schema';
