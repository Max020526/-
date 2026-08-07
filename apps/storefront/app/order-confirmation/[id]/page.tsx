"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OrderSummaryCard } from "@/components/order-summary-card";
import { useLocale } from "@/components/locale-provider";
import { getSupabase } from "@/lib/supabase";
import type { StorefrontOrder } from "@/lib/store-types";

export default function OrderConfirmationPage() {
  const { locale } = useLocale();
  const { id } = useParams<{ id: string }>(); const searchParams = useSearchParams();
  const [order, setOrder] = useState<StorefrontOrder | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { const token = searchParams.get("token") ?? window.sessionStorage.getItem(`nexora-order-token:${id}`); void (async () => { const client = getSupabase(); const session = client ? (await client.auth.getSession()).data.session : null; const response = await fetch(`/api/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`, { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} }); const payload = await response.json() as { order?: StorefrontOrder; message?: string }; if (!response.ok || !payload.order) setMessage(payload.message ?? "订单暂时无法查询"); else setOrder(payload.order); })(); }, [id, searchParams]);
  const copy = locale === "it" ? { error: "Impossibile mostrare l'ordine", loading: "Caricamento ordine…" } : locale === "en" ? { error: "Unable to show the order", loading: "Loading order…" } : { error: "无法显示订单", loading: "正在读取订单信息…" };
  return <main className="order-confirmation-page">{order ? <OrderSummaryCard order={order} /> : message ? <div className="catalog-empty"><h1>{copy.error}</h1><p>{copy.error}</p></div> : <div className="product-loading">{copy.loading}</div>}</main>;
}
