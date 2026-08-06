import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID(); const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ message: "订单查询信息无效" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ message: "订单服务尚未连接" }, { status: 503 });
  const token = new URL(request.url).searchParams.get("token"); const authorization = request.headers.get("authorization");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: authorization ? { Authorization: authorization } : {} } });
  const { data, error } = await client.rpc("rpc_get_storefront_order", { p_order_id: id, p_lookup_token: token, p_request_id: requestId });
  if (error) return NextResponse.json({ message: "订单不存在或查询信息无效", requestId }, { status: 404 });
  return NextResponse.json({ order: data, requestId }, { headers: { "Cache-Control": "no-store" } });
}
