import type { Json } from "@/types/database";

export type LookupOption = { id: string; name: string; code?: string | null };

export type ProductOperationsRecord = {
  id: string;
  style_no: string;
  model_number?: string | null;
  name?: string | null;
  name_zh?: string | null;
  name_it?: string | null;
  name_en?: string | null;
  internal_name?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  brand_id?: string | null;
  supplier_id?: string | null;
  season?: string | null;
  year?: number | null;
  gender?: string | null;
  material?: string | null;
  fit?: string | null;
  thickness?: string | null;
  elasticity?: string | null;
  origin_country?: string | null;
  origin?: string | null;
  washing_instructions?: string | null;
  care_instructions?: string | null;
  short_description_zh?: string | null;
  short_description_it?: string | null;
  short_description_en?: string | null;
  description_zh?: string | null;
  description_it?: string | null;
  description_en?: string | null;
  slug?: string | null;
  seo_title_zh?: string | null;
  seo_title_it?: string | null;
  seo_title_en?: string | null;
  seo_description_zh?: string | null;
  seo_description_it?: string | null;
  seo_description_en?: string | null;
  is_new: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  internal_notes?: string | null;
  workflow_status?: string;
  status: string;
  created_at: string;
  updated_at: string;
  product_variants?: Array<{
    id: string; color_id: string; size_id: string; sku: string; barcode: string | null;
    is_active: boolean; is_visible_online?: boolean; sort_order?: number;
    colors?: { name: string; name_zh?: string | null; code?: string | null } | null;
    sizes?: { name: string; code?: string | null } | null;
  }>;
  product_images?: Array<{
    id: string; file_path: string; image_type: string; is_primary: boolean; sort_order: number;
    mime_type?: string | null; file_size?: number | null; deleted_at?: string | null;
  }>;
  product_publications?: Array<{
    id: string; channel_id: string; status: string; validation_errors: Json; scheduled_at: string | null; published_at: string | null;
  }>;
};

export type PublicationIssue = { code: string; field: string; message: string };

