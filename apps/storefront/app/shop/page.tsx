"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { useLocale } from "@/components/locale-provider";
import { filterCatalog, garmentCategories, uniqueProductValues } from "@/lib/catalog";
import { storefrontErrorMessage } from "@/lib/i18n";
import { loadStorefrontCatalog } from "@/lib/storefront-data";
import type { StorefrontProduct } from "@/lib/store-types";

const PAGE_SIZE = 24;
const labels = {
  it: { kicker: "DONNA / TUTTO", title: "Collezione donna", intro: "Filtra per categoria, taglia, colore, prezzo, disponibilità, tessuto e vestibilità.", search: "Cerca nome o codice articolo", products: "capi", sort: "Ordina", recommended: "Consigliati", latest: "Più recenti", low: "Prezzo crescente", high: "Prezzo decrescente", filters: "Filtri", category: "Categoria", allCategories: "Tutte le categorie", color: "Colore", allColors: "Tutti i colori", size: "Taglia", allSizes: "Tutte le taglie", priceMin: "Prezzo min.", priceMax: "Prezzo max.", stock: "Disponibilità", allStock: "Tutte", available: "Disponibile", lowStock: "Scorte basse", material: "Tessuto", allMaterials: "Tutti i tessuti", fit: "Vestibilità", allFits: "Tutte", clear: "Cancella filtri", apply: "Mostra risultati", loading: "Caricamento di prodotti e disponibilità…", errorTitle: "Il catalogo non è disponibile", retry: "Riprova", emptyTitle: "Nessun articolo trovato", empty: "Modifica o cancella i filtri per vedere gli articoli pubblicati." },
  en: { kicker: "WOMEN / ALL", title: "Women's collection", intro: "Filter by category, size, colour, price, availability, fabric and fit.", search: "Search product name or style", products: "items", sort: "Sort", recommended: "Recommended", latest: "Latest", low: "Price low to high", high: "Price high to low", filters: "Filters", category: "Category", allCategories: "All categories", color: "Colour", allColors: "All colours", size: "Size", allSizes: "All sizes", priceMin: "Min price", priceMax: "Max price", stock: "Availability", allStock: "All", available: "In stock", lowStock: "Low stock", material: "Fabric", allMaterials: "All fabrics", fit: "Fit", allFits: "All fits", clear: "Clear filters", apply: "Show results", loading: "Loading products and availability…", errorTitle: "The catalogue is unavailable", retry: "Retry", emptyTitle: "No items found", empty: "Adjust or clear the filters to see published products." },
  zh: { kicker: "女装 / 全部", title: "女装精选", intro: "按分类、尺码、颜色、价格、库存、面料和版型筛选。", search: "搜索商品名称或款号", products: "件商品", sort: "排序", recommended: "推荐排序", latest: "最新", low: "价格升序", high: "价格降序", filters: "筛选", category: "分类", allCategories: "全部分类", color: "颜色", allColors: "全部颜色", size: "尺码", allSizes: "全部尺码", priceMin: "最低价", priceMax: "最高价", stock: "库存", allStock: "全部", available: "有货", lowStock: "低库存", material: "面料", allMaterials: "全部面料", fit: "版型", allFits: "全部版型", clear: "清除筛选", apply: "显示结果", loading: "正在读取商品与可售库存…", errorTitle: "商品暂时无法读取", retry: "重试", emptyTitle: "没有符合条件的商品", empty: "调整或清除筛选，查看全部已发布商品。" },
} as const;

export default function ShopPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = labels[locale];
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState(searchParams.get("q") ?? "");
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const result = await loadStorefrontCatalog();
    setProducts(result.products); setError(result.error); setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    void loadStorefrontCatalog().then((result) => {
      if (!active) return;
      setProducts(result.products); setError(result.error); setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const clearFilters = () => {
    const next = new URLSearchParams();
    const lang = searchParams.get("lang"); if (lang) next.set("lang", lang);
    setDraftQuery(""); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const filtered = useMemo(() => filterCatalog(products, new URLSearchParams(searchParams.toString())), [products, searchParams]);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const categories = garmentCategories;
  const colors = Array.from(new Map(products.flatMap((product) => product.variants).map((variant) => [variant.color_id, locale === "it" ? variant.color_name_it || variant.color_name : locale === "en" ? variant.color_name_en || variant.color_name : variant.color_name])).entries());
  const sizes = Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.size_name)))).sort();
  const materials = uniqueProductValues(products, "material");
  const fits = uniqueProductValues(products, "fit");
  const filterKeys = ["q", "category", "color", "size", "min", "max", "stock", "material", "fit", "collection", "filter"];
  const activeFilters = filterKeys.some((key) => searchParams.has(key));

  const filterControls = <><label>{copy.category}<select value={searchParams.get("category") ?? ""} onChange={(event) => setParam("category", event.target.value)}><option value="">{copy.allCategories}</option>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.label[locale]}</option>)}</select></label><label>{copy.size}<select value={searchParams.get("size") ?? ""} onChange={(event) => setParam("size", event.target.value)}><option value="">{copy.allSizes}</option>{sizes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>{copy.color}<select value={searchParams.get("color") ?? ""} onChange={(event) => setParam("color", event.target.value)}><option value="">{copy.allColors}</option>{colors.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>{copy.stock}<select value={searchParams.get("stock") ?? ""} onChange={(event) => setParam("stock", event.target.value)}><option value="">{copy.allStock}</option><option value="available">{copy.available}</option><option value="low">{copy.lowStock}</option></select></label><label>{copy.material}<select value={searchParams.get("material") ?? ""} onChange={(event) => setParam("material", event.target.value)}><option value="">{copy.allMaterials}</option>{materials.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>{copy.fit}<select value={searchParams.get("fit") ?? ""} onChange={(event) => setParam("fit", event.target.value)}><option value="">{copy.allFits}</option>{fits.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><div className="price-filter"><label>{copy.priceMin}<input aria-label={copy.priceMin} type="number" min="0" step="1" value={searchParams.get("min") ?? ""} onChange={(event) => setParam("min", event.target.value)} /></label><label>{copy.priceMax}<input aria-label={copy.priceMax} type="number" min="0" step="1" value={searchParams.get("max") ?? ""} onChange={(event) => setParam("max", event.target.value)} /></label></div>{activeFilters && <button type="button" className="clear-filter-button" onClick={clearFilters}><X /> {copy.clear}</button>}<button type="button" className="apply-filter-button" onClick={() => setDrawerOpen(false)}>{copy.apply}</button></>;

  return <main className="catalog-page"><header className="catalog-head"><p className="section-kicker">{copy.kicker}</p><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <form className="catalog-tools" onSubmit={(event) => { event.preventDefault(); setParam("q", draftQuery.trim()); }}><label className="search-field"><Search /><input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} /></label><span>{filtered.length} {copy.products}</span><button type="button" className="mobile-filter-trigger" onClick={() => setDrawerOpen(true)}><SlidersHorizontal /> {copy.filters}</button><label className="sort-field"><SlidersHorizontal /><select value={searchParams.get("sort") ?? "recommended"} onChange={(event) => setParam("sort", event.target.value)} aria-label={copy.sort}><option value="recommended">{copy.recommended}</option><option value="latest">{copy.latest}</option><option value="price_asc">{copy.low}</option><option value="price_desc">{copy.high}</option></select></label></form>
    <aside className={`catalog-filter-drawer ${drawerOpen ? "open" : ""}`} aria-label={copy.filters}><div className="filter-drawer-head"><strong>{copy.filters}</strong><button onClick={() => setDrawerOpen(false)} aria-label={locale === "it" ? "Chiudi filtri" : locale === "en" ? "Close filters" : "关闭筛选"}><X /></button></div><div className="catalog-filter-grid">{filterControls}</div></aside>{drawerOpen && <button className="filter-overlay" aria-label={copy.clear} onClick={() => setDrawerOpen(false)} />}
    {loading ? <div className="product-loading" aria-live="polite">{copy.loading}</div> : error ? <div className="catalog-empty" role="alert"><h2>{copy.errorTitle}</h2><p>{storefrontErrorMessage(error, locale)}</p><button className="primary-link" onClick={() => void load()}><RotateCcw /> {copy.retry}</button></div> : shown.length ? <><div className="product-grid catalog-grid">{shown.map((product) => <ProductCard key={product.id} product={product} />)}</div>{pageCount > 1 && <nav className="pagination" aria-label="Pagine catalogo">{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button className={value === safePage ? "active" : ""} onClick={() => setParam("page", String(value))} key={value}>{value}</button>)}</nav>}</> : <div className="catalog-empty"><span>N</span><h2>{copy.emptyTitle}</h2><p>{copy.empty}</p>{activeFilters && <button className="primary-link" onClick={clearFilters}>{copy.clear}</button>}</div>}
  </main>;
}
