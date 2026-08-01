-- Warehouse users can add a genuinely new colour during receiving without
-- receiving direct INSERT/UPDATE access to the colour dictionary.

create sequence if not exists private.color_code_sequence start with 1001;

create temporary table inbound_color_seed (
  name_zh text not null,
  name_en text not null,
  name_it text not null,
  code text not null,
  hex_value text not null,
  sort_order integer not null
) on commit drop;

insert into inbound_color_seed(name_zh, name_en, name_it, code, hex_value, sort_order)
values
  ('炭灰', 'Charcoal', 'Antracite', 'CHR', '#36454F', 270),
  ('烟灰', 'Smoke Gray', 'Grigio fumo', 'SMK', '#737B7D', 280),
  ('燕麦色', 'Oatmeal', 'Avena', 'OAT', '#D8C7A8', 290),
  ('沙色', 'Sand', 'Sabbia', 'SND', '#CBB994', 300),
  ('驼色', 'Camel', 'Cammello', 'CML', '#C19A6B', 310),
  ('焦糖色', 'Caramel', 'Caramello', 'CAR', '#B87333', 320),
  ('咖啡色', 'Coffee', 'Caffè', 'COF', '#6F4E37', 330),
  ('摩卡色', 'Mocha', 'Moka', 'MOC', '#967969', 340),
  ('巧克力色', 'Chocolate', 'Cioccolato', 'CHO', '#5C3317', 350),
  ('裸色', 'Nude', 'Nude', 'NUD', '#D6B59C', 360),
  ('杏色', 'Apricot', 'Albicocca', 'APR', '#F5CBA7', 370),
  ('香槟色', 'Champagne', 'Champagne', 'CHP', '#F7E7CE', 380),
  ('玫瑰粉', 'Rose Pink', 'Rosa antico', 'RPK', '#DFA6B2', 390),
  ('豆沙色', 'Dusty Rose', 'Rosa polvere', 'DSR', '#C08081', 400),
  ('珊瑚色', 'Coral', 'Corallo', 'COR', '#FF7F50', 410),
  ('桃色', 'Peach', 'Pesca', 'PCH', '#FFCBA4', 420),
  ('玫红', 'Fuchsia', 'Fucsia', 'FUS', '#C2185B', 430),
  ('砖红', 'Brick Red', 'Rosso mattone', 'BRK', '#A64B3C', 440),
  ('铁锈红', 'Rust', 'Ruggine', 'RST', '#B7410E', 450),
  ('天蓝', 'Sky Blue', 'Celeste', 'SKY', '#87CEEB', 460),
  ('宝蓝', 'Royal Blue', 'Blu reale', 'RYB', '#4169E1', 470),
  ('牛仔蓝', 'Denim Blue', 'Blu denim', 'DNM', '#3B5B92', 480),
  ('孔雀蓝', 'Peacock Blue', 'Blu pavone', 'PCB', '#006994', 490),
  ('青色', 'Teal', 'Verde petrolio', 'TEA', '#008080', 500),
  ('薄荷绿', 'Mint', 'Menta', 'MNT', '#98FF98', 510),
  ('牛油果绿', 'Avocado Green', 'Verde avocado', 'AVO', '#568203', 520),
  ('橄榄绿', 'Olive', 'Oliva', 'OLV', '#808000', 530),
  ('军绿色', 'Army Green', 'Verde militare', 'ARM', '#4B5320', 540),
  ('祖母绿', 'Emerald', 'Smeraldo', 'EMR', '#50C878', 550),
  ('薰衣草紫', 'Lavender', 'Lavanda', 'LAV', '#B57EDC', 560),
  ('丁香紫', 'Lilac', 'Lilla', 'LIL', '#C8A2C8', 570),
  ('梅子色', 'Plum', 'Prugna', 'PLM', '#8E4585', 580),
  ('古铜色', 'Bronze', 'Bronzo', 'BRZ', '#CD7F32', 590),
  ('透明', 'Transparent', 'Trasparente', 'CLR', '#E8E8E8', 600);

update public.colors c
set name_zh = coalesce(c.name_zh, s.name_zh),
    name_en = coalesce(c.name_en, s.name_en),
    name_it = coalesce(c.name_it, s.name_it),
    hex_value = coalesce(c.hex_value, s.hex_value),
    sort_order = case when c.sort_order = 0 then s.sort_order else c.sort_order end,
    is_active = true
from inbound_color_seed s
where c.normalized_name = s.name_zh;

insert into public.colors(name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
select s.name_zh, s.name_zh, s.name_zh, s.name_en, s.name_it, s.code, s.hex_value, s.sort_order, true
from inbound_color_seed s
where not exists (
  select 1 from public.colors c
  where c.normalized_name = s.name_zh or upper(c.code) = s.code
);

create or replace function private.create_inbound_color(
  p_name_zh text,
  p_code text default null,
  p_hex_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  caller_id uuid := (select auth.uid());
  name_value text := trim(coalesce(p_name_zh, ''));
  normalized_value text;
  code_value text := upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));
  hex_value text := upper(trim(coalesce(p_hex_value, '')));
  color_value public.colors%rowtype;
  attempts integer := 0;
begin
  if caller_id is null or not private.has_app_role(array['employee', 'admin']) then
    raise exception '没有新增颜色权限';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = caller_id and p.is_active and p.role in ('employee', 'admin')
  ) then
    raise exception '员工账号已停用或权限无效';
  end if;
  if char_length(name_value) < 1 or char_length(name_value) > 30 or name_value ~ '[[:cntrl:]]' then
    raise exception '颜色名称必须是1到30个有效字符';
  end if;

  normalized_value := lower(regexp_replace(name_value, '\s+', '', 'g'));
  select * into color_value
  from public.colors c
  where lower(regexp_replace(c.normalized_name, '\s+', '', 'g')) = normalized_value
  limit 1 for update;
  if found then
    if not color_value.is_active then raise exception '该颜色已被停用，请联系管理员'; end if;
    if color_value.code is null then
      if code_value <> '' then
        if code_value !~ '^[A-Z0-9]{2,8}$' then raise exception '颜色代码必须是2到8位大写字母或数字'; end if;
        if exists (select 1 from public.colors c where upper(c.code) = code_value and c.id <> color_value.id) then
          raise exception '颜色代码%已经存在，请更换代码', code_value;
        end if;
      else
        loop
          attempts := attempts + 1;
          code_value := 'C' || lpad(nextval('private.color_code_sequence')::text, 4, '0');
          exit when not exists (select 1 from public.colors c where upper(c.code) = code_value);
          if attempts >= 20 then raise exception '暂时无法生成颜色代码，请稍后重试'; end if;
        end loop;
      end if;
      update public.colors set code = code_value where id = color_value.id returning * into color_value;
    end if;
    return jsonb_build_object(
      'id', color_value.id, 'name_zh', coalesce(color_value.name_zh, color_value.name),
      'name', color_value.name, 'code', color_value.code, 'existing', true
    );
  end if;

  if code_value = '' then
    loop
      attempts := attempts + 1;
      code_value := 'C' || lpad(nextval('private.color_code_sequence')::text, 4, '0');
      exit when not exists (select 1 from public.colors c where upper(c.code) = code_value);
      if attempts >= 20 then raise exception '暂时无法生成颜色代码，请稍后重试'; end if;
    end loop;
  elsif code_value !~ '^[A-Z0-9]{2,8}$' then
    raise exception '颜色代码必须是2到8位大写字母或数字';
  elsif exists (select 1 from public.colors c where upper(c.code) = code_value) then
    raise exception '颜色代码%已经存在，请更换代码', code_value;
  end if;

  if hex_value = '' then hex_value := '#B8B8B8'; end if;
  if hex_value !~ '^#[0-9A-F]{6}$' then raise exception '颜色值必须使用#加6位十六进制字符'; end if;
  if (
    select count(*) from public.audit_logs a
    where a.user_id = caller_id and a.action = 'CREATE_INBOUND_COLOR'
      and a.created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception '新增颜色过于频繁，请稍后再试';
  end if;

  begin
    insert into public.colors(
      name, normalized_name, name_zh, code, hex_value, sort_order, is_active
    ) values (
      name_value, normalized_value, name_value, code_value, hex_value,
      coalesce((select max(c.sort_order) + 10 from public.colors c), 10), true
    ) returning * into color_value;
  exception when unique_violation then
    raise exception '颜色名称或颜色代码已经存在，请刷新颜色列表';
  end;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, new_data)
  values(
    caller_id, 'CREATE_INBOUND_COLOR', 'color', color_value.id,
    jsonb_build_object('name_zh', name_value, 'code', code_value, 'source', 'FAST_INBOUND')
  );

  return jsonb_build_object(
    'id', color_value.id, 'name_zh', color_value.name_zh,
    'name', color_value.name, 'code', color_value.code, 'existing', false
  );
end;
$$;

revoke all on function private.create_inbound_color(text,text,text) from public, anon;
grant execute on function private.create_inbound_color(text,text,text) to authenticated;

create or replace function public.create_inbound_color(
  p_name_zh text,
  p_code text default null,
  p_hex_value text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.create_inbound_color(p_name_zh, p_code, p_hex_value); $$;

revoke all on function public.create_inbound_color(text,text,text) from public, anon;
grant execute on function public.create_inbound_color(text,text,text) to authenticated;

notify pgrst, 'reload schema';
