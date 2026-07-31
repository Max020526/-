"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { SetupBanner } from "@/components/shared/setup-banner";

type Mode = "login" | "register" | "forgot";

export default function Login(){
  const [mode,setMode]=useState<Mode>("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [message,setMessage]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault(); const client=getSupabase(); if(!client){setMessage("请先配置 Supabase 环境变量。");return;} setLoading(true); setMessage("");
    if(mode==="forgot"){
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password`}); setMessage(error?error.message:"重设密码邮件已发送，请检查收件箱。"); setLoading(false); return;
    }
    if(mode==="register"){
      const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:`${location.origin}/login`}}); setMessage(error?error.message:data.session?"注册成功，已自动登录。":"注册成功，请点击确认邮件后登录。"); setLoading(false); if(!error&&data.session)setTimeout(()=>location.assign("/shop"),700); return;
    }
    const {error}=await client.auth.signInWithPassword({email,password}); setMessage(error?error.message:"登录成功，正在返回系统…"); setLoading(false); if(!error){const requested=new URLSearchParams(location.search).get("next");const destination=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/";setTimeout(()=>location.assign(destination),600);}
  }
  return <main className="portal-page" style={{display:"grid",placeItems:"center"}}><section className="form-card" style={{width:"min(440px,100%)"}}><Link href="/" className="muted" style={{display:"flex",gap:6,alignItems:"center",fontSize:11}}><ArrowLeft size={14}/>返回端口选择</Link><div style={{textAlign:"center",margin:"26px 0 22px"}}><span className="brand-mark" style={{margin:"auto"}}>N</span><p className="eyebrow" style={{marginTop:16}}>SECURE ACCESS</p><h1 style={{fontSize:27,margin:"8px 0"}}>{mode==="login"?"登录 NEXORA":mode==="register"?"创建顾客账号":"重设密码"}</h1><p className="muted" style={{fontSize:12}}>{mode==="register"?"注册后可保存购物车并查询自己的订单":mode==="forgot"?"我们会向你的邮箱发送安全链接":"员工与顾客使用同一个安全入口"}</p></div><SetupBanner/><div className="tabs"><button type="button" className={`tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setMessage("")}}>登录</button><button type="button" className={`tab ${mode==="register"?"active":""}`} onClick={()=>{setMode("register");setMessage("")}}>顾客注册</button></div><form onSubmit={submit}>{mode==="register"&&<div className="field"><label><UserRound size={13}/> 姓名</label><input value={name} onChange={e=>setName(e.target.value)} required autoComplete="name"/></div>}<div className="field" style={{marginTop:mode==="register"?14:0}}><label><Mail size={13}/> 邮箱</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></div>{mode!=="forgot"&&<div className="field" style={{marginTop:14}}><label><LockKeyhole size={13}/> 密码</label><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete={mode==="register"?"new-password":"current-password"}/><div className="field-help">至少 8 个字符</div></div>}{message&&<div className="notice" style={{marginTop:14}}>{message}</div>}<button className="button primary" style={{width:"100%",marginTop:18}} disabled={loading}>{loading&&<LoaderCircle size={15}/>} {mode==="login"?"登录":mode==="register"?"创建账号":"发送重设邮件"}</button></form>{mode==="login"&&<button type="button" className="tab" style={{display:"block",margin:"12px auto 0"}} onClick={()=>{setMode("forgot");setMessage("")}}>忘记密码？</button>}<p className="muted" style={{fontSize:10,textAlign:"center",marginTop:15}}>员工账号注册后需由 Owner 分配仓库、商品或订单角色。</p></section></main>
}
