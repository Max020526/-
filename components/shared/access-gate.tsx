"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { firstMissingPermission, loadAuthorization } from "@/lib/auth/permissions";
import { normalizeInternalRole, type InternalRole } from "@/lib/auth/roles";

type GateState = "loading" | "signed-out" | "forbidden" | "allowed";
const EMPTY_PERMISSIONS: readonly string[] = [];

export function AccessGate({ roles, permissions = EMPTY_PERMISSIONS, children }: { roles: readonly InternalRole[]; permissions?: readonly string[]; children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    let active = true;
    void (async () => {
      const client = getSupabase();
      if (!client) { if (active) setState("forbidden"); return; }
      try {
        const authorization = await loadAuthorization(client);
        const role = normalizeInternalRole(authorization.role);
        const allowed = Boolean(role && roles.includes(role) && !firstMissingPermission(authorization, permissions));
        if (active) setState(allowed ? "allowed" : "forbidden");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (active) setState(/session|jwt|auth/i.test(message) ? "signed-out" : "forbidden");
      }
    })();
    return () => { active = false; };
  }, [roles, permissions]);

  if (state === "allowed") return children;
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(470px,100%)", textAlign: "center" }}>
      <div className="empty-icon" style={{ margin: "0 auto 18px" }}>{state === "loading" ? <LoaderCircle size={21} /> : state === "signed-out" ? <LockKeyhole size={21} /> : <ShieldAlert size={21} />}</div>
      <p className="eyebrow">SECURE WORKSPACE</p>
      <h1 style={{ fontSize: 24, margin: "8px 0 10px" }}>{state === "loading" ? "正在验证权限" : state === "signed-out" ? "请先登录员工账号" : "当前账号没有访问权限"}</h1>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>{state === "forbidden" ? "请联系管理员检查员工角色或账号状态。" : "登录后系统会根据角色开放仓库或管理功能。"}</p>
      {state !== "loading" && <Link className="button primary" href="/login" style={{ marginTop: 14 }}>前往登录</Link>}
    </section>
  </main>;
}
