-- Repair reference rows that were inserted through an incorrectly decoded
-- UTF-8 seed.  Match by stable codes/slugs instead of attempting a lossy
-- character-set conversion.
with canonical_colors(code, name, normalized_name, name_zh, name_en, name_it) as (
  values
    ('BLK', '黑色', '黑色', '黑色', 'Black', 'Nero'),
    ('WHT', '白色', '白色', '白色', 'White', 'Bianco'),
    ('IVY', '米白', '米白', '米白', 'Ivory', 'Avorio'),
    ('CRM', '奶白', '奶白', '奶白', 'Cream', 'Crema'),
    ('BRN', '棕色', '棕色', '棕色', 'Brown', 'Marrone'),
    ('DBR', '深棕', '深棕', '深棕', 'Dark Brown', 'Marrone scuro'),
    ('LBR', '浅棕色', '浅棕色', '浅棕', 'Light Brown', 'Marrone chiaro'),
    ('RED', '红色', '红色', '红色', 'Red', 'Rosso'),
    ('WIN', '酒红', '酒红', '酒红', 'Wine', 'Bordeaux'),
    ('PNK', '粉色', '粉色', '粉色', 'Pink', 'Rosa'),
    ('BLU', '蓝色', '蓝色', '蓝色', 'Blue', 'Blu'),
    ('NVY', '深蓝', '深蓝', '深蓝', 'Navy', 'Blu navy'),
    ('LBL', '浅蓝', '浅蓝', '浅蓝', 'Light Blue', 'Azzurro'),
    ('GRN', '绿色', '绿色', '绿色', 'Green', 'Verde'),
    ('DGR', '深绿', '深绿', '深绿', 'Dark Green', 'Verde scuro'),
    ('GRY', '灰色', '灰色', '灰色', 'Gray', 'Grigio'),
    ('DGY', '深灰', '深灰', '深灰', 'Dark Gray', 'Grigio scuro'),
    ('LGY', '浅灰', '浅灰', '浅灰', 'Light Gray', 'Grigio chiaro'),
    ('KHK', '卡其', '卡其', '卡其', 'Khaki', 'Kaki'),
    -- BEI is a retained legacy alias for 米色, so BGE uses a distinct
    -- internal name while keeping the correct Chinese display name.
    ('BGE', '米色（标准）', '米色-BGE', '米色', 'Beige', 'Beige'),
    ('YLW', '黄色', '黄色', '黄色', 'Yellow', 'Giallo'),
    ('ORG', '橙色', '橙色', '橙色', 'Orange', 'Arancione'),
    ('PUR', '紫色', '紫色', '紫色', 'Purple', 'Viola'),
    ('GLD', '金色', '金色', '金色', 'Gold', 'Oro'),
    ('SLV', '银色', '银色', '银色', 'Silver', 'Argento'),
    ('MUL', '彩色', '彩色', '彩色', 'Multicolor', 'Multicolore')
)
update public.colors as color
set name = canonical.name,
    normalized_name = canonical.normalized_name,
    name_zh = canonical.name_zh,
    name_en = canonical.name_en,
    name_it = canonical.name_it,
    updated_at = now()
from canonical_colors as canonical
where upper(color.code) = canonical.code;

with canonical_categories(slug, name_zh, name_en, name_it) as (
  values
    ('tops', '上装', 'Tops', 'Top'),
    ('bottoms', '下装', 'Bottoms', 'Pantaloni e gonne'),
    ('dresses', '连衣裙', 'Dresses', 'Abiti'),
    ('outerwear', '外套', 'Outerwear', 'Capispalla'),
    ('accessories', '配饰', 'Accessories', 'Accessori')
)
update public.categories as category
set name_zh = canonical.name_zh,
    name_en = canonical.name_en,
    name_it = canonical.name_it,
    updated_at = now()
from canonical_categories as canonical
where category.slug = canonical.slug;
