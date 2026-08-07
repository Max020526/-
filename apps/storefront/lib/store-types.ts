export type StorefrontMedia = {
  id: string;
  product_id: string;
  variant_id: string | null;
  media_type: string;
  sort_order: number;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  media_path: string;
};

export type StorefrontVariant = {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  sort_order: number;
  color_id: string;
  color_name: string;
  color_name_it: string | null;
  color_name_en: string | null;
  hex_value: string | null;
  size_id: string;
  size_name: string;
  size_sort_order: number;
  available_quantity: number;
};

export type StorefrontProduct = {
  id: string;
  style_no: string;
  slug: string;
  title: string;
  name_it: string | null;
  name_en: string | null;
  short_description: string | null;
  short_description_it: string | null;
  short_description_en: string | null;
  description: string | null;
  description_it: string | null;
  description_en: string | null;
  material: string | null;
  care_instructions: string | null;
  fit: string | null;
  season: string | null;
  gender: string | null;
  is_new: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  category_name_it: string | null;
  category_name_en: string | null;
  brand_name: string | null;
  channel_id: string;
  channel_code: string;
  published_at: string | null;
  currency: string;
  unit_price: number;
  compare_at_price: number | null;
  origin_country: string | null;
  tax_rate: number | null;
  seo_title_zh: string | null;
  seo_title_it: string | null;
  seo_title_en: string | null;
  seo_description_zh: string | null;
  seo_description_it: string | null;
  seo_description_en: string | null;
  variants: StorefrontVariant[];
  media: StorefrontMedia[];
};

export type StorefrontOrderResult = {
  order_id: string;
  order_no: string;
  idempotent: boolean;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_adapter: string;
  expires_at: string;
  lookup_token: string | null;
};

export type StorefrontOrder = {
  id: string;
  order_no: string;
  status: string;
  lifecycle_status: string;
  payment_status: string;
  fulfillment_status: string;
  payment_adapter: string;
  fulfillment_method: "DELIVERY" | "PICKUP";
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  contact: { full_name?: string; email?: string; phone?: string };
  shipping_address: Record<string, string> | null;
  created_at: string;
  expires_at: string | null;
  events: Array<{ id: string; event_type: string; message: string | null; occurred_at: string }>;
  returns: Array<{ id: string; return_no: string; status: string; created_at: string }>;
  items: Array<{
    id: string;
    product_title: string;
    product_slug: string | null;
    sku: string;
    color_name: string;
    size_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    currency: string;
    image_media_id: string | null;
  }>;
};

export function formatPrice(value: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(value);
}

export function productImage(product: StorefrontProduct) {
  const image = product.media.find((item) => item.is_primary) ?? product.media[0];
  return image ? resolveMediaUrl(image.media_path) : null;
}

export function resolveMediaUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = (process.env.NEXT_PUBLIC_CATALOG_API_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
