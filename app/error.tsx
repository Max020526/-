"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(480px,100%)", textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto 18px" }}><TriangleAlert size={22}/></div>
      <p className="eyebrow">APPLICATION ERROR</p>
      <h1 style={{ margin: "8px 0 10px" }}>页面暂时无法完成加载</h1>
      <p className="muted">本次操作没有静默写入业务数据。请重试；若问题持续，请联系管理员查看日志。</p>
      <button className="button primary" style={{ marginTop: 18 }} onClick={reset}><RotateCcw size={15}/>重新加载</button>
    </section>
  </main>;
}
