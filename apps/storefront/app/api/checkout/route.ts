import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkoutErrorMessage, checkoutSchema } from "@/lib/checkout";
import type { StorefrontOrderResult } from "@/lib/store-types";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let locale: "it" | "en" | "zh" = "it";
  try {
    const body = await request.json() as { locale?: unknown };
    if (body.locale === "en" || body.locale === "zh") locale = body.locale;
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const message = locale === "it" ? "Controlla i dati di checkout." : locale === "en" ? "Check the checkout details." : "请检查结账资料。";
      return NextResponse.json({ ok: false, requestId, message }, { status: 400 });
    }
    locale = parsed.data.locale;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return NextResponse.json({ ok: false, requestId, message: checkoutErrorMessage(new Error("not connected"), locale) }, { status: 503 });

    const authorization = request.headers.get("authorization");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: authorization ? { Authorization: authorization } : {} },
    });
    const input = parsed.data;
    const { data, error } = await client.rpc("rpc_create_storefront_order", {
      p_items: input.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      p_fulfillment_method: input.fulfillmentMethod,
      p_contact: input.contact,
      p_shipping_address: input.fulfillmentMethod === "DELIVERY" ? input.shippingAddress : null,
      p_customer_note: input.customerNote || null,
      p_idempotency_key: input.idempotencyKey,
      p_guest_session_id: input.guestSessionId,
      p_request_id: input.requestId,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, requestId, order: data as StorefrontOrderResult }, {
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, requestId, message: checkoutErrorMessage(error, locale) }, {
      status: 422,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    });
  }
}
