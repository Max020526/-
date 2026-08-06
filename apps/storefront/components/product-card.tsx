"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { productCategoryName, productName } from "@/lib/i18n";
import { formatPrice, productImage, type StorefrontProduct } from "@/lib/store-types";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { locale, href } = useLocale();
  const image = productImage(product);
  const available = product.variants.reduce((sum, variant) => sum + variant.available_quantity, 0);
  const name = productName(product, locale);
  return <article className="product-card">
    <Link className="product-visual" href={href(`/product/${product.slug}`)}>
      {image ? <Image src={image} alt={product.media[0]?.alt_text ?? name} fill sizes="(max-width: 700px) 50vw, (max-width: 1000px) 33vw, 25vw" /> : <div className="product-fallback"><span>N</span><small>{locale === "it" ? "Immagine in arrivo" : locale === "en" ? "Image coming soon" : "图片即将上线"}</small></div>}
      {product.is_new && <span className="product-badge">{locale === "it" ? "Novità" : locale === "en" ? "New" : "新品"}</span>}
      {!available && <span className="product-badge sold-out">{locale === "it" ? "Esaurito" : locale === "en" ? "Sold out" : "暂时售罄"}</span>}
    </Link>
    <button className="wish-button" aria-label={`${locale === "it" ? "Salva" : locale === "en" ? "Save" : "收藏"} ${name}`} type="button"><Heart /></button>
    <Link className="product-info" href={href(`/product/${product.slug}`)}>
      <h3>{name}</h3>
      <p>{productCategoryName(product, locale) ?? product.style_no}</p>
      <div><strong>{formatPrice(product.unit_price, product.currency)}</strong>{product.compare_at_price && <del>{formatPrice(product.compare_at_price, product.currency)}</del>}</div>
    </Link>
  </article>;
}
