import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(480px,100%)", textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto 18px" }}><SearchX size={22}/></div>
      <p className="eyebrow">404 · NOT FOUND</p>
      <h1 style={{ margin: "8px 0 10px" }}>没有找到这个页面</h1>
      <p className="muted">地址可能已调整，或该功能尚未在当前阶段开放。</p>
      <Link className="button primary" href="/" style={{ marginTop: 18 }}><ArrowLeft size={15}/>返回主页</Link>
    </section>
  </main>;
}
