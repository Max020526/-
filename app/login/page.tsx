"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { SetupBanner } from "@/components/shared/setup-banner";
import { defaultInternalRoute, normalizeInternalRole } from "@/lib/auth/roles";

type Mode = "login" | "forgot";
const CUSTOMER_SITE = "https://nexora-studio-shop.xrx020526.chatgpt.site";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = getSupabase();
    if (!client) {
      setMessage("请先配置 Supabase 环境变量。");
      return;
    }
    setLoading(true);
    setMessage("");

    if (mode === "forgot") {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
      setMessage(error ? "重设邮件发送失败，请检查邮箱后重试。" : "重设密码邮件已发送，请检查收件箱。");
      setLoading(false);
      return;
    }

    const { data: login, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("邮箱或密码不正确，请重新输入。");
      setLoading(false);
      return;
    }
    const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", login.user.id).maybeSingle();
    if (profile?.is_active === false) {
      await client.auth.signOut();
      setMessage("该账号已停用，请联系管理员。");
      setLoading(false);
      return;
    }

    setMessage("登录成功，正在返回系统…");
    setLoading(false);
    const requested = new URLSearchParams(location.search).get("next");
    const safeRequested = requested?.startsWith("/") && !requested.startsWith("//") ? requested : null;
    const role = normalizeInternalRole(profile?.role);
    const destination = role ? safeRequested ?? defaultInternalRoute(role) : "/";
    setTimeout(() => location.assign(destination), 600);
  }

  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <section className="form-card" style={{ width: "min(440px,100%)" }}>
      <Link href="/" className="muted" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}><ArrowLeft size={14}/>返回端口选择</Link>
      <div style={{ textAlign: "center", margin: "26px 0 22px" }}>
        <span className="brand-mark" style={{ margin: "auto" }}>N</span>
        <p className="eyebrow" style={{ marginTop: 16 }}>INTERNAL SECURE ACCESS</p>
        <h1 style={{ fontSize: 27, margin: "8px 0" }}>{mode === "login" ? "登录 NEXORA" : "重设密码"}</h1>
        <p className="muted" style={{ fontSize: 12 }}>{mode === "forgot" ? "我们会向你的邮箱发送安全链接" : "系统将按岗位角色开放对应工作区"}</p>
      </div>
      <SetupBanner/>
      <form onSubmit={submit}>
        <div className="field"><label><Mail size={13}/> 邮箱</label><input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></div>
        {mode === "login" && <div className="field" style={{ marginTop: 14 }}><label><LockKeyhole size={13}/> 密码</label><input type="password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></div>}
        {message && <div className="notice" style={{ marginTop: 14 }}>{message}</div>}
        <button className="button primary" style={{ width: "100%", marginTop: 18 }} disabled={loading}>{loading && <LoaderCircle size={15}/>} {mode === "login" ? "登录" : "发送重设邮件"}</button>
      </form>
      <button type="button" className="tab" style={{ display: "block", margin: "12px auto 0" }} onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setMessage(""); }}>{mode === "login" ? "忘记密码？" : "返回登录"}</button>
      <a className="muted" href={CUSTOMER_SITE} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 10, marginTop: 15 }}>顾客请前往独立商城 <ExternalLink size={11}/></a>
      <p className="muted" style={{ fontSize: 10, textAlign: "center", marginTop: 10 }}>内部账号由管理员创建并分配权限。</p>
    </section>
  </main>;
}
