import type { Metadata } from "next";
import { ProductDetail } from "@/components/product-detail";
import { localeTags, normalizeLocale, productSeoDescription, productSeoTitle } from "@/lib/i18n";
import { loadStorefrontProduct } from "@/lib/storefront-data";
import { productImage } from "@/lib/store-types";

export const revalidate = 120;

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = normalizeLocale((await searchParams).lang);
  const { product } = await loadStorefrontProduct(slug);
  if (!product) return { title: locale === "it" ? "Articolo non disponibile" : locale === "en" ? "Product unavailable" : "商品暂不可用", robots: { index: false, follow: false } };
  const image = productImage(product);
  const title = productSeoTitle(product, locale);
  const description = productSeoDescription(product, locale)?.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}?lang=${locale}`, languages: { "it-IT": `/product/${product.slug}?lang=it`, "en-GB": `/product/${product.slug}?lang=en`, "zh-CN": `/product/${product.slug}?lang=zh` } },
    openGraph: { title, description: description ?? undefined, locale: localeTags[locale].replace("-", "_"), type: "website", images: image ? [{ url: image, alt: title }] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { product, error } = await loadStorefrontProduct(slug);
  return <ProductDetail product={product} error={error} />;
}
