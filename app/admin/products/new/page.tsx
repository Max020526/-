/* Product previews use local object URLs and therefore cannot use next/image. */
/* eslint-disable @next/next/no-img-element */
"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImagePlus, LoaderCircle, Plus, Save, Send, Trash2 } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

type Lookup = { id: string; name: string; code?: string | null; sort_order?: number };
type VariantRow = {
  key: string;
  color_id: string;
  size_id: string;
  sku: string;
  barcode: string;
  quantity_on_hand: string;
  online_quantity_limit: string;
  low_stock_threshold: string;
  is_active: boolean;
};
type ProductImage = { id: string; file_path: string; public_url: string; image_type: string; is_primary: boolean };

const blankVariant = (): VariantRow => ({
  key: crypto.randomUUID(), color_id: "", size_id: "", sku: "", barcode: "",
  quantity_on_hand: "0", online_quantity_limit: "0", low_stock_threshold: "5", is_active: true,
});

const initialForm = {
  style_no: "", name: "", subtitle: "", brand_name: "", category_id: "", warehouse_id: "",
  season: "", material: "", origin: "Italy", description: "", care_instructions: "", internal_notes: "",
  cost_price: "", wholesale_price: "", suggested_retail_price: "", retail_price: "", sale_price: "",
  tax_rate: "22", slug: "", seo_title: "", seo_description: "", is_new: true, is_featured: false, is_bestseller: false,
};

export default function NewCatalogProductPage() {
  const [form, setForm] = useState(initialForm);
  const [variants, setVariants] = useState<VariantRow[]>([blankVariant()]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [colors, setColors] = useState<Lookup[]>([]);
  const [sizes, setSizes] = useState<Lookup[]>([]);
  const [warehouses, setWarehouses] = useState<Lookup[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    void (async () => {
      const client = getSupabase(); if (!client) return;
      const [categoryResult, colorResult, sizeResult, warehouseResult] = await Promise.all([
        client.from("categories").select("id,name").eq("is_active", true).order("name"),
        client.from("colors").select("id,name,code").eq("is_active", true).order("name"),
        client.from("sizes").select("id,name,sort_order").eq("is_active", true).order("sort_order"),
        client.from("warehouses").select("id,name").eq("is_active", true).order("name"),
      ]);
      setCategories(categoryResult.data ?? []); setColors(colorResult.data ?? []);
      setSizes(sizeResult.data ?? []); setWarehouses(warehouseResult.data ?? []);
      if (warehouseResult.data?.length === 1) setForm((current) => ({ ...current, warehouse_id: warehouseResult.data![0].id }));
    })();
  }, []);

  const checks = useMemo(() => [
    { label: "标准商品资料", done: Boolean(form.style_no && form.name && form.category_id && form.description) },
    { label: "零售价与网址", done: Number(form.retail_price) > 0 && Boolean(form.slug) },
    { label: "至少一个可售规格", done: variants.some((item) => item.color_id && item.size_id && item.sku && Number(item.online_quantity_limit) > 0) },
    { label: "商品主图", done: images.some((item) => item.is_primary) },
    { label: "商品详情图", done: images.some((item) => item.image_type === "DETAIL") },
  ], [form, variants, images]);
  const completion = Math.round(checks.filter((item) => item.done).length / checks.length * 100);

  function updateForm(name: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value })); setPublished(false);
  }
  function updateVariant(key: string, name: keyof VariantRow, value: string | boolean) {
    setVariants((current) => current.map((item) => item.key === key ? { ...item, [name]: value } : item)); setPublished(false);
  }
  function generateSku(item: VariantRow) {
    const color = colors.find((entry) => entry.id === item.color_id);
    const size = sizes.find((entry) => entry.id === item.size_id);
    return [form.style_no, color?.code || color?.name, size?.name].filter(Boolean).join("-").replace(/\s+/g, "").toUpperCase();
  }

  async function saveProduct() {
    const client = getSupabase(); if (!client) { setMessage("系统尚未连接 Supabase。"); return null; }
    setSaving(true); setMessage("");
    const payload = { ...form, slug: form.slug.trim().toLowerCase(), warehouse_id: form.warehouse_id };
    const variantPayload = variants.map(({ key: _key, ...item }) => ({ ...item, sku: item.sku || generateSku({ key: _key, ...item }) }));
    const { data, error } = await client.rpc("save_catalog_product", {
      p_product_id: productId as string, p_product: payload as unknown as Json, p_variants: variantPayload as unknown as Json,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return null; }
    const result = data as { product_id?: string; message?: string } | null;
    const nextId = result?.product_id ?? productId;
    if (nextId) setProductId(nextId);
    setMessage(result?.message ?? "商品草稿已保存");
    return nextId;
  }

  async function loadImages(id: string) {
    const client = getSupabase(); if (!client) return;
    const { data } = await client.from("product_images").select("id,file_path,public_url,image_type,is_primary").eq("product_id", id).order("sort_order");
    setImages((data ?? []) as ProductImage[]);
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>, imageType: "MAIN" | "DETAIL") {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    if (!files.length) return;
    let id = productId;
    if (!id) id = await saveProduct();
    const client = getSupabase(); if (!client || !id) return;
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setMessage("图片只支持 JPG、PNG、WebP，且每张不能超过 10MB。"); return;
    }
    setUploading(true); setMessage("");
    if (imageType === "MAIN") await client.from("product_images").update({ is_primary: false, image_type: "DETAIL" }).eq("product_id", id).eq("is_primary", true);
    for (const [index, file] of files.entries()) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `products/${id}/${imageType.toLowerCase()}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (uploadError) { setMessage(uploadError.message); setUploading(false); return; }
      const { data: url } = client.storage.from("product-images").getPublicUrl(path);
      const { error: insertError } = await client.from("product_images").insert({
        product_id: id, file_path: path, public_url: url.publicUrl, image_type: imageType,
        is_primary: imageType === "MAIN" && index === 0, sort_order: images.length + index,
      });
      if (insertError) { await client.storage.from("product-images").remove([path]); setMessage(insertError.message); setUploading(false); return; }
    }
    await loadImages(id); setUploading(false); setPublished(false); setMessage(imageType === "MAIN" ? "主图上传成功" : "详情图上传成功");
  }

  async function removeImage(image: ProductImage) {
    const client = getSupabase(); if (!client || !productId) return;
    setUploading(true);
    const { error } = await client.storage.from("product-images").remove([image.file_path]);
    if (!error) await client.from("product_images").delete().eq("id", image.id);
    await loadImages(productId); setUploading(false); setPublished(false); setMessage(error?.message ?? "图片已删除");
  }

  async function publishProduct() {
    const id = await saveProduct(); const client = getSupabase(); if (!client || !id) return;
    setSaving(true); setMessage("");
    const { data, error } = await client.rpc("publish_product", { p_product_id: id });
    setSaving(false);
    const result = data as { message?: string } | null;
    setMessage(error?.message ?? result?.message ?? "商品已发布到顾客网站");
    if (!error) setPublished(true);
  }

  return <main className="page catalog-editor-page">
    <PageHead eyebrow="NEW CATALOG PRODUCT" title="新建并发布商品" subtitle="一次填写标准资料、规格、库存与图片；发布后顾客网站自动读取。" action={<Link className="button" href="/admin/products"><ArrowLeft size={15}/>全部商品</Link>}/>
    <SetupBanner/>
    {message && <div className={published || message.includes("成功") || message.includes("保存") ? "notice" : "notice warning"}>{message}</div>}
    <div className="catalog-editor-layout">
      <div className="catalog-editor-main">
        <section className="form-card editor-section">
          <div className="editor-section-head"><span>01</span><div><h2>商品标准信息</h2><p>这些内容会成为管理系统和顾客网站的统一商品主档。</p></div></div>
          <div className="form-grid">
            <div className="field"><label>款号 *</label><input value={form.style_no} onChange={(e) => updateForm("style_no", e.target.value.toUpperCase())} placeholder="例如 NX-30283"/></div>
            <div className="field"><label>商品名称 *</label><input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="例如 云感高腰直筒裤"/></div>
            <div className="field"><label>商品副标题</label><input value={form.subtitle} onChange={(e) => updateForm("subtitle", e.target.value)} placeholder="一句话描述版型或卖点"/></div>
            <div className="field"><label>品牌</label><input value={form.brand_name} onChange={(e) => updateForm("brand_name", e.target.value)} placeholder="新品牌会自动建立"/></div>
            <div className="field"><label>商品分类 *</label><select value={form.category_id} onChange={(e) => updateForm("category_id", e.target.value)}><option value="">请选择分类</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div className="field"><label>默认仓库 *</label><select value={form.warehouse_id} onChange={(e) => updateForm("warehouse_id", e.target.value)}><option value="">请选择仓库</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div className="field"><label>季节</label><input value={form.season} onChange={(e) => updateForm("season", e.target.value)} placeholder="春夏 / 秋冬 / 四季"/></div>
            <div className="field"><label>材质</label><input value={form.material} onChange={(e) => updateForm("material", e.target.value)} placeholder="例如 78% Nylon, 22% Elastane"/></div>
            <div className="field"><label>产地</label><input value={form.origin} onChange={(e) => updateForm("origin", e.target.value)}/></div>
            <div className="field full"><label>商品详细描述 *</label><textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="描述剪裁、触感、穿着场景与核心卖点"/></div>
            <div className="field full"><label>洗涤说明</label><textarea value={form.care_instructions} onChange={(e) => updateForm("care_instructions", e.target.value)} placeholder="例如 30°C 轻柔机洗，反面洗涤，不可漂白"/></div>
          </div>
        </section>

        <section className="form-card editor-section">
          <div className="editor-section-head"><span>02</span><div><h2>价格与网站展示</h2><p>顾客下单价格以这里的发布数据为准，前端不能自行修改。</p></div></div>
          <div className="form-grid">
            <div className="field"><label>成本价 €</label><input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => updateForm("cost_price", e.target.value)}/></div>
            <div className="field"><label>批发价 €</label><input type="number" min="0" step="0.01" value={form.wholesale_price} onChange={(e) => updateForm("wholesale_price", e.target.value)}/></div>
            <div className="field"><label>建议零售价 €</label><input type="number" min="0" step="0.01" value={form.suggested_retail_price} onChange={(e) => updateForm("suggested_retail_price", e.target.value)}/></div>
            <div className="field"><label>网站零售价 € *</label><input type="number" min="0" step="0.01" value={form.retail_price} onChange={(e) => updateForm("retail_price", e.target.value)}/></div>
            <div className="field"><label>促销价 €</label><input type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => updateForm("sale_price", e.target.value)} placeholder="留空表示不促销"/></div>
            <div className="field"><label>税率 %</label><input type="number" min="0" value={form.tax_rate} onChange={(e) => updateForm("tax_rate", e.target.value)}/></div>
            <div className="field"><label>商品网址 Slug *</label><div className="inline-field"><input value={form.slug} onChange={(e) => updateForm("slug", e.target.value.toLowerCase())} placeholder="例如 cloud-pants-30283"/><button type="button" onClick={() => updateForm("slug", `item-${form.style_no.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`)}>生成</button></div></div>
            <div className="field"><label>SEO 标题</label><input value={form.seo_title} onChange={(e) => updateForm("seo_title", e.target.value)}/></div>
            <div className="field full"><label>SEO 描述</label><textarea value={form.seo_description} onChange={(e) => updateForm("seo_description", e.target.value)}/></div>
          </div>
          <div className="flag-grid"><label><input type="checkbox" checked={form.is_new} onChange={(e) => updateForm("is_new", e.target.checked)}/><span><b>新品</b><small>显示新品标记</small></span></label><label><input type="checkbox" checked={form.is_featured} onChange={(e) => updateForm("is_featured", e.target.checked)}/><span><b>首页推荐</b><small>优先展示</small></span></label><label><input type="checkbox" checked={form.is_bestseller} onChange={(e) => updateForm("is_bestseller", e.target.checked)}/><span><b>畅销商品</b><small>显示畅销标记</small></span></label></div>
        </section>

        <section className="form-card editor-section">
          <div className="editor-section-head"><span>03</span><div><h2>颜色、尺码与库存</h2><p>每一行是一个可销售 SKU，线上数量不能高于实际库存。</p></div><button className="button" type="button" onClick={() => setVariants((current) => [...current, blankVariant()])}><Plus size={14}/>添加规格</button></div>
          <div className="variant-editor-list">{variants.map((item, index) => <div className="variant-editor-row" key={item.key}><div className="variant-number">{String(index + 1).padStart(2, "0")}</div><div className="field"><label>颜色 *</label><select value={item.color_id} onChange={(e) => updateVariant(item.key, "color_id", e.target.value)}><option value="">选择颜色</option>{colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select></div><div className="field"><label>尺码 *</label><select value={item.size_id} onChange={(e) => updateVariant(item.key, "size_id", e.target.value)}><option value="">选择尺码</option>{sizes.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}</select></div><div className="field"><label>SKU *</label><div className="inline-field"><input value={item.sku} onChange={(e) => updateVariant(item.key, "sku", e.target.value.toUpperCase())}/><button type="button" onClick={() => updateVariant(item.key, "sku", generateSku(item))}>生成</button></div></div><div className="field"><label>条形码</label><input value={item.barcode} onChange={(e) => updateVariant(item.key, "barcode", e.target.value)}/></div><div className="field"><label>实际库存</label><input type="number" min="0" value={item.quantity_on_hand} onChange={(e) => updateVariant(item.key, "quantity_on_hand", e.target.value)}/></div><div className="field"><label>线上可售</label><input type="number" min="0" value={item.online_quantity_limit} onChange={(e) => updateVariant(item.key, "online_quantity_limit", e.target.value)}/></div><div className="field"><label>库存预警</label><input type="number" min="0" value={item.low_stock_threshold} onChange={(e) => updateVariant(item.key, "low_stock_threshold", e.target.value)}/></div><button className="icon-btn danger-icon" type="button" aria-label="删除规格" disabled={variants.length === 1} onClick={() => setVariants((current) => current.filter((row) => row.key !== item.key))}><Trash2 size={14}/></button></div>)}</div>
        </section>

        <section className="form-card editor-section">
          <div className="editor-section-head"><span>04</span><div><h2>商品图片</h2><p>先保存商品草稿，再上传一张主图和至少一张详情图。</p></div></div>
          {!productId && <div className="notice warning">点击下方“保存草稿”后即可上传图片，已填写内容不会丢失。</div>}
          <div className="image-upload-grid"><label className={`image-upload-card ${!productId ? "disabled" : ""}`}><ImagePlus/><b>上传或更换主图</b><span>建议竖版 4:5，作为商品列表首图</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={!productId || uploading} onChange={(e) => uploadImages(e, "MAIN")}/></label><label className={`image-upload-card ${!productId ? "disabled" : ""}`}><ImagePlus/><b>上传详情图</b><span>可多选，展示面料、细节和穿着效果</span><input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!productId || uploading} onChange={(e) => uploadImages(e, "DETAIL")}/></label></div>
          {images.length > 0 && <div className="editor-image-grid">{images.map((image) => <div className="editor-image" key={image.id}><img src={image.public_url} alt="商品图片"/><span>{image.is_primary ? "主图" : "详情"}</span><button className="icon-btn" onClick={() => removeImage(image)}><Trash2 size={14}/></button></div>)}</div>}
        </section>
      </div>

      <aside className="catalog-editor-aside"><div className="publish-card"><div className="publish-progress"><strong>{completion}%</strong><span>发布完成度</span></div><div className="progress-bar"><i style={{ width: `${completion}%` }}/></div><div className="publish-checks">{checks.map((item) => <div className={item.done ? "done" : ""} key={item.label}><i>{item.done && <Check size={12}/>}</i><span>{item.label}</span></div>)}</div><div className="publish-actions"><button className="button" disabled={saving || uploading} onClick={saveProduct}>{saving ? <LoaderCircle size={15}/> : <Save size={15}/>}保存草稿</button><button className="button primary" disabled={saving || uploading} onClick={publishProduct}>{saving ? <LoaderCircle size={15}/> : <Send size={15}/>}发布到顾客网站</button></div>{productId && <Link className="text-action" href={`/admin/products/${productId}`}>打开商品详细管理页</Link>}{published && <div className="published-confirm"><Check size={15}/><span>顾客网站已更新</span></div>}</div></aside>
    </div>
  </main>;
}
