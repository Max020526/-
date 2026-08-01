"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";
import { firstValidationMessage, productDraftSchema } from "@/lib/validation/product-operations";
import type { Json } from "@/types/database";
import type { LookupOption } from "@/types/product-operations";

const initialForm = {
  model_code: "", name_zh: "", name_it: "", name_en: "", category_id: "",
  brand_id: "", supplier_id: "", season: "", year: "", gender: "", material: "",
};

export default function NewProductDraftPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [brands, setBrands] = useState<LookupOption[]>([]);
  const [suppliers, setSuppliers] = useState<LookupOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void Promise.all([
      client.from("categories").select("id,name").eq("is_active", true).order("name"),
      client.from("brands").select("id,name").order("name"),
      client.from("suppliers").select("id,name").eq("is_active", true).order("name"),
    ]).then(([categoryResult, brandResult, supplierResult]) => {
      setCategories(categoryResult.data ?? []);
      setBrands(brandResult.data ?? []);
      setSuppliers(supplierResult.data ?? []);
    });
  }, []);

  function change(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createDraft() {
    const parsed = productDraftSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(firstValidationMessage(parsed.error));
      return;
    }
    const client = getSupabase();
    if (!client) {
      setMessage("系统尚未连接 Supabase，请先配置环境变量。");
      return;
    }
    setSaving(true);
    setMessage("");
    const { data, error } = await client.rpc("rpc_create_product_draft", {
      p_payload: parsed.data as unknown as Json,
    });
    setSaving(false);
    if (error) {
      setMessage(friendlyError(error, "商品草稿创建失败，请重试。"));
      return;
    }
    const result = data as { product_id?: string } | null;
    if (!result?.product_id) {
      setMessage("商品草稿已保存，但系统没有返回商品编号，请刷新商品列表。");
      return;
    }
    router.push(`/admin/products/${result.product_id}`);
  }

  return <main className="page">
    <PageHead eyebrow="PRODUCT OPERATIONS" title="创建商品草稿" subtitle="这里只建立 SPU 主档，不写库存、不直接发布。颜色、尺码、图片、渠道价格将在商品详情中继续完善。" action={<Link className="button" href="/admin/products"><ArrowLeft size={15}/>返回商品运营</Link>}/>
    <SetupBanner/>
    {message && <div className="notice warning" role="alert">{message}</div>}
    <section className="form-card">
      <div className="panel-head"><div><h2>最小建档信息</h2><p>商品型号必须唯一；保存后进入“资料完善中”队列。</p></div></div>
      <div className="form-grid">
        <div className="field"><label>商品型号 *</label><input autoFocus value={form.model_code} onChange={(event) => change("model_code", event.target.value.toUpperCase())} placeholder="例如 NX-30283" maxLength={50}/></div>
        <div className="field"><label>中文名称</label><input value={form.name_zh} onChange={(event) => change("name_zh", event.target.value)} placeholder="可稍后补充"/></div>
        <div className="field"><label>意大利语名称</label><input value={form.name_it} onChange={(event) => change("name_it", event.target.value)}/></div>
        <div className="field"><label>英语名称</label><input value={form.name_en} onChange={(event) => change("name_en", event.target.value)}/></div>
        <div className="field"><label>分类</label><select value={form.category_id} onChange={(event) => change("category_id", event.target.value)}><option value="">待选择</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>品牌</label><select value={form.brand_id} onChange={(event) => change("brand_id", event.target.value)}><option value="">无品牌 / 待选择</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>供应商</label><select value={form.supplier_id} onChange={(event) => change("supplier_id", event.target.value)}><option value="">待选择</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>季节</label><input value={form.season} onChange={(event) => change("season", event.target.value)} placeholder="春夏 / 秋冬 / 四季"/></div>
        <div className="field"><label>年份</label><input inputMode="numeric" value={form.year} onChange={(event) => change("year", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2026"/></div>
        <div className="field"><label>适用人群</label><input value={form.gender} onChange={(event) => change("gender", event.target.value)} placeholder="女士 / 男士 / 中性"/></div>
        <div className="field full"><label>材质</label><input value={form.material} onChange={(event) => change("material", event.target.value)} placeholder="例如 78% Nylon, 22% Elastane"/></div>
      </div>
      <div className="form-actions"><button className="button primary" disabled={saving} onClick={createDraft}>{saving ? <LoaderCircle size={15}/> : <Save size={15}/>}创建草稿并继续完善</button></div>
    </section>
  </main>;
}
