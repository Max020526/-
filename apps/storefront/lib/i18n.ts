import type { StorefrontProduct } from "./store-types";

export type StoreLocale = "it" | "en" | "zh";
export type LocalizedText = Record<StoreLocale, string>;

export const localeTags: Record<StoreLocale, string> = { it: "it-IT", en: "en-GB", zh: "zh-CN" };

export function normalizeLocale(value: string | null | undefined): StoreLocale {
  const locale = value?.toLowerCase();
  if (locale?.startsWith("en")) return "en";
  if (locale?.startsWith("zh")) return "zh";
  return "it";
}

export function text(value: LocalizedText, locale: StoreLocale) {
  return value[locale] || value.it;
}

export function productName(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.name_it || product.title : locale === "en" ? product.name_en || product.title : product.title;
}

export function productShortDescription(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.short_description_it || product.short_description : locale === "en" ? product.short_description_en || product.short_description : product.short_description;
}

export function productDescription(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.description_it || product.description : locale === "en" ? product.description_en || product.description : product.description;
}

export function productSeoTitle(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.seo_title_it || productName(product, locale) : locale === "en" ? product.seo_title_en || productName(product, locale) : product.seo_title_zh || productName(product, locale);
}

export function productSeoDescription(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.seo_description_it || productShortDescription(product, locale) : locale === "en" ? product.seo_description_en || productShortDescription(product, locale) : product.seo_description_zh || productShortDescription(product, locale);
}

export function productCategoryName(product: StorefrontProduct, locale: StoreLocale) {
  return locale === "it" ? product.category_name_it || product.category_name : locale === "en" ? product.category_name_en || product.category_name : product.category_name;
}

export function storefrontErrorMessage(error: string | null, locale: StoreLocale) {
  if (!error) return "";
  if (error === "catalog_unavailable") return locale === "it" ? "Impossibile caricare il catalogo. Riprova tra poco." : locale === "en" ? "The catalogue could not be loaded. Please try again shortly." : "暂时无法读取商品，请稍后重试。";
  return error;
}

export const ui = {
  it: {
    announcement: "Spedizione gratuita in Italia da €99 · Ritiro a Napoli",
    women: "Donna", new: "Novità", all: "Tutti i capi", bestsellers: "Più venduti", sale: "Saldi",
    company: "Azienda", search: "Cerca", account: "Account cliente", bag: "Borsa",
    chooseLanguage: "Lingua", close: "Chiudi", openMenu: "Apri menu",
  },
  en: {
    announcement: "Free delivery in Italy from €99 · Naples store pickup",
    women: "Women", new: "New in", all: "All clothing", bestsellers: "Bestsellers", sale: "Sale",
    company: "Company", search: "Search", account: "Customer account", bag: "Bag",
    chooseLanguage: "Language", close: "Close", openMenu: "Open menu",
  },
  zh: {
    announcement: "意大利境内订单满 €99 免运费 · Napoli 门店可自取",
    women: "女装", new: "新品", all: "全部商品", bestsellers: "畅销款", sale: "优惠商品",
    company: "公司信息", search: "搜索", account: "顾客账户", bag: "购物袋",
    chooseLanguage: "语言", close: "关闭", openMenu: "打开菜单",
  },
} as const;
