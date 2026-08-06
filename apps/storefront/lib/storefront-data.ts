import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { StorefrontProduct } from "./store-types";

type PublicClient = ReturnType<typeof createClient>;

export function createPublicServerClient(): PublicClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function loadStorefrontCatalog(options?: { slug?: string; limit?: number }) {
  const client = typeof window === "undefined" ? createPublicServerClient() : getSupabase();
  if (!client) return { products: [] as StorefrontProduct[], error: null as string | null };

  const { data, error } = await client.rpc("rpc_get_storefront_catalog", {
    p_slug: options?.slug ?? null,
    p_limit: options?.limit ?? 200,
  });
  if (error) return { products: [], error: "catalog_unavailable" };
  const payload = data as { products?: StorefrontProduct[] } | null;
  const products = (payload?.products ?? []).map((product) => ({
    ...product,
    unit_price: Number(product.unit_price),
    compare_at_price: product.compare_at_price === null ? null : Number(product.compare_at_price),
    tax_rate: product.tax_rate == null ? null : Number(product.tax_rate),
    variants: product.variants.map((variant) => ({
      ...variant,
      available_quantity: Number(variant.available_quantity),
    })),
  }));
  return { products, error: null };
}

export async function loadStorefrontProduct(slug: string) {
  const result = await loadStorefrontCatalog({ slug, limit: 1 });
  return { product: result.products[0] ?? null, error: result.error };
}
