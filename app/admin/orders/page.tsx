"use client";
import { useCallback } from "react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { ORDER_STATUS } from "@/lib/constants";
const EMPTY:any[]=[];
export default function Orders(){const query=useCallback((c:any)=>c.from("orders").select("id,order_no,status,total_amount,payment_status,fulfillment_type,created_at,customers(full_name,phone)").order("created_at",{ascending:false}).limit(100),[]);const {data}=useSupabaseQuery<any[]>(query,EMPTY);return <main className="page"><PageHead eyebrow="ORDER OPERATIONS" title="订单管理" subtitle="付款、拣货、发货、取消与退款状态都保留完整记录。"/><SetupBanner/><section className="panel">{data.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>订单号</th><th>顾客</th><th>联系电话</th><th>金额</th><th>配送方式</th><th>付款</th><th>状态</th><th>创建时间</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td><strong>{x.order_no}</strong></td><td>{x.customers?.full_name??"游客"}</td><td>{x.customers?.phone??"—"}</td><td>€ {Number(x.total_amount).toFixed(2)}</td><td>{x.fulfillment_type==="PICKUP"?"门店自取":"快递"}</td><td>{x.payment_status}</td><td><StatusBadge value={x.status} label={(ORDER_STATUS as any)[x.status]}/></td><td>{new Date(x.created_at).toLocaleString("zh-CN")}</td></tr>)}</tbody></table></div>:<EmptyState title="还没有网店订单" description="顾客结账后，订单将在事务中占用库存并显示在这里。"/>}</section></main>}
