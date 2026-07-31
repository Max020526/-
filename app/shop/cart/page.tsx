"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { EmptyState } from "@/components/shared/empty-state";

const EMPTY: any[] = [];

export default function Cart() {
  const query = useCallback(async (client: any) => {
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return { data: [], error: null };
    const { data: cart, error: cartError } = await client.from("shopping_carts").select("id").eq("customer_id", auth.user.id).eq("status", "ACTIVE").maybeSingle();
    if (cartError || !cart) return { data: [], error: cartError };
    return client.from("shopping_cart_items").select("id,quantity,unit_price,variant_id,product_variants(sku,colors(name),sizes(name),products(name,product_images(public_url,is_primary)))").eq("cart_id", cart.id).order("created_at");
  }, []);
  const { data } = useSupabaseQuery<any[]>(query, EMPTY);
  const subtotal = data.reduce((total, item) => total + Number(item.unit_price) * item.quantity, 0);

  return <main className="shop-section">
    <div className="section-head"><div><p className="eyebrow">YOUR BAG</p><h2>购物车</h2></div><Link href="/shop"><ArrowLeft size={14}/> 继续购物</Link></div>
    {data.length ? <>
      <section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>颜色</th><th>尺码</th><th>数量</th><th>单价</th><th>小计</th></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td><strong>{item.product_variants?.products?.name}</strong></td><td>{item.product_variants?.colors?.name}</td><td>{item.product_variants?.sizes?.name}</td><td>{item.quantity}</td><td>€ {Number(item.unit_price).toFixed(2)}</td><td>€ {(Number(item.unit_price) * item.quantity).toFixed(2)}</td></tr>)}</tbody></table></div></section>
      <div className="form-actions" style={{ marginTop: 16 }}><strong style={{ marginRight: "auto" }}>商品小计：€ {subtotal.toFixed(2)}</strong><Link className="button primary" href="/shop/checkout">前往结算 <ArrowRight size={15}/></Link></div>
    </> : <EmptyState title="购物车还是空的" description="登录后选择商品颜色与尺码，商品会保存在你的购物车中。"/>}
  </main>;
}
