-- NEXORA V1 Phase 2: advisor-driven index and authorization hardening.

create index if not exists channels_created_by_idx on public.channels(created_by);
create index if not exists channels_updated_by_idx on public.channels(updated_by);
create index if not exists price_books_channel_id_idx on public.price_books(channel_id);
create index if not exists price_books_created_by_idx on public.price_books(created_by);
create index if not exists price_books_updated_by_idx on public.price_books(updated_by);
create index if not exists price_book_items_product_id_idx on public.price_book_items(product_id);
create index if not exists price_book_items_variant_id_idx on public.price_book_items(variant_id);
create index if not exists price_book_items_created_by_idx on public.price_book_items(created_by);
create index if not exists price_book_items_updated_by_idx on public.price_book_items(updated_by);
create index if not exists product_publications_product_id_idx on public.product_publications(product_id);
create index if not exists product_publications_channel_id_idx on public.product_publications(channel_id);
create index if not exists product_publications_created_by_idx on public.product_publications(created_by);
create index if not exists product_publications_updated_by_idx on public.product_publications(updated_by);
create index if not exists products_updated_by_idx on public.products(updated_by);
create index if not exists product_variants_updated_by_idx on public.product_variants(updated_by);
create index if not exists product_images_updated_by_idx on public.product_images(updated_by);
create index if not exists inbound_order_items_size_id_idx on public.inbound_order_items(size_id);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists organizations_updated_by_idx on public.organizations(updated_by);
create index if not exists stock_receipts_updated_by_idx on public.stock_receipts(updated_by);

create or replace function private.get_my_authorization()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', profile.id,
    'organization_id', profile.organization_id,
    'full_name', profile.full_name,
    'is_active', profile.is_active,
    'primary_role', profile.role,
    'roles', coalesce((
      select jsonb_agg(distinct role.code order by role.code)
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = profile.id
    ), case when profile.role is null then '[]'::jsonb else jsonb_build_array(profile.role) end),
    'permissions', coalesce((
      select jsonb_agg(distinct permission.code order by permission.code)
      from public.roles role
      join public.role_permissions role_permission on role_permission.role_id = role.id
      join public.permissions permission on permission.id = role_permission.permission_id
      where role.organization_id = profile.organization_id
        and (role.code = profile.role or exists (
          select 1 from public.user_roles user_role
          where user_role.user_id = profile.id and user_role.role_id = role.id
        ))
    ), '[]'::jsonb)
  )
  from public.profiles profile
  where profile.id = (select auth.uid());
$$;

create or replace function public.get_my_authorization()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_my_authorization(); $$;

revoke all on function private.get_my_authorization() from public,anon;
grant execute on function private.get_my_authorization() to authenticated;
revoke all on function public.get_my_authorization() from public,anon;
grant execute on function public.get_my_authorization() to authenticated;

notify pgrst, 'reload schema';
