"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { AppShell } from "@/components/shared/app-shell";
import { PageHead } from "@/components/shared/page-head";
import { getSupabase } from "@/lib/supabase/client";

const ROLES = ["employee", "admin"] as const;
type Profile = { full_name: string | null; role: string | null; is_active: boolean; email: string };
export default function MePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { void (async () => { const client = getSupabase(); if (!client) return; const { data: auth } = await client.auth.getUser(); if (!auth.user) return; const { data } = await client.from("profiles").select("full_name,role,is_active").eq("id", auth.user.id).maybeSingle(); if (data) setProfile({ ...data, email: auth.user.email ?? "" }); })(); }, []);
  async function logout() { const client = getSupabase(); if (client) await client.auth.signOut(); location.assign("/login"); }
  return <AccessGate roles={ROLES}><AppShell portal="warehouse" title="我的账号"><main className="page"><PageHead eyebrow="MY ACCOUNT" title="我的账号" subtitle="查看当前身份、账号状态与常用入口。"/>
    <section className="content-grid"><div className="form-card"><div style={{ display: "flex", gap: 16, alignItems: "center" }}><div className="avatar" style={{ width: 58, height: 58, fontSize: 20 }}><UserRound size={22}/></div><div><h2 style={{ margin: 0 }}>{profile?.full_name || "NEXORA 员工"}</h2><p className="muted" style={{ margin: "6px 0 0" }}>{profile?.email || "正在加载…"}</p></div></div><div className="form-grid" style={{ marginTop: 24 }}><div className="mini-stat"><span>角色</span><b style={{ fontSize: 16 }}>{profile?.role === "admin" ? "管理员" : "员工"}</b></div><div className="mini-stat"><span>账号状态</span><b style={{ fontSize: 16 }}>{profile?.is_active === false ? "已停用" : "正常"}</b></div></div><button className="button danger" style={{ marginTop: 18 }} onClick={() => void logout()}><LogOut size={15}/>退出登录</button></div>
      <aside className="panel"><div className="panel-head"><div><h2>安全提示</h2><p>保护内部经营数据</p></div></div><div className="panel-body"><ShieldCheck size={24} color="var(--brand)"/><p className="muted" style={{ fontSize: 12, lineHeight: 1.8 }}>不要共享员工账号。发现异常登录或员工离职时，请管理员立即停用账号。</p>{profile?.role === "admin" && <Link className="button" href="/settings/users">管理员工账号</Link>}</div></aside>
    </section></main></AppShell></AccessGate>;
}
