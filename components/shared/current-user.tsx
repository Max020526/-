"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { normalizeInternalRole, ROLE_LABELS } from "@/lib/auth/roles";

export function CurrentUser() {
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const client = getSupabase();
      if (!client) return;
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) return;
      const { data } = await client.from("profiles").select("full_name,role").eq("id", auth.user.id).maybeSingle();
      if (active) setProfile(data);
    })();
    return () => { active = false; };
  }, []);

  async function logout() {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    location.assign("/login");
  }

  return <div className="user-mini">
    <div className="avatar">{profile?.full_name?.slice(0, 1).toUpperCase() ?? "NX"}</div>
    <div><b>{profile?.full_name || "NEXORA 员工"}</b><span>{normalizeInternalRole(profile?.role) ? ROLE_LABELS[normalizeInternalRole(profile?.role)!] : "未分配角色"}</span></div>
    <button type="button" className="icon-btn" aria-label="退出登录" onClick={logout}><LogOut size={15}/></button>
  </div>;
}
