"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { authErrorMessage } from "@/lib/auth-errors";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const { locale, href } = useLocale();
  const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const copy = locale === "it" ? { title: "Imposta una nuova password", body: "Apri questa pagina dal link ricevuto via email.", password: "Nuova password", confirm: "Conferma password", submit: "Aggiorna password", mismatch: "Le password non coincidono.", success: "Password aggiornata. Ora puoi accedere.", wait: "Verifica del link di recupero…", login: "Vai all'accesso" } : locale === "en" ? { title: "Set a new password", body: "Open this page from the link received by email.", password: "New password", confirm: "Confirm password", submit: "Update password", mismatch: "Passwords do not match.", success: "Password updated. You can now sign in.", wait: "Checking the recovery link…", login: "Go to sign in" } : { title: "设置新密码", body: "请通过邮箱中的恢复链接打开本页。", password: "新密码", confirm: "确认密码", submit: "更新密码", mismatch: "两次密码不一致。", success: "密码已更新，现在可以登录。", wait: "正在验证恢复链接…", login: "前往登录" };
  useEffect(() => {
    const client = getSupabase(); if (!client) return;
    void client.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = client.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY" || session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (password !== confirm) { setMessage(copy.mismatch); return; }
    const client = getSupabase(); if (!client) return;
    setBusy(true); setMessage(""); const { error } = await client.auth.updateUser({ password }); setBusy(false);
    setMessage(error ? authErrorMessage(error, locale) : copy.success);
  }
  return <main className="account-simple-page"><section className="account-panel"><p className="section-kicker">PASSWORD RECOVERY</p><h1>{copy.title}</h1><p>{ready ? copy.body : copy.wait}</p>{ready && <form onSubmit={submit}><label>{copy.password}<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>{copy.confirm}<input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>{message && <p className="form-message" role="status">{message}</p>}<button disabled={busy}>{busy && <LoaderCircle className="spin"/>}{copy.submit}</button></form>}{message === copy.success && <Link className="primary-link" href={href("/login")}>{copy.login}</Link>}</section></main>;
}
