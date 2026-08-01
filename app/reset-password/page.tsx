"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";
export default function ResetPassword(){const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [loading,setLoading]=useState(false);async function submit(e:FormEvent){e.preventDefault();const client=getSupabase();if(!client)return;setLoading(true);const {error}=await client.auth.updateUser({password});setMessage(error?friendlyError(error,"密码更新失败，请重新打开重置链接后再试。"):"密码已更新，现在可以登录。");setLoading(false);}return <main className="portal-page" style={{display:"grid",placeItems:"center"}}><form className="form-card" style={{width:"min(420px,100%)"}} onSubmit={submit}><div className="empty-icon"><LockKeyhole size={20}/></div><h1 style={{fontSize:25}}>设置新密码</h1><div className="field"><label>新密码</label><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></div>{message&&<div className="notice">{message}</div>}<button className="button primary" style={{width:"100%",marginTop:16}} disabled={loading}>保存新密码</button><Link href="/login" className="button" style={{width:"100%",marginTop:8}}>返回登录</Link></form></main>}
