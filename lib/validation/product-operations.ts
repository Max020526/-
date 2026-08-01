import { z } from "zod";

const optionalUuid = z.string().uuid().or(z.literal(""));
const optionalText = z.string().trim().max(5000);

export const productDraftSchema = z.object({
  model_code: z.string().trim().min(2, "商品型号至少需要 2 个字符").max(50)
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => /^[A-Z0-9_-]+$/.test(value), "商品型号只能包含字母、数字、短横线和下划线"),
  name_zh: z.string().trim().max(200),
  name_it: z.string().trim().max(200),
  name_en: z.string().trim().max(200),
  category_id: optionalUuid,
  brand_id: optionalUuid,
  supplier_id: optionalUuid,
  season: z.string().trim().max(80),
  year: z.string().regex(/^$|^\d{4}$/, "年份必须是四位数字"),
  gender: z.string().trim().max(40),
  material: z.string().trim().max(300),
});

export const productOperationsSchema = z.object({
  name_zh: z.string().trim().max(200),
  name_it: z.string().trim().max(200),
  name_en: z.string().trim().max(200),
  internal_name: z.string().trim().max(200),
  category_id: optionalUuid,
  subcategory_id: optionalUuid,
  brand_id: optionalUuid,
  supplier_id: optionalUuid,
  season: z.string().trim().max(80),
  year: z.string().regex(/^$|^\d{4}$/, "年份必须是四位数字"),
  gender: z.string().trim().max(40),
  material: z.string().trim().max(300),
  fit: z.string().trim().max(100),
  thickness: z.string().trim().max(100),
  elasticity: z.string().trim().max(100),
  origin_country: z.string().trim().max(100),
  washing_instructions: optionalText,
  short_description_zh: z.string().trim().max(500),
  short_description_it: z.string().trim().max(500),
  short_description_en: z.string().trim().max(500),
  description_zh: optionalText,
  description_it: optionalText,
  description_en: optionalText,
  slug: z.string().trim().max(180)
    .refine((value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), "URL Slug 只能包含小写字母、数字和短横线"),
  seo_title_zh: z.string().trim().max(200),
  seo_title_it: z.string().trim().max(200),
  seo_title_en: z.string().trim().max(200),
  seo_description_zh: z.string().trim().max(500),
  seo_description_it: z.string().trim().max(500),
  seo_description_en: z.string().trim().max(500),
  is_new: z.boolean(),
  is_featured: z.boolean(),
  is_bestseller: z.boolean(),
  internal_notes: optionalText,
});

export const productPriceSchema = z.object({
  unit_price: z.coerce.number().positive("销售价格必须大于 0").multipleOf(0.01),
  compare_at_price: z.union([z.literal(""), z.coerce.number().positive().multipleOf(0.01)]),
}).refine(
  (value) => value.compare_at_price === "" || value.compare_at_price >= value.unit_price,
  { message: "划线价不能低于销售价", path: ["compare_at_price"] },
);

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "请检查表单内容";
}

