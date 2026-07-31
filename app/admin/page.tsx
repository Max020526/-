"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowRight, Boxes, CircleDollarSign, ClipboardList, PackageCheck, ShoppingBag, TrendingUp, TriangleAlert, Warehouse } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { ORDER_STATUS } from "@/lib/constants";

type TrendDay = { key: string; label: string; orders: number; revenue: number };
type Dashboard = {
  products: number; published: number; pending: number; stock: number; low: number;
  todayOrders: number; todayRevenue: number; weekOrders: number; weekRevenue: number;
  trend: TrendDay[]; recentOrders: any[]; statusCounts: Record<string, number>;
};
const EMPTY: Dashboard = { products: 0, published: 0, pending: 0, stock: 0, low: 0, todayOrders: 0, todayRevenue: 0, weekOrders: 0, weekRevenue: 0, trend: [], recentOrders: [], statusCounts: {} };

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }

export default function AdminDashboard() {
  const query = useCallback(async (client: any) => {
    const now = new Date();
    const today = dateKey(now);
    const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    const [products, published, pending, orders, inventory] = await Promise.all([
      client.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
      client.from("products").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      client.from("products").select("id", { count: "exact", head: true }).in("status", ["PENDING_DETAILS", "PENDING_IMAGES", "PENDING_PRICE", "PENDING_REVIEW"]),
      client.from("orders").select("id,order_no,status,total_amount,fulfillment_type,created_at,customers(full_name)").gte("created_at", start.toISOString()).order("created_at", { ascending: false }).limit(300),
      client.from("inventory").select("quantity_on_hand,quantity_available,low_stock_threshold"),
    ]);
    const orderRows = orders.data ?? [];
    const inventoryRows = inventory.data ?? [];
    const trend = Array.from({ length: 7 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); const key = dateKey(day); return { key, label: new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(day), orders: 0, revenue: 0 }; });
    const byDate = Object.fromEntries(trend.map((day) => [day.key, day]));
    const statusCounts: Record<string, number> = {};
    for (const order of orderRows) {
      const key = String(order.created_at).slice(0, 10); const amount = order.status === "CANCELLED" ? 0 : Number(order.total_amount ?? 0);
      if (byDate[key]) { byDate[key].orders += 1; byDate[key].revenue += amount; }
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    }
    return { data: {
      products: products.count ?? 0, published: published.count ?? 0, pending: pending.count ?? 0,
      stock: inventoryRows.reduce((sum: number, row: any) => sum + Number(row.quantity_on_hand ?? 0), 0),
      low: inventoryRows.filter((row: any) => Number(row.quantity_available ?? 0) <= Number(row.low_stock_threshold ?? 0)).length,
      todayOrders: byDate[today]?.orders ?? 0, todayRevenue: byDate[today]?.revenue ?? 0,
      weekOrders: orderRows.length, weekRevenue: orderRows.filter((order: any) => order.status !== "CANCELLED").reduce((sum: number, order: any) => sum + Number(order.total_amount ?? 0), 0),
      trend, recentOrders: orderRows.slice(0, 8), statusCounts,
    }, error: products.error ?? orders.error ?? inventory.error };
  }, []);
  const { data } = useSupabaseQuery<Dashboard>(query, EMPTY);
  const maxRevenue = Math.max(1, ...data.trend.map((day) => day.revenue));

  return <main className="page">
    <PageHead eyebrow="OPERATIONS OVERVIEW" title="管理端数据仪表盘" subtitle="商品、实际库存、网站库存与订单数据集中查看。" action={<Link className="button primary" href="/admin/products/new"><PackageCheck size={15}/>新建并上架商品</Link>}/>
    <SetupBanner/>
    <section className="stats-grid">
      <StatCard label="商品总数" value={data.products} note={`${data.published} 个已在网站上架`} icon={Boxes}/>
      <StatCard label="实际库存" value={data.stock} note={`${data.low} 个低库存 SKU`} icon={Warehouse}/>
      <StatCard label="今日订单" value={data.todayOrders} note={`销售额 € ${data.todayRevenue.toFixed(2)}`} icon={ClipboardList}/>
      <StatCard label="近 7 天销售额" value={`€ ${data.weekRevenue.toFixed(2)}`} note={`${data.weekOrders} 笔订单`} icon={CircleDollarSign}/>
    </section>

    <section className="content-grid">
      <div className="panel"><div className="panel-head"><div><h2>近 7 天经营趋势</h2><p>按订单创建时间统计，已取消订单不计入销售额</p></div></div>{data.trend.length ? <div className="panel-body trend-list">{data.trend.map((day) => <div className="trend-row" key={day.key}><span>{day.label}</span><div className="trend-track"><i style={{ width: `${Math.max(day.revenue ? 6 : 0, day.revenue / maxRevenue * 100)}%` }}/></div><b>€ {day.revenue.toFixed(2)}</b><small>{day.orders} 单</small></div>)}</div> : <EmptyState title="等待第一笔销售数据" description="顾客网站订单会自动进入这里。"/>}</div>
      <aside className="panel"><div className="panel-head"><div><h2>业务待办</h2><p>按影响销售的优先级整理</p></div></div><div className="panel-body quick-list"><Link className="quick-link" href="/admin/products/pending"><span className="quick-icon"><PackageCheck size={18}/></span><span><b>{data.pending} 个待完善商品</b><span>补全资料、价格与图片</span></span><ArrowRight size={15}/></Link><Link className="quick-link" href="/admin/inventory"><span className="quick-icon"><TriangleAlert size={18}/></span><span><b>{data.low} 个低库存 SKU</b><span>调整实际或网站可售库存</span></span><ArrowRight size={15}/></Link><Link className="quick-link" href="/admin/orders"><span className="quick-icon"><TrendingUp size={18}/></span><span><b>{(data.statusCounts.PAID ?? 0) + (data.statusCounts.PICKING ?? 0)} 笔待处理订单</b><span>付款确认、拣货与发货</span></span><ArrowRight size={15}/></Link><a className="quick-link" href="https://nexora-studio-shop.xrx020526.chatgpt.site" target="_blank" rel="noreferrer"><span className="quick-icon"><ShoppingBag size={18}/></span><span><b>打开顾客网站</b><span>查看已发布商品</span></span><ArrowRight size={15}/></a></div></aside>
    </section>

    <section className="panel dashboard-orders"><div className="panel-head"><div><h2>最近订单</h2><p>最新 8 笔顾客网站订单</p></div><Link className="panel-action button small" href="/admin/orders">管理全部订单</Link></div>{data.recentOrders.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>订单号</th><th>顾客</th><th>金额</th><th>配送</th><th>状态</th><th>创建时间</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order.id}><td><strong>{order.order_no}</strong></td><td>{order.customers?.full_name ?? "游客"}</td><td>€ {Number(order.total_amount).toFixed(2)}</td><td>{order.fulfillment_type === "PICKUP" ? "门店自取" : "快递"}</td><td><StatusBadge value={order.status} label={(ORDER_STATUS as Record<string, string>)[order.status] ?? order.status}/></td><td>{new Date(order.created_at).toLocaleString("zh-CN")}</td></tr>)}</tbody></table></div> : <EmptyState title="还没有顾客订单" description="顾客在独立网站提交订单后，会自动显示在管理端。"/>}</section>
  </main>;
}
