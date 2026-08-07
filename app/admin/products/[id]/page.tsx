"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, EyeOff, LoaderCircle, Plus, Save, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductImageManager } from "@/components/products/product-image-manager";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";
import { firstValidationMessage, productOperationsSchema, productPriceSchema } from "@/lib/validation/product-operations";
import type { Json } from "@/types/database";
import type { LookupOption, ProductOperationsRecord, PublicationIssue } from "@/types/product-operations";

type Channel = { id: string; code: string; name: string; currency: string; is_active: boolean };
type PriceBook = { id: string; channel_id: string; currency: string; is_default: boolean };
type PriceItem = { id: string; price_book_id: string; variant_id: string | null; unit_price: number; compare_at_price: number | null };
type Publication = { id: string; channel_id: string; status: string; validation_errors: Json; scheduled_at: string | null; published_at: string | null };
type Audit = { id: string; action: string; entity_type: string; created_at: string; new_data: Json | null; old_data: Json | null };

const tabs = ["基础资料", "SKU 规格", "图片媒体", "渠道价格与发布", "操作审计"] as const;
const emptyDetails = {
  name_zh: "", name_it: "", name_en: "", internal_name: "", category_id: "", subcategory_id: "",
  brand_id: "", supplier_id: "", season: "", year: "", gender: "", material: "", fit: "",
  thickness: "", elasticity: "", origin_country: "", washing_instructions: "",
  short_description_zh: "", short_description_it: "", short_description_en: "",
  description_zh: "", description_it: "", description_en: "", slug: "",
  seo_title_zh: "", seo_title_it: "", seo_title_en: "",
  seo_description_zh: "", seo_description_it: "", seo_description_en: "",
  is_new: true, is_featured: false, is_bestseller: false, internal_notes: "",
};

function issuesFrom(value: Json): PublicationIssue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { code: string; field: string; message: string } =>
    Boolean(item && typeof item === "object" && !Array.isArray(item)
      && typeof item.code === "string" && typeof item.field === "string" && typeof item.message === "string"),
  );
}

export default function ProductOperationsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [product, setProduct] = useState<ProductOperationsRecord | null>(null);
  const [details, setDetails] = useState(emptyDetails);
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [brands, setBrands] = useState<LookupOption[]>([]);
  const [suppliers, setSuppliers] = useState<LookupOption[]>([]);
  const [colors, setColors] = useState<LookupOption[]>([]);
  const [sizes, setSizes] = useState<LookupOption[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [books, setBooks] = useState<PriceBook[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [price, setPrice] = useState({ unit_price: "", compare_at_price: "" });
  const [variant, setVariant] = useState({ color_id: "", size_id: "", sku: "", barcode: "", is_visible_online: true });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase();
    if (!client) { setLoading(false); return; }
    setLoading(true);
    const [productResult, categoryResult, brandResult, supplierResult, colorResult, sizeResult,
      channelResult, bookResult, priceResult, publicationResult, auditResult] = await Promise.all([
      client.from("products").select("*,product_variants(*,colors(name,name_zh,code),sizes(name)),product_images(*)").eq("id", id).single(),
      client.from("categories").select("id,name").eq("is_active", true).order("name"),
      client.from("brands").select("id,name").order("name"),
      client.from("suppliers").select("id,name").eq("is_active", true).order("name"),
      client.from("colors").select("id,name,code").eq("is_active", true).order("name"),
      client.from("sizes").select("id,name").eq("is_active", true).order("sort_order"),
      client.from("channels").select("id,code,name,currency,is_active").eq("is_active", true).order("name"),
      client.from("price_books").select("id,channel_id,currency,is_default").eq("is_active", true),
      client.from("price_book_items").select("id,price_book_id,variant_id,unit_price,compare_at_price").eq("product_id", id).eq("is_active", true),
      client.from("product_publications").select("id,channel_id,status,validation_errors,scheduled_at,published_at").eq("product_id", id),
      client.from("audit_logs").select("id,action,entity_type,created_at,new_data,old_data").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (productResult.error) {
      setMessage(friendlyError(productResult.error, "商品资料读取失败。"));
      setProduct(null);
    } else {
      const nextProduct = productResult.data as unknown as ProductOperationsRecord;
      setProduct(nextProduct);
      setDetails({
        name_zh: nextProduct.name_zh ?? nextProduct.name ?? "", name_it: nextProduct.name_it ?? "", name_en: nextProduct.name_en ?? "",
        internal_name: nextProduct.internal_name ?? "", category_id: nextProduct.category_id ?? "", subcategory_id: nextProduct.subcategory_id ?? "",
        brand_id: nextProduct.brand_id ?? "", supplier_id: nextProduct.supplier_id ?? "", season: nextProduct.season ?? "",
        year: nextProduct.year?.toString() ?? "", gender: nextProduct.gender ?? "", material: nextProduct.material ?? "",
        fit: nextProduct.fit ?? "", thickness: nextProduct.thickness ?? "", elasticity: nextProduct.elasticity ?? "",
        origin_country: nextProduct.origin_country ?? nextProduct.origin ?? "", washing_instructions: nextProduct.washing_instructions ?? nextProduct.care_instructions ?? "",
        short_description_zh: nextProduct.short_description_zh ?? "", short_description_it: nextProduct.short_description_it ?? "", short_description_en: nextProduct.short_description_en ?? "",
        description_zh: nextProduct.description_zh ?? "", description_it: nextProduct.description_it ?? "", description_en: nextProduct.description_en ?? "",
        slug: nextProduct.slug ?? "", seo_title_zh: nextProduct.seo_title_zh ?? "", seo_title_it: nextProduct.seo_title_it ?? "", seo_title_en: nextProduct.seo_title_en ?? "",
        seo_description_zh: nextProduct.seo_description_zh ?? "", seo_description_it: nextProduct.seo_description_it ?? "", seo_description_en: nextProduct.seo_description_en ?? "",
        is_new: nextProduct.is_new ?? true, is_featured: nextProduct.is_featured ?? false, is_bestseller: nextProduct.is_bestseller ?? false,
        internal_notes: nextProduct.internal_notes ?? "",
      });
    }
    setCategories(categoryResult.data ?? []); setBrands(brandResult.data ?? []); setSuppliers(supplierResult.data ?? []);
    setColors(colorResult.data ?? []); setSizes(sizeResult.data ?? []);
    const nextChannels = (channelResult.data ?? []) as Channel[];
    setChannels(nextChannels); setBooks((bookResult.data ?? []) as PriceBook[]); setPrices((priceResult.data ?? []) as PriceItem[]);
    setPublications((publicationResult.data ?? []) as Publication[]); setAudits((auditResult.data ?? []) as Audit[]);
    setSelectedChannelId((current) => current || nextChannels[0]?.id || "");
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const book = books.find((item) => item.channel_id === selectedChannelId && item.is_default);
    const item = prices.find((entry) => entry.price_book_id === book?.id && !entry.variant_id);
    setPrice({ unit_price: item?.unit_price?.toString() ?? "", compare_at_price: item?.compare_at_price?.toString() ?? "" });
  }, [books, prices, selectedChannelId]);

  const selectedChannel = channels.find((item) => item.id === selectedChannelId);
  const publication = publications.find((item) => item.channel_id === selectedChannelId);
  const publicationIssues = issuesFrom(publication?.validation_errors ?? []);
  const mainImageCount = product?.product_images?.filter((image) => !image.deleted_at && image.is_primary).length ?? 0;
  const completion = useMemo(() => {
    if (!product) return 0;
    const checks = [details.name_zh, details.category_id, details.description_zh, details.slug,
      mainImageCount > 0, (product.product_variants?.length ?? 0) > 0, Number(price.unit_price) > 0];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }, [details, mainImageCount, price.unit_price, product]);

  function changeDetail(name: keyof typeof emptyDetails, value: string | boolean) {
    setDetails((current) => ({ ...current, [name]: value }));
  }

  async function saveDetails() {
    const parsed = productOperationsSchema.safeParse(details);
    if (!parsed.success) { setMessage(firstValidationMessage(parsed.error)); return; }
    const client = getSupabase(); if (!client) return;
    setWorking(true); setMessage("");
    const { error } = await client.rpc("rpc_save_product_operations", { p_product_id: id, p_payload: parsed.data as unknown as Json });
    setWorking(false);
    setMessage(error ? friendlyError(error, "商品资料保存失败。") : "商品资料已保存");
    if (!error) void load();
  }

  function suggestedSku() {
    const color = colors.find((item) => item.id === variant.color_id);
    const size = sizes.find((item) => item.id === variant.size_id);
    return [product?.style_no, color?.code || color?.name, size?.code || size?.name]
      .filter(Boolean).join("-").replace(/\s+/g, "").toUpperCase();
  }

  async function addVariant() {
    const client = getSupabase();
    if (!client || !variant.color_id || !variant.size_id) { setMessage("请选择颜色和尺码。"); return; }
    const sku = (variant.sku || suggestedSku()).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,100}$/.test(sku)) { setMessage("SKU 格式无效。"); return; }
    setWorking(true); setMessage("");
    const { error } = await client.rpc("rpc_upsert_product_variant", {
      p_product_id: id, p_color_id: variant.color_id, p_size_id: variant.size_id,
      p_sku: sku, ...(variant.barcode ? { p_barcode: variant.barcode } : {}), p_is_active: true,
      p_is_visible_online: variant.is_visible_online, p_sort_order: product?.product_variants?.length ?? 0,
    });
    setWorking(false);
    setMessage(error ? friendlyError(error, "SKU 创建失败。") : "SKU 已创建；库存仍需通过入库或调整流程变化。");
    if (!error) { setVariant({ color_id: "", size_id: "", sku: "", barcode: "", is_visible_online: true }); void load(); }
  }

  async function toggleVariant(variantId: string, nextVisible: boolean) {
    const current = product?.product_variants?.find((item) => item.id === variantId);
    const client = getSupabase(); if (!client || !current) return;
    setWorking(true);
    const { error } = await client.rpc("rpc_upsert_product_variant", {
      p_product_id: id, p_variant_id: current.id, p_color_id: current.color_id, p_size_id: current.size_id,
      p_sku: current.sku, ...(current.barcode ? { p_barcode: current.barcode } : {}), p_is_active: current.is_active,
      p_is_visible_online: nextVisible, p_sort_order: current.sort_order ?? 0,
    });
    setWorking(false); setMessage(error ? friendlyError(error, "SKU 状态更新失败。") : "SKU 渠道可见性已更新");
    if (!error) void load();
  }

  async function savePrice() {
    const parsed = productPriceSchema.safeParse(price);
    if (!parsed.success) { setMessage(firstValidationMessage(parsed.error)); return; }
    const client = getSupabase(); if (!client || !selectedChannelId) return;
    setWorking(true); setMessage("");
    const { error } = await client.rpc("rpc_set_product_channel_price", {
      p_product_id: id, p_channel_id: selectedChannelId,
      p_unit_price: parsed.data.unit_price,
      ...(parsed.data.compare_at_price === "" ? {} : { p_compare_at_price: parsed.data.compare_at_price }),
    });
    setWorking(false); setMessage(error ? friendlyError(error, "渠道价格保存失败。") : "渠道价格已保存");
    if (!error) void load();
  }

  async function publicationAction(action: "validate" | "publish" | "unpublish") {
    const client = getSupabase(); if (!client || !selectedChannelId) return;
    setWorking(true); setMessage("");
    const result = action === "validate"
      ? await client.rpc("rpc_validate_product_publication", { p_product_id: id, p_channel_id: selectedChannelId })
      : action === "publish"
        ? await client.rpc("rpc_publish_product_channel", { p_product_id: id, p_channel_id: selectedChannelId })
        : await client.rpc("rpc_unpublish_product_channel", { p_product_id: id, p_channel_id: selectedChannelId });
    setWorking(false);
    const labels = { validate: "发布检查已完成", publish: "商品已发布到所选渠道", unpublish: "商品已从所选渠道下架" };
    const payload = result.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? result.data as { ok?: boolean; errors?: Json }
      : null;
    const blocked = payload?.ok === false;
    setMessage(result.error
      ? friendlyError(result.error, "渠道操作失败。")
      : blocked ? "发布检查未通过，请按下方清单补充资料。" : labels[action]);
    void load();
  }

  if (loading) return <main className="page"><div className="empty"><LoaderCircle/></div></main>;
  if (!product) return <main className="page"><SetupBanner/><EmptyState title="未找到商品" description="请检查商品是否已删除，或当前账号是否拥有访问权限。"/></main>;

  return <main className="page">
    <PageHead eyebrow="PRODUCT OPERATIONS" title={details.name_zh || product.style_no} subtitle={`型号 ${product.style_no} · 完善度 ${completion}% · 库存仅在库存模块调整`} action={<Link className="button" href="/admin/products"><ArrowLeft size={15}/>返回商品队列</Link>}/>
    <SetupBanner/>
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 15 }}><StatusBadge value={product.workflow_status ?? product.status} label={product.workflow_status ?? product.status}/><span className="muted">最后更新 {new Date(product.updated_at).toLocaleString("zh-CN")}</span></div>
    <div className="tabs">{tabs.map((item) => <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div>
    {message && <div className={message.includes("失败") || message.includes("无效") || message.includes("请选择") ? "notice warning" : "notice"} role="status">{message}</div>}

    {tab === "基础资料" && <section className="form-card">
      <div className="panel-head"><div><h2>统一商品主档</h2><p>中文为第一语言；意大利语和英语使用同一字段模型，不复制商品记录。</p></div></div>
      <div className="form-grid">
        <div className="field"><label>商品型号</label><input value={product.style_no} disabled/></div>
        <div className="field"><label>内部名称</label><input value={details.internal_name} onChange={(event) => changeDetail("internal_name", event.target.value)}/></div>
        <div className="field"><label>中文名称 *</label><input value={details.name_zh} onChange={(event) => changeDetail("name_zh", event.target.value)}/></div>
        <div className="field"><label>意大利语名称</label><input value={details.name_it} onChange={(event) => changeDetail("name_it", event.target.value)}/></div>
        <div className="field"><label>英语名称</label><input value={details.name_en} onChange={(event) => changeDetail("name_en", event.target.value)}/></div>
        <div className="field"><label>商品分类 *</label><select value={details.category_id} onChange={(event) => changeDetail("category_id", event.target.value)}><option value="">请选择</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>品牌</label><select value={details.brand_id} onChange={(event) => changeDetail("brand_id", event.target.value)}><option value="">无品牌</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>供应商</label><select value={details.supplier_id} onChange={(event) => changeDetail("supplier_id", event.target.value)}><option value="">未指定</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>季节</label><input value={details.season} onChange={(event) => changeDetail("season", event.target.value)}/></div>
        <div className="field"><label>年份</label><input inputMode="numeric" value={details.year} onChange={(event) => changeDetail("year", event.target.value.replace(/\D/g, "").slice(0, 4))}/></div>
        <div className="field"><label>适用人群</label><input value={details.gender} onChange={(event) => changeDetail("gender", event.target.value)}/></div>
        <div className="field"><label>版型</label><input value={details.fit} onChange={(event) => changeDetail("fit", event.target.value)}/></div>
        <div className="field"><label>厚度</label><input value={details.thickness} onChange={(event) => changeDetail("thickness", event.target.value)}/></div>
        <div className="field"><label>弹性</label><input value={details.elasticity} onChange={(event) => changeDetail("elasticity", event.target.value)}/></div>
        <div className="field full"><label>材质</label><input value={details.material} onChange={(event) => changeDetail("material", event.target.value)}/></div>
        <div className="field"><label>产地</label><input value={details.origin_country} onChange={(event) => changeDetail("origin_country", event.target.value)}/></div>
        <div className="field"><label>URL Slug *</label><input value={details.slug} onChange={(event) => changeDetail("slug", event.target.value.toLowerCase())} placeholder="例如 cloud-pants-30283"/></div>
        {(["zh", "it", "en"] as const).map((language) => <div className="field full" key={language}><label>{language === "zh" ? "中文" : language === "it" ? "意大利语" : "英语"}简短描述</label><textarea value={details[`short_description_${language}`]} onChange={(event) => changeDetail(`short_description_${language}`, event.target.value)}/></div>)}
        {(["zh", "it", "en"] as const).map((language) => <div className="field full" key={language}><label>{language === "zh" ? "中文" : language === "it" ? "意大利语" : "英语"}详细描述{language === "zh" ? " *" : ""}</label><textarea value={details[`description_${language}`]} onChange={(event) => changeDetail(`description_${language}`, event.target.value)}/></div>)}
        <div className="field full"><label>洗涤说明</label><textarea value={details.washing_instructions} onChange={(event) => changeDetail("washing_instructions", event.target.value)}/></div>
        <div className="field full"><label>内部备注（不会公开）</label><textarea value={details.internal_notes} onChange={(event) => changeDetail("internal_notes", event.target.value)}/></div>
      </div>
      <div className="flag-grid"><label><input type="checkbox" checked={details.is_new} onChange={(event) => changeDetail("is_new", event.target.checked)}/><span><b>新品</b><small>公开展示新品标记</small></span></label><label><input type="checkbox" checked={details.is_featured} onChange={(event) => changeDetail("is_featured", event.target.checked)}/><span><b>推荐</b><small>可供商城推荐位使用</small></span></label><label><input type="checkbox" checked={details.is_bestseller} onChange={(event) => changeDetail("is_bestseller", event.target.checked)}/><span><b>畅销</b><small>可供渠道排序使用</small></span></label></div>
      <div className="form-actions"><button className="button primary" disabled={working} onClick={saveDetails}>{working ? <LoaderCircle size={15}/> : <Save size={15}/>}保存商品资料</button></div>
    </section>}

    {tab === "SKU 规格" && <section className="panel">
      <div className="panel-head"><div><h2>颜色与尺码 SKU</h2><p>这里只管理 SKU 主数据与渠道可见性；实际库存只能通过入库、退货或库存调整流水改变。</p></div></div>
      <div className="panel-body"><div className="form-grid">
        <div className="field"><label>颜色 *</label><select value={variant.color_id} onChange={(event) => setVariant((current) => ({ ...current, color_id: event.target.value, sku: "" }))}><option value="">请选择</option>{colors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>尺码 *</label><select value={variant.size_id} onChange={(event) => setVariant((current) => ({ ...current, size_id: event.target.value, sku: "" }))}><option value="">请选择</option>{sizes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>SKU</label><input value={variant.sku} onChange={(event) => setVariant((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} placeholder={suggestedSku() || "自动建议"}/></div>
        <div className="field"><label>条码</label><input value={variant.barcode} onChange={(event) => setVariant((current) => ({ ...current, barcode: event.target.value }))}/></div>
      </div><div className="form-actions"><button className="button primary" disabled={working} onClick={addVariant}><Plus size={15}/>添加 SKU</button></div></div>
      {product.product_variants?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>SKU</th><th>颜色</th><th>尺码</th><th>条码</th><th>状态</th><th>渠道可见</th></tr></thead><tbody>{product.product_variants.map((item) => <tr key={item.id}><td><strong>{item.sku}</strong></td><td>{item.colors?.name_zh || item.colors?.name || "—"}</td><td>{item.sizes?.name || "—"}</td><td>{item.barcode || "—"}</td><td>{item.is_active ? "启用" : "停用"}</td><td><label><input type="checkbox" checked={item.is_visible_online ?? false} disabled={working} onChange={(event) => toggleVariant(item.id, event.target.checked)}/> 显示</label></td></tr>)}</tbody></table></div> : <EmptyState title="还没有 SKU" description="选择颜色和尺码创建首个可售规格。"/>}
    </section>}

    {tab === "图片媒体" && <ProductImageManager productId={id} productName={details.name_zh || product.style_no} images={(product.product_images ?? []).filter((image) => !image.deleted_at)} onChanged={() => void load()} onMessage={setMessage}/>}

    {tab === "渠道价格与发布" && <section className="form-card">
      <div className="panel-head"><div><h2>渠道发布控制</h2><p>每个渠道拥有独立价格与发布记录；一次下架不会删除商品主档或库存。</p></div></div>
      <div className="form-grid">
        <div className="field"><label>销售渠道 *</label><select value={selectedChannelId} onChange={(event) => setSelectedChannelId(event.target.value)}>{channels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></div>
        <div className="field"><label>当前发布状态</label><input value={publication?.status ?? "draft"} disabled/></div>
        <div className="field"><label>销售价 {selectedChannel?.currency ?? "EUR"} *</label><input type="number" min="0.01" step="0.01" value={price.unit_price} onChange={(event) => setPrice((current) => ({ ...current, unit_price: event.target.value }))}/></div>
        <div className="field"><label>划线价 {selectedChannel?.currency ?? "EUR"}</label><input type="number" min="0.01" step="0.01" value={price.compare_at_price} onChange={(event) => setPrice((current) => ({ ...current, compare_at_price: event.target.value }))}/></div>
      </div>
      <div className="form-actions"><button className="button" disabled={working || !selectedChannelId} onClick={savePrice}><Save size={15}/>保存渠道价格</button><button className="button" disabled={working || !selectedChannelId} onClick={() => publicationAction("validate")}><ShieldCheck size={15}/>执行发布检查</button>{publication?.status === "published" ? <button className="button danger" disabled={working} onClick={() => publicationAction("unpublish")}><EyeOff size={15}/>从该渠道下架</button> : <button className="button primary" disabled={working || !selectedChannelId} onClick={() => publicationAction("publish")}><Send size={15}/>发布到该渠道</button>}</div>
      {publicationIssues.length ? <div className="notice warning"><strong>暂时不能发布，还缺少：</strong><ul>{publicationIssues.map((issue) => <li key={`${issue.code}-${issue.field}`}>{issue.message}</li>)}</ul></div> : publication?.validation_errors ? <div className="notice"><CheckCircle2 size={16}/>发布检查已通过</div> : <div className="notice">保存资料和渠道价格后，请先执行发布检查。</div>}
    </section>}

    {tab === "操作审计" && <section className="panel"><div className="panel-head"><div><h2>商品审计记录</h2><p>资料、SKU、媒体、价格与上下架操作均按时间记录。</p></div></div>{audits.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>时间</th><th>操作</th><th>实体</th><th>摘要</th></tr></thead><tbody>{audits.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("zh-CN")}</td><td><strong>{item.action}</strong></td><td>{item.entity_type}</td><td><code>{JSON.stringify(item.new_data)?.slice(0, 160)}</code></td></tr>)}</tbody></table></div> : <EmptyState title="暂无审计记录" description="保存或发布后，记录会自动显示在这里。"/>}</section>}
  </main>;
}
