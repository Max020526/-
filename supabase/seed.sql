-- Development seed intentionally contains reference data only.
-- Business records must be created through the application workflows.
insert into public.categories
  (organization_id, name, slug, name_zh, name_en, name_it, sort_order, is_active)
select organization.id, seed.*
from public.organizations organization
cross join (values
  ('上装', 'tops', '上装', 'Tops', 'Top', 10, true),
  ('下装', 'bottoms', '下装', 'Bottoms', 'Pantaloni e gonne', 20, true),
  ('连衣裙', 'dresses', '连衣裙', 'Dresses', 'Abiti', 30, true),
  ('外套', 'outerwear', '外套', 'Outerwear', 'Capispalla', 40, true),
  ('配饰', 'accessories', '配饰', 'Accessories', 'Accessori', 50, true)
) as seed(name, slug, name_zh, name_en, name_it, sort_order, is_active)
where organization.code = 'NEXORA'
on conflict (slug) do update
set name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    name_it = excluded.name_it,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.sizes (organization_id, name, normalized_name, sort_order, is_active)
select organization.id, 'ONE_SIZE', 'ONE_SIZE', 5, true
from public.organizations organization
where organization.code = 'NEXORA'
on conflict (normalized_name) do update
set is_active = true, sort_order = excluded.sort_order;

insert into public.colors
  (organization_id, name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
select organization.id, seed.*
from public.organizations organization
cross join (values
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
  ('彩色', '彩色', '彩色', 'Multicolor', 'Multicolore', 'MUL', '#9C6ADE', 260, true),
  ('炭灰', '炭灰', '炭灰', 'Charcoal', 'Antracite', 'CHR', '#36454F', 270, true),
  ('烟灰', '烟灰', '烟灰', 'Smoke Gray', 'Grigio fumo', 'SMK', '#737B7D', 280, true),
  ('燕麦色', '燕麦色', '燕麦色', 'Oatmeal', 'Avena', 'OAT', '#D8C7A8', 290, true),
  ('沙色', '沙色', '沙色', 'Sand', 'Sabbia', 'SND', '#CBB994', 300, true),
  ('驼色', '驼色', '驼色', 'Camel', 'Cammello', 'CML', '#C19A6B', 310, true),
  ('焦糖色', '焦糖色', '焦糖色', 'Caramel', 'Caramello', 'CAR', '#B87333', 320, true),
  ('咖啡色', '咖啡色', '咖啡色', 'Coffee', 'Caffè', 'COF', '#6F4E37', 330, true),
  ('摩卡色', '摩卡色', '摩卡色', 'Mocha', 'Moka', 'MOC', '#967969', 340, true),
  ('巧克力色', '巧克力色', '巧克力色', 'Chocolate', 'Cioccolato', 'CHO', '#5C3317', 350, true),
  ('裸色', '裸色', '裸色', 'Nude', 'Nude', 'NUD', '#D6B59C', 360, true),
  ('杏色', '杏色', '杏色', 'Apricot', 'Albicocca', 'APR', '#F5CBA7', 370, true),
  ('香槟色', '香槟色', '香槟色', 'Champagne', 'Champagne', 'CHP', '#F7E7CE', 380, true),
  ('玫瑰粉', '玫瑰粉', '玫瑰粉', 'Rose Pink', 'Rosa antico', 'RPK', '#DFA6B2', 390, true),
  ('豆沙色', '豆沙色', '豆沙色', 'Dusty Rose', 'Rosa polvere', 'DSR', '#C08081', 400, true),
  ('珊瑚色', '珊瑚色', '珊瑚色', 'Coral', 'Corallo', 'COR', '#FF7F50', 410, true),
  ('桃色', '桃色', '桃色', 'Peach', 'Pesca', 'PCH', '#FFCBA4', 420, true),
  ('玫红', '玫红', '玫红', 'Fuchsia', 'Fucsia', 'FUS', '#C2185B', 430, true),
  ('砖红', '砖红', '砖红', 'Brick Red', 'Rosso mattone', 'BRK', '#A64B3C', 440, true),
  ('铁锈红', '铁锈红', '铁锈红', 'Rust', 'Ruggine', 'RST', '#B7410E', 450, true),
  ('天蓝', '天蓝', '天蓝', 'Sky Blue', 'Celeste', 'SKY', '#87CEEB', 460, true),
  ('宝蓝', '宝蓝', '宝蓝', 'Royal Blue', 'Blu reale', 'RYB', '#4169E1', 470, true),
  ('牛仔蓝', '牛仔蓝', '牛仔蓝', 'Denim Blue', 'Blu denim', 'DNM', '#3B5B92', 480, true),
  ('孔雀蓝', '孔雀蓝', '孔雀蓝', 'Peacock Blue', 'Blu pavone', 'PCB', '#006994', 490, true),
  ('青色', '青色', '青色', 'Teal', 'Verde petrolio', 'TEA', '#008080', 500, true),
  ('薄荷绿', '薄荷绿', '薄荷绿', 'Mint', 'Menta', 'MNT', '#98FF98', 510, true),
  ('牛油果绿', '牛油果绿', '牛油果绿', 'Avocado Green', 'Verde avocado', 'AVO', '#568203', 520, true),
  ('橄榄绿', '橄榄绿', '橄榄绿', 'Olive', 'Oliva', 'OLV', '#808000', 530, true),
  ('军绿色', '军绿色', '军绿色', 'Army Green', 'Verde militare', 'ARM', '#4B5320', 540, true),
  ('祖母绿', '祖母绿', '祖母绿', 'Emerald', 'Smeraldo', 'EMR', '#50C878', 550, true),
  ('薰衣草紫', '薰衣草紫', '薰衣草紫', 'Lavender', 'Lavanda', 'LAV', '#B57EDC', 560, true),
  ('丁香紫', '丁香紫', '丁香紫', 'Lilac', 'Lilla', 'LIL', '#C8A2C8', 570, true),
  ('梅子色', '梅子色', '梅子色', 'Plum', 'Prugna', 'PLM', '#8E4585', 580, true),
  ('古铜色', '古铜色', '古铜色', 'Bronze', 'Bronzo', 'BRZ', '#CD7F32', 590, true),
  ('透明', '透明', '透明', 'Transparent', 'Trasparente', 'CLR', '#E8E8E8', 600, true)
) as seed(name, normalized_name, name_zh, name_en, name_it, code, hex_value, sort_order, is_active)
where organization.code = 'NEXORA'
on conflict (normalized_name) do update
set name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    name_it = excluded.name_it,
    hex_value = excluded.hex_value,
    sort_order = excluded.sort_order,
    is_active = true;
