"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

type CartItem = { id: string; variant_id: string; quantity: number; unit_price: number; product_variants: any };

export default function Checkout() {
  const router = useRouter();
  const [cartId, setCartId] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [form, setForm] = useState({ full_name: "", phone: "", country: "Italy", city: "", postal_code: "", address_line: "", note: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { void (async () => {
    const client = getSupabase();
    if (!client) { setMessage("商店尚未连接数据库。"); setLoading(false); return; }
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) { router.replace("/login?next=/shop/checkout"); return; }
    const [{ data: customer }, { data: cart, error: cartError }] = await Promise.all([
      client.from("customers").select("full_name,phone").eq("id", auth.user.id).maybeSingle(),
      client.from("shopping_carts").select("id").eq("customer_id", auth.user.id).eq("status", "ACTIVE").maybeSingle(),
    ]);
    setForm((current) => ({ ...current, full_name: customer?.full_name ?? "", phone: customer?.phone ?? "" }));
    if (cartError || !cart) { setMessage(cartError?.message ?? "购物车为空。"); setLoading(false); return; }
    setCartId(cart.id);
    const { data, error } = await client.from("shopping_cart_items").select("id,variant_id,quantity,unit_price,product_variants(sku,colors(name),sizes(name),products(name))").eq("cart_id", cart.id).order("created_at");
    if (error) setMessage(error.message); else setItems((data ?? []) as CartItem[]);
    setLoading(false);
  })(); }, [router]);

  const subtotal = useMemo(() => items.reduce((total, item) => total + Number(item.unit_price) * item.quantity, 0), [items]);

  async function submit() {
    if (!items.length) { setMessage("购物车为空。"); return; }
    if (!form.full_name || !form.phone || (fulfillment === "DELIVERY" && (!form.city || !form.postal_code || !form.address_line))) {
      setMessage("请填写姓名、电话和完整配送地址。"); return;
    }
    const client = getSupabase(); if (!client) return;
    setSaving(true); setMessage("");
    const address = fulfillment === "DELIVERY" ? { full_name: form.full_name, phone: form.phone, country: form.country, city: form.city, postal_code: form.postal_code, address_line: form.address_line } : { full_name: form.full_name, phone: form.phone };
    const { data, error } = await client.rpc("create_online_order", {
      p_items: items.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity })),
      p_fulfillment_type: fulfillment, p_shipping_address: address, p_shipping_fee: 0,
      p_customer_note: form.note, p_idempotency_key: crypto.randomUUID(),
    });
    if (error) { setMessage(error.message); setSaving(false); return; }
    const orderId = (data as { order_id?: string } | null)?.order_id;
    if (!orderId) { setMessage("订单已提交，但未返回订单编号。"); setSaving(false); return; }
    await Promise.all([
      client.from("customers").update({ full_name: form.full_name, phone: form.phone }).eq("id", (await client.auth.getUser()).data.user!.id),
      client.from("shopping_cart_items").delete().eq("cart_id", cartId),
    ]);
    router.push(`/shop/orders/${orderId}`);
  }

  if (loading) return <main className="shop-section"><div className="empty"><div><LoaderCircle className="animate-spin"/><b>正在准备结算</b></div></div></main>;
  return <main className="shop-section">
    <div className="section-head"><div><p className="eyebrow">SECURE CHECKOUT</p><h2>确认订单</h2></div><Link href="/shop/cart"><ArrowLeft size={14}/> 返回购物车</Link></div>
    {!items.length ? <div className="empty"><div><b>购物车为空</b><span>{message || "请先挑选商品。"}</span><Link className="button primary" href="/shop">返回商店</Link></div></div> : <div className="dashboard-grid">
      <section className="form-card"><div className="tabs"><button className={`tab ${fulfillment === "DELIVERY" ? "active" : ""}`} onClick={() => setFulfillment("DELIVERY")}>快递配送</button><button className={`tab ${fulfillment === "PICKUP" ? "active" : ""}`} onClick={() => setFulfillment("PICKUP")}>门店自取</button></div><div className="form-grid">
        <div className="field"><label>收货人 *</label><input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })}/></div>
        <div className="field"><label>联系电话 *</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></div>
        {fulfillment === "DELIVERY" && <><div className="field"><label>国家 *</label><input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}/></div><div className="field"><label>城市 *</label><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}/></div><div className="field"><label>邮编 *</label><input value={form.postal_code} onChange={(event) => setForm({ ...form, postal_code: event.target.value })}/></div><div className="field"><label>详细地址 *</label><input value={form.address_line} onChange={(event) => setForm({ ...form, address_line: event.target.value })}/></div></>}
        <div className="field full"><label>订单备注</label><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })}/></div>
      </div></section>
      <section className="panel"><div className="panel-head"><div><h2>订单摘要</h2><p>{items.length} 个 SKU</p></div></div><div className="panel-body">{items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "10px 0", borderBottom: "1px solid var(--line)" }}><span>{item.product_variants?.products?.name}<small className="muted" style={{ display: "block" }}>{item.product_variants?.colors?.name} / {item.product_variants?.sizes?.name} × {item.quantity}</small></span><strong>€ {(Number(item.unit_price) * item.quantity).toFixed(2)}</strong></div>)}<div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}><span>商品小计</span><strong>€ {subtotal.toFixed(2)}</strong></div><p className="muted" style={{ fontSize: 12 }}>配送费由服务器按店铺设置计算，快递当前 €6.90，自取免费。</p>{message && <div className="notice warning">{message}</div>}<button className="button primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={saving} onClick={submit}>{saving ? <LoaderCircle className="animate-spin" size={16}/> : <LockKeyhole size={16}/>} {saving ? "正在创建订单…" : "提交订单"}</button></div></section>
    </div>}
  </main>;
}
