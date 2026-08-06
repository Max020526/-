"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { authErrorMessage } from "@/lib/auth-errors";
import { getSupabase } from "@/lib/supabase";
import { safeNextPath } from "@/lib/navigation";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const { locale, href } = useLocale();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const copy = locale === "it" ? { hero: "Salva i preferiti,\nsegui ogni ordine.", heroBody: "Accedi per conservare indirizzi e ordini. Il checkout ospite resta sempre disponibile.", login: "Accedi", signup: "Crea un account", forgot: "Password dimenticata", welcome: "Bentornata", join: "Entra nello Studio", recover: "Recupera l'accesso", name: "Nome", email: "Email", password: "Password", noAccount: "Prima volta? Crea un account", hasAccount: "Hai già un account? Accedi", forgotLink: "Hai dimenticato la password?", back: "Torna all'accesso", signupOk: "Registrazione ricevuta. Controlla l'email per confermare l'account.", resetOk: "Se l'indirizzo è registrato, riceverai un'email con le istruzioni.", disconnected: "Il servizio account non è collegato.", legal: "Registrandoti accetti le condizioni di vendita e dichiari di aver letto la Privacy Policy." } : locale === "en" ? { hero: "Save favourites,\ntrack every order.", heroBody: "Sign in to save addresses and orders. Guest checkout always remains available.", login: "Sign in", signup: "Create account", forgot: "Forgot password", welcome: "Welcome back", join: "Join the Studio", recover: "Recover access", name: "Name", email: "Email", password: "Password", noAccount: "First time? Create an account", hasAccount: "Already have an account? Sign in", forgotLink: "Forgot your password?", back: "Back to sign in", signupOk: "Registration received. Check your email to confirm the account.", resetOk: "If the address is registered, you will receive an email with instructions.", disconnected: "The account service is not connected.", legal: "By registering, you accept the sales terms and confirm you have read the Privacy Policy." } : { hero: "收藏喜欢的，\n跟踪每一笔订单。", heroBody: "登录后可保存地址和订单；访客结账始终可用。", login: "登录", signup: "创建账户", forgot: "忘记密码", welcome: "欢迎回来", join: "加入 STUDIO", recover: "找回账户", name: "姓名", email: "邮箱", password: "密码", noAccount: "第一次来？创建账户", hasAccount: "已有账户？直接登录", forgotLink: "忘记密码？", back: "返回登录", signupOk: "注册请求已提交，请查看邮箱并完成验证。", resetOk: "如果该邮箱已注册，你将收到重置说明。", disconnected: "顾客账户服务暂未连接。", legal: "注册即表示你接受销售条款，并确认已阅读隐私政策。" };

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const client = getSupabase();
    if (!client) { setMessage(copy.disconnected); setLoading(false); return; }
    if (mode === "forgot") {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password?lang=${locale}` });
      setMessage(error ? authErrorMessage(error, locale) : copy.resetOk);
    } else if (mode === "signup") {
      const { error } = await client.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/login?confirmed=1&lang=${locale}` } });
      setMessage(error ? authErrorMessage(error, locale) : copy.signupOk);
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) setMessage(authErrorMessage(error, locale)); else window.location.assign(href(safeNextPath(new URLSearchParams(window.location.search).get("next"))));
    }
    setLoading(false);
  }
  const title = mode === "login" ? copy.login : mode === "signup" ? copy.signup : copy.forgot;
  return <main className="account-page"><section className="account-visual"><div><p className="section-kicker">NEXORA MEMBERS</p><h1>{copy.hero.split("\n").map((line) => <span key={line}>{line}<br/></span>)}</h1><p>{copy.heroBody}</p></div></section><section className="account-form"><Link className="wordmark" href={href("/")}>NEXORA <span>STUDIO</span></Link><div><p className="section-kicker">{mode === "login" ? copy.welcome : mode === "signup" ? copy.join : copy.recover}</p><h2>{title}</h2><form onSubmit={submit}>{mode === "signup" && <label>{copy.name}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}<label>{copy.email}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{mode !== "forgot" && <label>{copy.password}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}{mode === "signup" && <p className="auth-legal">{copy.legal} <Link href={href("/condizioni-generali-di-vendita")}>Condizioni generali di vendita</Link> · <Link href={href("/privacy")}>Privacy Policy</Link></p>}{message && <p className="form-message" role="status">{message}</p>}<button disabled={loading}>{loading ? <LoaderCircle className="spin" /> : null}{title} <ArrowRight /></button></form>{mode === "login" && <button className="mode-switch" onClick={() => { setMode("forgot"); setMessage(""); }}>{copy.forgotLink}</button>}<button className="mode-switch" onClick={() => { setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? copy.hasAccount : mode === "forgot" ? copy.back : copy.noAccount}</button></div></section></main>;
}
