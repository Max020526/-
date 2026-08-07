"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Minus, Plus, Ruler, ShoppingBag, Store, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useLocale } from "@/components/locale-provider";
import { productCategoryName, productDescription, productName, productShortDescription, storefrontErrorMessage } from "@/lib/i18n";
import { loadStorefrontProduct } from "@/lib/storefront-data";
import { formatPrice, resolveMediaUrl, type StorefrontProduct } from "@/lib/store-types";

const labels = {
  it: { unavailable: "Articolo non disponibile", unavailableBody: "Potrebbe non essere pubblicato o i dati potrebbero essere in aggiornamento.", back: "Torna al catalogo", imageSoon: "Immagine in arrivo", image: "immagine", color: "Colore", choose: "Seleziona", size: "Taglia", chooseVariant: "Seleziona colore e taglia", add: "Aggiungi alla borsa", added: "Aggiunto alla borsa", soldOut: "Esaurito", available: "Disponibile online", pieces: "pezzi", finalCheck: "La disponibilità viene ricontrollata al checkout.", low: "Solo pochi pezzi disponibili", noStock: "Questa variante è esaurita.", live: "Disponibilità aggiornata automaticamente", iva: "Prezzo IVA inclusa ove applicabile", details: "Dettagli", materialFit: "Composizione e vestibilità", origin: "Paese di origine", care: "Cura", model: "Informazioni modello", modelMissing: "Le informazioni del modello non sono state fornite per questo articolo.", sizeGuide: "Guida taglie e disponibilità", sizeGuideNote: "Sono mostrate le taglie pubblicate e la disponibilità per il colore selezionato. Per misure corporee specifiche, contattaci prima dell'acquisto.", status: "Stato", inStock: "Disponibile", out: "Esaurita", delivery: "Spedizione, ritiro e resi", deliveryBody: "Spedizione in Italia; gratuita da €99. Ritiro disponibile presso il punto vendita di Napoli.", pickupBody: "Il pagamento in negozio è disponibile solo per il ritiro. I resi seguono le condizioni pubblicate sul sito.", returns: "Consulta resi e diritto di recesso", fallback: "Un capo essenziale pensato per essere indossato spesso." },
  en: { unavailable: "Product unavailable", unavailableBody: "It may not be published or its data may be updating.", back: "Back to catalogue", imageSoon: "Image coming soon", image: "image", color: "Colour", choose: "Choose", size: "Size", chooseVariant: "Choose colour and size", add: "Add to bag", added: "Added to bag", soldOut: "Sold out", available: "Available online", pieces: "pieces", finalCheck: "Availability is checked again at checkout.", low: "Only a few pieces left", noStock: "This variant is sold out.", live: "Availability updates automatically", iva: "Price includes VAT where applicable", details: "Details", materialFit: "Composition and fit", origin: "Country of origin", care: "Care", model: "Model information", modelMissing: "Model information has not been provided for this item.", sizeGuide: "Size guide and availability", sizeGuideNote: "Published sizes and availability for the selected colour are shown. Contact us for specific body measurements before purchase.", status: "Status", inStock: "Available", out: "Sold out", delivery: "Delivery, pickup and returns", deliveryBody: "Delivery in Italy; free from €99. Pickup is available at the Naples store.", pickupBody: "Pay in store is available only for pickup. Returns follow the conditions published on this site.", returns: "Read returns and withdrawal", fallback: "An essential piece designed to be worn often." },
  zh: { unavailable: "商品暂不可用", unavailableBody: "它可能尚未发布，或资料正在更新。", back: "返回商品页", imageSoon: "商品图片即将上线", image: "图片", color: "颜色", choose: "请选择", size: "尺码", chooseVariant: "选择颜色与尺码", add: "加入购物袋", added: "已加入购物袋", soldOut: "暂时售罄", available: "当前网上可售", pieces: "件", finalCheck: "结账时会再次校验库存。", low: "仅剩少量库存", noStock: "该规格暂时无货。", live: "可售状态自动更新", iva: "价格在适用情况下包含 IVA", details: "商品说明", materialFit: "面料成分与版型", origin: "产地", care: "洗护说明", model: "模特信息", modelMissing: "该商品尚未提供模特信息。", sizeGuide: "尺码表与可售状态", sizeGuideNote: "表格展示已发布尺码与所选颜色的实时可售状态；如需身体尺寸建议，请在购买前联系我们。", status: "状态", inStock: "有货", out: "无货", delivery: "配送、自取与退货", deliveryBody: "意大利境内配送，订单满 €99 免运费；支持 Napoli 门店自取。", pickupBody: "仅门店自取支持到店付款；退货以网站公布的条件为准。", returns: "查看退货与撤回权", fallback: "一件适合反复穿着的日常单品。" },
} as const;

export function ProductDetail({ product, error }: { product: StorefrontProduct | null; error: string | null }) {
  const { addItem } = useCart();
  const { locale, href } = useLocale();
  const copy = labels[locale];
  const [liveProduct, setLiveProduct] = useState(product);
  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  useEffect(() => {
    if (!product) return;
    const refresh = async () => { const result = await loadStorefrontProduct(product.slug); if (result.product) setLiveProduct(result.product); };
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [product]);
  const currentProduct = liveProduct ?? product;
  const variants = useMemo(() => currentProduct?.variants ?? [], [currentProduct]);
  const colorName = (variant: typeof variants[number]) => locale === "it" ? variant.color_name_it || variant.color_name : locale === "en" ? variant.color_name_en || variant.color_name : variant.color_name;
  const colors = useMemo(() => Array.from(new Map(variants.map((variant) => [variant.color_id, { id: variant.color_id, name: locale === "it" ? variant.color_name_it || variant.color_name : locale === "en" ? variant.color_name_en || variant.color_name : variant.color_name, hex: variant.hex_value }])).values()), [variants, locale]);
  const effectiveColorId = colorId || colors[0]?.id || "";
  const sizes = useMemo(() => Array.from(new Map(variants.filter((variant) => !effectiveColorId || variant.color_id === effectiveColorId).map((variant) => [variant.size_id, { id: variant.size_id, name: variant.size_name, sort: variant.size_sort_order }])).values()).sort((a, b) => a.sort - b.sort), [variants, effectiveColorId]);
  const selected = variants.find((variant) => variant.color_id === effectiveColorId && variant.size_id === sizeId);
  const allMedia = currentProduct?.media ?? [];
  const selectedVariantIds = new Set(variants.filter((variant) => variant.color_id === effectiveColorId).map((variant) => variant.id));
  const colorMedia = effectiveColorId ? allMedia.filter((item) => item.variant_id && selectedVariantIds.has(item.variant_id)) : [];
  const media = colorMedia.length ? colorMedia : allMedia;
  const currentMedia = media[mediaIndex] ?? media[0];
  const selectedImage = currentMedia ? resolveMediaUrl(currentMedia.media_path) : null;

  if (!currentProduct) return <main className="catalog-empty"><span>N</span><h1>{copy.unavailable}</h1><p>{error ? storefrontErrorMessage(error, locale) : copy.unavailableBody}</p><Link className="primary-link" href={href("/shop")}>{copy.back}</Link></main>;
  const name = productName(currentProduct, locale);
  const description = productDescription(currentProduct, locale) || copy.fallback;
  const shortDescription = productShortDescription(currentProduct, locale) || copy.fallback;
  const add = () => {
    if (!selected || selected.available_quantity < quantity) return;
    addItem({ variantId: selected.id, slug: currentProduct.slug, title: name, image: selectedImage, color: colorName(selected), size: selected.size_name, unitPrice: currentProduct.unit_price, quantity });
    setAdded(true);
  };
  const available = variants.some((variant) => variant.available_quantity > 0);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org", "@type": "Product", name, sku: currentProduct.style_no,
    image: allMedia.map((item) => resolveMediaUrl(item.media_path)), description,
    brand: { "@type": "Brand", name: currentProduct.brand_name || "NEXORA STUDIO" },
    category: productCategoryName(currentProduct, locale) || undefined,
    offers: { "@type": "Offer", url: `${siteUrl}/product/${currentProduct.slug}?lang=${locale}`, priceCurrency: "EUR", price: currentProduct.unit_price, availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition" },
  };
  return <main className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><Link className="back-link" href={href("/shop")}><ArrowLeft /> {copy.back}</Link><div className="product-detail"><div className="detail-media-column"><div className="detail-media">{selectedImage ? <Image src={selectedImage} alt={currentMedia?.alt_text ?? name} width={1200} height={1500} priority /> : <div className="product-fallback large"><span>N</span><small>{copy.imageSoon}</small></div>}</div>{media.length > 1 && <div className="media-thumbnails">{media.map((item, index) => <button type="button" className={index === mediaIndex ? "active" : ""} onClick={() => setMediaIndex(index)} key={item.id}><Image src={resolveMediaUrl(item.media_path)} alt={item.alt_text ?? `${name} ${copy.image} ${index + 1}`} width={160} height={200} /></button>)}</div>}</div><div className="detail-copy"><p className="section-kicker">NEXORA STUDIO / {currentProduct.style_no}</p><h1>{name}</h1><div className="detail-price"><strong>{formatPrice(currentProduct.unit_price, "EUR")}</strong>{currentProduct.compare_at_price && currentProduct.compare_at_price > currentProduct.unit_price && <del>{formatPrice(currentProduct.compare_at_price, "EUR")}</del>}</div><p className="iva-note">{copy.iva}{currentProduct.tax_rate !== null ? ` · ${currentProduct.tax_rate}%` : ""}</p><p className="detail-lead">{shortDescription}</p>
    <div className="option-group"><div><strong>{copy.color}</strong><span>{colors.find((color) => color.id === effectiveColorId)?.name ?? copy.choose}</span></div><div className="swatches">{colors.map((color) => <button type="button" className={color.id === effectiveColorId ? "active" : ""} onClick={() => { setColorId(color.id); setSizeId(""); setMediaIndex(0); setAdded(false); }} key={color.id} aria-label={color.name}><i style={{ background: color.hex || "#d9d4cc" }} />{color.name}</button>)}</div></div>
    <div className="option-group"><div><strong>{copy.size}</strong><span>{selected ? `SKU ${selected.sku}` : copy.chooseVariant}</span></div><div className="sizes">{sizes.map((size) => { const variant = variants.find((item) => item.color_id === effectiveColorId && item.size_id === size.id); return <button type="button" disabled={!variant?.available_quantity} className={size.id === sizeId ? "active" : ""} onClick={() => { setSizeId(size.id); setAdded(false); }} key={size.id}>{size.name}</button>; })}</div></div>
    <div className="buy-row"><div className="quantity"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="-"><Minus /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(10, selected?.available_quantity ?? 10, quantity + 1))} aria-label="+"><Plus /></button></div><button className="add-button" onClick={add} disabled={!selected || selected.available_quantity < quantity}>{added ? <><Check /> {copy.added}</> : <><ShoppingBag /> {!selected ? copy.chooseVariant : selected.available_quantity ? copy.add : copy.soldOut}</>}</button></div>
    <p className={`stock-note ${selected && selected.available_quantity > 0 && selected.available_quantity <= 3 ? "low" : ""}`}>{selected ? selected.available_quantity > 0 ? `${selected.available_quantity <= 3 ? `${copy.low}: ` : ""}${copy.available} ${selected.available_quantity} ${copy.pieces}. ${copy.finalCheck}` : copy.noStock : copy.live}</p>
    <details open><summary>{copy.details}</summary><p>{description}</p></details>{(currentProduct.material || currentProduct.fit) && <details open><summary>{copy.materialFit}</summary><p>{[currentProduct.material, currentProduct.fit].filter(Boolean).join(" · ")}</p></details>}{currentProduct.origin_country && <details><summary>{copy.origin}</summary><p>{currentProduct.origin_country}</p></details>}{currentProduct.care_instructions && <details><summary>{copy.care}</summary><p>{currentProduct.care_instructions}</p></details>}<details><summary>{copy.model}</summary><p>{copy.modelMissing}</p></details>
    <details className="size-guide"><summary><Ruler size={15}/> {copy.sizeGuide}</summary><p>{copy.sizeGuideNote}</p><table><thead><tr><th>{copy.size}</th><th>{copy.status}</th></tr></thead><tbody>{sizes.map((size) => { const variant = variants.find((item) => item.color_id === effectiveColorId && item.size_id === size.id); return <tr key={size.id}><td>{size.name}</td><td>{variant?.available_quantity ? `${copy.inStock} · ${variant.available_quantity}` : copy.out}</td></tr>; })}</tbody></table></details>
    <details open><summary>{copy.delivery}</summary><p><Truck size={15} /> {copy.deliveryBody}</p><p><Store size={15} /> {copy.pickupBody}</p><Link className="inline-legal-link" href={href("/resi-e-recesso")}>{copy.returns}</Link></details></div></div></main>;
}
