import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(480px,100%)", textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto 18px" }}><ShieldAlert size={22}/></div>
      <p className="eyebrow">403 · ACCESS DENIED</p>
      <h1 style={{ margin: "8px 0 10px" }}>当前岗位没有此权限</h1>
      <p className="muted">系统已阻止本次访问。请返回岗位工作区，或联系系统管理员核对角色分配。</p>
      <Link className="button primary" href="/" style={{ marginTop: 18 }}><ArrowLeft size={15}/>返回工作区选择</Link>
    </section>
  </main>;
}
