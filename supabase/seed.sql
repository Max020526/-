-- Development seed intentionally contains reference data only.
-- Business records must be created through the application workflows.
insert into public.categories
  (name, slug, name_zh, name_en, name_it, sort_order, is_active)
values
  ('上装', 'tops', '上装', 'Tops', 'Top', 10, true),
  ('下装', 'bottoms', '下装', 'Bottoms', 'Pantaloni e gonne', 20, true),
  ('连衣裙', 'dresses', '连衣裙', 'Dresses', 'Abiti', 30, true),
  ('外套', 'outerwear', '外套', 'Outerwear', 'Capispalla', 40, true),
  ('配饰', 'accessories', '配饰', 'Accessories', 'Accessori', 50, true)
on conflict (slug) do update
set name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    name_it = excluded.name_it,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.sizes (name, normalized_name, sort_order, is_active)
values ('ONE_SIZE', 'ONE_SIZE', 5, true)
on conflict (normalized_name) do update
set is_active = true, sort_order = excluded.sort_order;

insert into public.colors
  (name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
values
  ('黑色', '黑色', '黑色', 'Black', 'Nero', 'BLK', '#000000', 10, true),
  ('白色', '白色', '白色', 'White', 'Bianco', 'WHT', '#FFFFFF', 20, true),
  ('米白色', '米白色', '米白', 'Ivory', 'Avorio', 'IVY', '#FFFFF0', 30, true),
  ('奶白', '奶白', '奶白', 'Cream', 'Crema', 'CRM', '#FFFDD0', 40, true),
  ('棕色', '棕色', '棕色', 'Brown', 'Marrone', 'BRN', '#7A4A2E', 50, true),
  ('深棕色', '深棕色', '深棕', 'Dark Brown', 'Marrone scuro', 'DBR', '#4B2E20', 60, true),
  ('浅棕色', '浅棕色', '浅棕', 'Light Brown', 'Marrone chiaro', 'LBR', '#B78A68', 70, true),
  ('红色', '红色', '红色', 'Red', 'Rosso', 'RED', '#D32F2F', 80, true),
  ('酒红色', '酒红色', '酒红', 'Wine', 'Bordeaux', 'WIN', '#722F37', 90, true),
  ('粉色', '粉色', '粉色', 'Pink', 'Rosa', 'PNK', '#F4A6B8', 100, true),
  ('蓝色', '蓝色', '蓝色', 'Blue', 'Blu', 'BLU', '#2563EB', 110, true),
  ('深蓝色', '深蓝色', '深蓝', 'Navy', 'Blu navy', 'NVY', '#1E3A5F', 120, true),
  ('浅蓝色', '浅蓝色', '浅蓝', 'Light Blue', 'Azzurro', 'LBL', '#9CC9E8', 130, true),
  ('绿色', '绿色', '绿色', 'Green', 'Verde', 'GRN', '#2E7D32', 140, true),
  ('深绿色', '深绿色', '深绿', 'Dark Green', 'Verde scuro', 'DGR', '#1B5E20', 150, true),
  ('灰色', '灰色', '灰色', 'Gray', 'Grigio', 'GRY', '#808080', 160, true),
  ('深灰色', '深灰色', '深灰', 'Dark Gray', 'Grigio scuro', 'DGY', '#4A4A4A', 170, true),
  ('浅灰色', '浅灰色', '浅灰', 'Light Gray', 'Grigio chiaro', 'LGY', '#C7C7C7', 180, true),
  ('卡其色', '卡其色', '卡其', 'Khaki', 'Kaki', 'KHK', '#B5A26F', 190, true),
  ('米色', '米色', '米色', 'Beige', 'Beige', 'BGE', '#D9C3A5', 200, true),
  ('黄色', '黄色', '黄色', 'Yellow', 'Giallo', 'YLW', '#F4D03F', 210, true),
  ('橙色', '橙色', '橙色', 'Orange', 'Arancione', 'ORG', '#F28C28', 220, true),
  ('紫色', '紫色', '紫色', 'Purple', 'Viola', 'PUR', '#7E57C2', 230, true),
  ('金色', '金色', '金色', 'Gold', 'Oro', 'GLD', '#D4AF37', 240, true),
  ('银色', '银色', '银色', 'Silver', 'Argento', 'SLV', '#C0C0C0', 250, true),
  ('彩色', '彩色', '彩色', 'Multicolor', 'Multicolore', 'MUL', '#9C6ADE', 260, true)
on conflict (normalized_name) do update
set name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    name_it = excluded.name_it,
    hex_value = excluded.hex_value,
    sort_order = excluded.sort_order,
    is_active = true;
