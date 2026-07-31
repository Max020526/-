"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

type GateState = "loading" | "signed-out" | "forbidden" | "allowed";

export function AccessGate({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    let active = true;
    void (async () => {
      const client = getSupabase();
      if (!client) { if (active) setState("forbidden"); return; }
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) { if (active) setState("signed-out"); return; }
      const { data } = await client.from("user_roles").select("roles(name)").eq("user_id", auth.user.id);
      const assigned = (data ?? []).map((item) => item.roles?.name).filter(Boolean);
      if (active) setState(assigned.includes("OWNER") || assigned.some((role) => roles.includes(role!)) ? "allowed" : "forbidden");
    })();
    return () => { active = false; };
  }, [roles]);

  if (state === "allowed") return children;
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(470px,100%)", textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto 18px" }}>{state === "loading" ? <LoaderCircle size={21} /> : state === "signed-out" ? <LockKeyhole size={21} /> : <ShieldAlert size={21} />}</div>
      <p className="eyebrow">SECURE WORKSPACE</p>
      <h1 style={{ fontSize: 24, margin: "8px 0 10px" }}>{state === "loading" ? "正在验证权限" : state === "signed-out" ? "请先登录员工账号" : "当前账号没有访问权限"}</h1>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>{state === "forbidden" ? "请让 Owner 为该账号分配对应员工角色。" : "登录后系统会根据角色开放仓库或管理功能。"}</p>
      {state !== "loading" && <Link className="button primary" href="/login" style={{ marginTop: 14 }}>前往登录</Link>}
    </section>
  </main>;
}
