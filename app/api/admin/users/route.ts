import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageUsers, INTERNAL_ROLES, normalizeInternalRole } from "@/lib/auth/roles";

const MAX_BODY_BYTES = 8 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

async function authorized() {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await client.from("profiles").select("role,is_active,organization_id").eq("id", data.user.id).maybeSingle();
  return profile?.is_active && profile.organization_id && canManageUsers(normalizeInternalRole(profile.role))
    ? { id: data.user.id, organizationId: profile.organization_id }
    : null;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function readBody(request: Request): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  if (!isSameOrigin(request)) return { response: json({ error: "请求来源验证失败，请刷新页面后重试。" }, 403) };
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return { response: json({ error: "请求内容过大。" }, 413) };
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { response: json({ error: "请求格式无效。" }, 415) };
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    return { body: body as Record<string, unknown> };
  } catch {
    return { response: json({ error: "请求内容不是有效的 JSON。" }, 400) };
  }
}

function unavailable(error: unknown) {
  const message = error instanceof Error && error.message.includes("密钥")
    ? "请在服务端配置 SUPABASE_SECRET_KEY 后使用员工账号管理。"
    : "员工账号操作失败，请稍后重试。";
  return json({ error: message }, 503);
}

export async function GET() {
  if (!await authorized()) return json({ error: "没有管理员权限。" }, 403);
  try {
    const admin = createSupabaseAdminClient();
    const [{ data: authData, error }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id,full_name,role,is_active,created_at").order("created_at", { ascending: false }),
    ]);
    if (error) throw error;
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return json({ users: authData.users.map((user) => ({ id: user.id, email: user.email ?? "", last_sign_in_at: user.last_sign_in_at, ...profileMap.get(user.id) })) });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const actor = await authorized();
  if (!actor) return json({ error: "没有管理员权限。" }, 403);
  const parsed = await readBody(request);
  if ("response" in parsed) return parsed.response;

  const email = typeof parsed.body.email === "string" ? parsed.body.email.trim().toLowerCase() : "";
  const password = typeof parsed.body.password === "string" ? parsed.body.password : "";
  const fullName = typeof parsed.body.full_name === "string" ? parsed.body.full_name.trim() : "";
  const role = typeof parsed.body.role === "string" && INTERNAL_ROLES.some((item) => item === parsed.body.role)
    ? parsed.body.role
    : "warehouse_staff";
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || password.length < 12 || password.length > 128 || !fullName || fullName.length > 100) {
    return json({ error: "请填写姓名、有效邮箱和 12 至 128 位的临时密码。" }, 400);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) return json({ error: error?.message.toLowerCase().includes("registered") ? "该邮箱已经注册。" : "创建员工账号失败。" }, 400);
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, organization_id: actor.organizationId, full_name: fullName, role, is_active: true });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }
    return json({ ok: true }, 201);
  } catch (error) {
    return unavailable(error);
  }
}

export async function PATCH(request: Request) {
  const actor = await authorized();
  if (!actor) return json({ error: "没有管理员权限。" }, 403);
  const parsed = await readBody(request);
  if ("response" in parsed) return parsed.response;

  const id = typeof parsed.body.id === "string" ? parsed.body.id : "";
  const fullName = typeof parsed.body.full_name === "string" ? parsed.body.full_name.trim() : "";
  const role = typeof parsed.body.role === "string" ? parsed.body.role : "";
  const isActive = parsed.body.is_active !== false;
  if (!UUID_PATTERN.test(id) || !fullName || fullName.length > 100 || !INTERNAL_ROLES.some((item) => item === role)) {
    return json({ error: "员工资料不完整或格式无效。" }, 400);
  }
  if (id === actor.id && (!isActive || !canManageUsers(normalizeInternalRole(role)))) {
    return json({ error: "不能停用当前账号或移除自己的管理员角色。" }, 400);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("profiles").update({ full_name: fullName, role, is_active: isActive }).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "员工账号不存在。" }, 404);
    return json({ ok: true });
  } catch (error) {
    return unavailable(error);
  }
}
