"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

type Invitation={id:string;email:string;employeeName:string;role:string;roleName:string;warehouseId:string|null;warehouseName:string;expiresAt:string};

export default function EmployeeRegisterPage(){
  const search=useSearchParams();const token=search.get("token")?.trim()??"";
  const [invitation,setInvitation]=useState<Invitation|null>(null);const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState(false);
  const [form,setForm]=useState({name:"",password:"",confirmPassword:""});
  useEffect(()=>{let active=true;(async()=>{
    if(!token){if(active){setError("邀请链接无效，请联系管理员重新发送邀请。");setLoading(false);}return;}
    try{const response=await fetch(`/api/employee/invitations/validate?token=${encodeURIComponent(token)}`,{cache:"no-store"});const body=await response.json() as {invitation?:Invitation;error?:string};
      if(!active)return;if(!response.ok||!body.invitation){setError(body.error??"邀请验证失败。");setLoading(false);return;}
      setInvitation(body.invitation);setForm((value)=>({...value,name:body.invitation?.employeeName??""}));setLoading(false);
    }catch{if(active){setError("邀请验证服务暂时不可用，请稍后重试。");setLoading(false);}}
  })();return()=>{active=false};},[token]);
  async function submit(event:FormEvent){event.preventDefault();if(!invitation||busy)return;setBusy(true);setError("");
    try{const response=await fetch("/api/employee/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,email:invitation.email,...form})});
      const body=await response.json() as {error?:string};if(!response.ok){setError(body.error??"账号创建失败。");setBusy(false);return;}setSuccess(true);
    }catch{setError("账号创建服务暂时不可用，请稍后重试。");setBusy(false);}}
  return <main className="employee-register-page"><section className="employee-register-card">
    <Link href="/" className="employee-register-brand"><span className="brand-mark">N</span><strong>NEXORA</strong></Link>
    {loading?<div className="invite-state"><LoaderCircle className="spin" size={34}/><h1>正在验证邀请…</h1><p>正在安全确认岗位、仓库和有效期。</p></div>:
    success?<div className="invite-state"><CheckCircle2 size={42} color="#17633f"/><h1>员工账号创建成功</h1><p>岗位、权限和仓库范围已绑定，可立即登录。</p><Link className="button primary" href="/login">前往登录</Link></div>:
    !invitation?<div className="invite-state"><ShieldCheck size={38}/><h1>邀请链接无效</h1><p className="notice">{error}</p><Link className="button" href="/login">返回登录</Link></div>:
    <><div className="invite-heading"><span>员工账号注册</span><h1>欢迎加入 NEXORA</h1><p>岗位与数据范围由管理员配置，注册后不能自行修改。</p></div>
      <dl className="invite-summary"><div><dt>岗位</dt><dd>{invitation.roleName}</dd></div><div><dt>邮箱</dt><dd>{invitation.email}</dd></div><div><dt>仓库</dt><dd>{invitation.warehouseName}</dd></div><div><dt>邀请有效期</dt><dd>{new Date(invitation.expiresAt).toLocaleString("zh-CN")}</dd></div></dl>
      <form onSubmit={submit} className="invite-form"><label><span>姓名</span><input required maxLength={100} autoComplete="name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
        <label><span>密码</span><input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/><small>至少 12 位</small></label>
        <label><span>确认密码</span><input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e)=>setForm({...form,confirmPassword:e.target.value})}/></label>
        {error&&<p className="notice">{error}</p>}<button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<ShieldCheck size={16}/>} {busy?"正在创建账号…":"创建员工账号"}</button>
      </form></>}
  </section></main>;
}
