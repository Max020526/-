import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function authorized() {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", data.user.id).maybeSingle();
  return profile?.role === "admin" && profile.is_active ? data.user : null;
}

function unavailable(error: unknown) {
  const message = error instanceof Error && error.message.includes("密钥")
    ? "请在服务端配置 SUPABASE_SECRET_KEY 后使用员工账号管理。"
    : "员工账号操作失败，请稍后重试。";
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "没有管理员权限。" }, { status: 403 });
  try {
    const admin = createSupabaseAdminClient();
    const [{ data: authData, error }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id,full_name,role,is_active,created_at").order("created_at", { ascending: false }),
    ]);
    if (error) throw error;
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return NextResponse.json({ users: authData.users.map((user) => ({ id: user.id, email: user.email ?? "", last_sign_in_at: user.last_sign_in_at, ...profileMap.get(user.id) })) });
  } catch (error) { return unavailable(error); }
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "没有管理员权限。" }, { status: 403 });
  const body = await request.json() as { email?: string; password?: string; full_name?: string; role?: string };
  if (!body.email?.includes("@") || !body.password || body.password.length < 8 || !body.full_name?.trim()) return NextResponse.json({ error: "请填写姓名、有效邮箱和至少8位的临时密码。" }, { status: 400 });
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: body.email.trim().toLowerCase(), password: body.password, email_confirm: true, user_metadata: { full_name: body.full_name.trim() } });
    if (error || !data.user) return NextResponse.json({ error: error?.message.toLowerCase().includes("registered") ? "该邮箱已经注册。" : "创建员工账号失败。" }, { status: 400 });
    const role = body.role === "admin" ? "admin" : "employee";
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: body.full_name.trim(), role, is_active: true });
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw profileError; }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return unavailable(error); }
}

export async function PATCH(request: Request) {
  const actor = await authorized();
  if (!actor) return NextResponse.json({ error: "没有管理员权限。" }, { status: 403 });
  const body = await request.json() as { id?: string; full_name?: string; role?: string; is_active?: boolean };
  if (!body.id || !body.full_name?.trim() || !["employee", "admin"].includes(body.role ?? "")) return NextResponse.json({ error: "员工资料不完整。" }, { status: 400 });
  if (body.id === actor.id && body.is_active === false) return NextResponse.json({ error: "不能停用当前登录的管理员账号。" }, { status: 400 });
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("profiles").update({ full_name: body.full_name.trim(), role: body.role, is_active: body.is_active !== false }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return unavailable(error); }
}
