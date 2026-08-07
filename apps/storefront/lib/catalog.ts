import type { LocalizedText, StoreLocale } from "./i18n";
import type { StorefrontProduct } from "./store-types";

export type NavigationCategory = { slug: string; label: LocalizedText; parent?: string };

export const garmentCategories: NavigationCategory[] = [
  { slug: "dresses-jumpsuits", label: { it: "Abiti e tute", en: "Dresses & jumpsuits", zh: "连衣裙与连体裤" } },
  { slug: "tops-tshirts", label: { it: "Top e T-shirt", en: "Tops & T-shirts", zh: "上衣与 T 恤" } },
  { slug: "shirts-blouses", label: { it: "Camicie e bluse", en: "Shirts & blouses", zh: "衬衫与罩衫" } },
  { slug: "knitwear", label: { it: "Maglieria", en: "Knitwear", zh: "针织衫" } },
  { slug: "blazers", label: { it: "Blazer", en: "Blazers", zh: "西装外套" } },
  { slug: "jackets-trenches-coats", label: { it: "Giacche, trench e cappotti", en: "Jackets, trenches & coats", zh: "夹克、风衣与大衣" } },
  { slug: "trousers", label: { it: "Pantaloni", en: "Trousers", zh: "长裤" } },
  { slug: "jeans", label: { it: "Jeans", en: "Jeans", zh: "牛仔裤" } },
  { slug: "skirts-shorts", label: { it: "Gonne e shorts", en: "Skirts & shorts", zh: "半身裙与短裤" } },
  { slug: "suits-coords", label: { it: "Completi e coordinati", en: "Suits & co-ords", zh: "套装" } },
];

export const collectionCategories: NavigationCategory[] = [
  { slug: "work", label: { it: "Ufficio", en: "Work", zh: "通勤" }, parent: "collections" },
  { slug: "everyday", label: { it: "Quotidiano", en: "Everyday", zh: "日常" }, parent: "collections" },
  { slug: "travel", label: { it: "Viaggio", en: "Travel", zh: "旅行" }, parent: "collections" },
  { slug: "light-active", label: { it: "Active leggero", en: "Light active", zh: "轻运动" }, parent: "collections" },
  { slug: "evening", label: { it: "Sera", en: "Evening", zh: "晚间" }, parent: "collections" },
];

const collectionTerms: Record<string, string[]> = {
  work: ["ufficio", "work", "commute", "通勤", "城市"],
  everyday: ["quotidiano", "everyday", "daily", "日常"],
  travel: ["viaggio", "travel", "escape", "旅行", "度假"],
  "light-active": ["active", "sport", "move", "运动", "瑜伽"],
  evening: ["sera", "evening", "night", "晚间", "晚宴"],
};

export type CatalogSort = "recommended" | "latest" | "price_asc" | "price_desc";

export function filterCatalog(products: StorefrontProduct[], params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const category = params.get("category");
  const color = params.get("color")?.toLowerCase();
  const size = params.get("size")?.toLowerCase();
  const material = params.get("material")?.toLowerCase();
  const fit = params.get("fit")?.toLowerCase();
  const stock = params.get("stock");
  const collection = params.get("collection");
  const feature = params.get("filter");
  const min = Number(params.get("min") || 0);
  const max = Number(params.get("max") || Number.POSITIVE_INFINITY);
  const filtered = products.filter((product) => {
    const searchable = [product.title, product.name_it, product.name_en, product.style_no, product.category_name,
      product.category_name_it, product.category_name_en, product.short_description, product.short_description_it,
      product.short_description_en, product.material, product.fit, product.season].filter(Boolean).join(" ").toLowerCase();
    const quantity = product.variants.reduce((sum, variant) => sum + variant.available_quantity, 0);
    if (query && !searchable.includes(query)) return false;
    if (category && product.category_slug !== category) return false;
    if (color && !product.variants.some((variant) => [variant.color_id, variant.color_name, variant.color_name_it, variant.color_name_en].filter(Boolean).join(" ").toLowerCase().includes(color))) return false;
    if (size && !product.variants.some((variant) => variant.size_name.toLowerCase() === size)) return false;
    if (material && !(product.material ?? "").toLowerCase().includes(material)) return false;
    if (fit && !(product.fit ?? "").toLowerCase().includes(fit)) return false;
    if (product.unit_price < min || product.unit_price > max) return false;
    if (stock === "available" && quantity < 1) return false;
    if (stock === "low" && (quantity < 1 || quantity > 3)) return false;
    if (feature === "new" && !product.is_new) return false;
    if (feature === "bestseller" && !product.is_bestseller) return false;
    if (feature === "sale" && !(product.compare_at_price && product.compare_at_price > product.unit_price)) return false;
    if (collection && !(collectionTerms[collection] ?? [collection]).some((term) => searchable.includes(term))) return false;
    return true;
  });
  const sort = (params.get("sort") ?? "recommended") as CatalogSort;
  return [...filtered].sort((a, b) => {
    if (sort === "price_asc") return a.unit_price - b.unit_price;
    if (sort === "price_desc") return b.unit_price - a.unit_price;
    if (sort === "latest") return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    const score = (product: StorefrontProduct) => Number(product.is_featured) * 8 + Number(product.is_bestseller) * 4 + Number(product.is_new) * 2 + Number(product.variants.some((variant) => variant.available_quantity > 0));
    return score(b) - score(a) || new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
  });
}

export function uniqueProductValues(products: StorefrontProduct[], field: "material" | "fit") {
  return Array.from(new Set(products.map((product) => product[field]?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

export function categoryLabel(slug: string, locale: StoreLocale) {
  return garmentCategories.find((category) => category.slug === slug)?.label[locale] ?? slug;
}
