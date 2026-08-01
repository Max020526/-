create or replace function private.manage_product_image(p_product_id uuid, p_image_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  image_value public.product_images%rowtype;
  neighbor_value public.product_images%rowtype;
begin
  if caller_id is null or not private.has_app_role(array['admin']) then
    raise exception '没有商品图片管理权限';
  end if;
  if p_action not in ('set_primary', 'move_up', 'move_down') then raise exception '图片操作无效'; end if;

  select * into image_value from public.product_images
  where id = p_image_id and product_id = p_product_id for update;
  if not found then raise exception '商品图片不存在'; end if;

  if p_action = 'set_primary' then
    update public.product_images set is_primary = false where product_id = p_product_id and is_primary;
    update public.product_images set is_primary = true, image_type = 'MAIN' where id = image_value.id;
  else
    select * into neighbor_value from public.product_images
    where product_id = p_product_id and id <> image_value.id
      and (
        (p_action = 'move_up' and sort_order < image_value.sort_order)
        or (p_action = 'move_down' and sort_order > image_value.sort_order)
      )
    order by
      case when p_action = 'move_up' then sort_order end desc,
      case when p_action = 'move_down' then sort_order end asc
    limit 1 for update;
    if found then
      update public.product_images set sort_order = neighbor_value.sort_order where id = image_value.id;
      update public.product_images set sort_order = image_value.sort_order where id = neighbor_value.id;
    end if;
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  values(caller_id, 'MANAGE_PRODUCT_IMAGE', 'product', p_product_id, jsonb_build_object('image_id', p_image_id, 'action', p_action));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function private.manage_product_image(uuid,uuid,text) from public, anon;
grant execute on function private.manage_product_image(uuid,uuid,text) to authenticated;

create or replace function public.manage_product_image(p_product_id uuid, p_image_id uuid, p_action text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.manage_product_image(p_product_id, p_image_id, p_action); $$;
revoke all on function public.manage_product_image(uuid,uuid,text) from public, anon;
grant execute on function public.manage_product_image(uuid,uuid,text) to authenticated;

notify pgrst, 'reload schema';
