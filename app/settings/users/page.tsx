"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, Save } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { EmptyState } from "@/components/shared/empty-state";

type Staff = { id: string; email: string; full_name: string | null; role: string | null; is_active: boolean; created_at: string; last_sign_in_at: string | null };

export default function UsersPage() {
  const [users, setUsers] = useState<Staff[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "employee" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { setLoading(true); const response = await fetch("/api/admin/users", { cache: "no-store" }); const body = await response.json() as { error?: string; users?: Staff[] }; setLoading(false); if (!response.ok) { setMessage(body.error ?? "员工列表加载失败。"); return; } setUsers(body.users ?? []); }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json() as { error?: string }; setBusy(false);
    if (!response.ok) { setMessage(body.error ?? "创建失败。"); return; }
    setForm({ full_name: "", email: "", password: "", role: "employee" }); setMessage("员工账号创建成功，请安全地把临时密码交给员工。"); await load();
  }

  async function update(user: Staff) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(user) });
    const body = await response.json() as { error?: string }; setBusy(false); setMessage(response.ok ? "员工资料已更新。" : body.error ?? "更新失败。"); if (response.ok) await load();
  }

  return <main className="page"><PageHead eyebrow="STAFF ACCESS" title="员工管理" subtitle="创建内部账号、分配员工或管理员角色，并停用离职账号。" action={<button className="button" onClick={() => void load()}><RefreshCw size={15}/>刷新</button>}/>
    <section className="content-grid"><form className="form-card" onSubmit={create}><div className="panel-head" style={{ padding: 0, marginBottom: 16 }}><div><h2>新增员工账号</h2><p>创建后邮箱即为登录账号</p></div></div><div className="form-grid"><div className="field"><label>员工姓名 *</label><input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })}/></div><div className="field"><label>邮箱 *</label><input required type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></div><div className="field"><label>临时密码 *</label><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })}/></div><div className="field"><label>角色</label><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="employee">员工</option><option value="admin">管理员</option></select></div></div><button className="button primary" disabled={busy} style={{ marginTop: 16 }}>{busy ? <LoaderCircle size={15}/> : <Plus size={15}/>}创建账号</button></form>
      <section className="panel"><div className="panel-head"><div><h2>内部账号</h2><p>共 {users.length} 个</p></div></div>{message && <div className="panel-body"><p className="notice">{message}</p></div>}{loading ? <div className="panel-body muted">正在加载…</div> : users.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>姓名 / 邮箱</th><th>角色</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead><tbody>{users.map((user, index) => <tr key={user.id}><td><input aria-label="姓名" value={user.full_name ?? ""} onChange={(event) => setUsers((items) => items.map((item, i) => i === index ? { ...item, full_name: event.target.value } : item))}/><small className="muted" style={{ display: "block", marginTop: 5 }}>{user.email}</small></td><td><select value={user.role ?? "employee"} onChange={(event) => setUsers((items) => items.map((item, i) => i === index ? { ...item, role: event.target.value } : item))}><option value="employee">员工</option><option value="admin">管理员</option></select></td><td><select value={String(user.is_active)} onChange={(event) => setUsers((items) => items.map((item, i) => i === index ? { ...item, is_active: event.target.value === "true" } : item))}><option value="true">启用</option><option value="false">停用</option></select></td><td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("zh-CN") : "从未"}</td><td><button className="icon-btn" disabled={busy} aria-label="保存员工" onClick={() => void update(user)}><Save size={15}/></button></td></tr>)}</tbody></table></div> : <EmptyState title="没有员工账号" description="请先配置服务端密钥，再创建第一个员工账号。"/>}</section>
    </section></main>;
}
