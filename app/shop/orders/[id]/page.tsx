"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ORDER_STATUS } from "@/lib/constants";

const EMPTY: any[] = [];
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useCallback((client: any) => client.from("orders").select("id,order_no,status,subtotal,shipping_fee,total_amount,fulfillment_type,shipping_address,customer_note,created_at,order_items(id,product_title,sku,color_name,size_name,unit_price,quantity,line_total)").eq("id", id).limit(1), [id]);
  const { data } = useSupabaseQuery<any[]>(query, EMPTY); const order = data[0];
  if (!order) return <main className="shop-section"><EmptyState title="订单不存在或无权查看" description="请返回我的订单确认。"/></main>;
  return <main className="shop-section"><div className="section-head"><div><p className="eyebrow">ORDER {order.order_no}</p><h2>订单详情</h2></div><Link href="/shop/orders"><ArrowLeft size={14}/> 我的订单</Link></div><section className="panel"><div className="panel-head"><div><h2>{order.order_no}</h2><p>{new Date(order.created_at).toLocaleString("zh-CN")}</p></div><StatusBadge value={order.status} label={(ORDER_STATUS as any)[order.status]}/></div><div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>SKU</th><th>颜色</th><th>尺码</th><th>数量</th><th>小计</th></tr></thead><tbody>{order.order_items?.map((item: any) => <tr key={item.id}><td><strong>{item.product_title}</strong></td><td>{item.sku}</td><td>{item.color_name}</td><td>{item.size_name}</td><td>{item.quantity}</td><td>€ {Number(item.line_total).toFixed(2)}</td></tr>)}</tbody></table></div><div className="panel-body"><div style={{ marginLeft: "auto", maxWidth: 330 }}><p style={{ display: "flex", justifyContent: "space-between" }}><span>商品小计</span><strong>€ {Number(order.subtotal).toFixed(2)}</strong></p><p style={{ display: "flex", justifyContent: "space-between" }}><span>配送费</span><strong>€ {Number(order.shipping_fee).toFixed(2)}</strong></p><p style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}><span>合计</span><strong>€ {Number(order.total_amount).toFixed(2)}</strong></p></div></div></section></main>;
}
