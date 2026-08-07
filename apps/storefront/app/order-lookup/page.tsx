"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderLookupPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [token, setToken] = useState("");
  return <main className="account-simple-page"><section className="account-panel"><p className="section-kicker">ORDER LOOKUP</p><h1>查询访客订单</h1><p>输入下单成功页保存的订单识别码与安全查询码。登录账户的订单请直接进入“我的订单”。</p><form onSubmit={(event) => { event.preventDefault(); if (orderId && token) router.push(`/order-confirmation/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`); }}><label>订单识别码<input value={orderId} onChange={(event) => setOrderId(event.target.value.trim())} placeholder="UUID" required /></label><label>安全查询码<input value={token} onChange={(event) => setToken(event.target.value.trim())} required /></label><button>查询订单</button></form></section></main>;
}
