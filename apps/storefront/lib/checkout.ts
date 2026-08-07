import { z } from "zod";

const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

const contactSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(40),
});

const addressSchema = z.object({
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().max(100).optional().default(""),
  city: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().min(2).max(20),
  address_line: z.string().trim().min(3).max(180),
  address_line_2: z.string().trim().max(180).optional().default(""),
});

export const checkoutSchema = z.object({
  locale: z.enum(["it", "en", "zh"]).optional().default("it"),
  items: z.array(cartItemSchema).min(1).max(20),
  fulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]),
  contact: contactSchema,
  shippingAddress: addressSchema.nullable(),
  customerNote: z.string().trim().max(500).optional().default(""),
  idempotencyKey: z.string().uuid(),
  guestSessionId: z.string().uuid(),
  requestId: z.string().uuid(),
}).superRefine((value, context) => {
  if (value.fulfillmentMethod === "DELIVERY" && !value.shippingAddress) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["shippingAddress"], message: "请填写完整配送地址" });
  }
  if (new Set(value.items.map((item) => item.variantId)).size !== value.items.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "购物袋中存在重复规格" });
  }
  if (value.items.reduce((sum, item) => sum + item.quantity, 0) > 30) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "每笔订单最多 30 件商品" });
  }
});

export function checkoutErrorMessage(error: unknown, locale: "it" | "en" | "zh" = "it") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const key = /rate|频繁/i.test(message) ? "rate" : /库存|stock/i.test(message) ? "stock" : /未发布|价格|规格不存在/i.test(message) ? "catalog" : /待付款订单/i.test(message) ? "pending" : "generic";
  const messages = {
    it: { rate: "Troppe richieste. Riprova più tardi.", stock: "La disponibilità è cambiata. Torna alla borsa e modifica le quantità.", catalog: "Un articolo o un prezzo è cambiato. Aggiorna la borsa.", pending: "Hai già un ordine in attesa di pagamento. Completalo o annullalo prima di continuare.", generic: "Impossibile inviare l'ordine. Controlla i dati e la connessione." },
    en: { rate: "Too many requests. Try again later.", stock: "Availability changed. Return to the bag and adjust quantities.", catalog: "An item or price changed. Refresh the bag.", pending: "You already have an order awaiting payment. Complete or cancel it before continuing.", generic: "The order could not be submitted. Check your details and connection." },
    zh: { rate: "操作过于频繁，请稍后再试。", stock: "部分商品库存刚刚发生变化，请返回购物袋调整数量。", catalog: "部分商品已下架或价格发生变化，请刷新购物袋。", pending: "您已有待付款订单，请先完成或取消后再下单。", generic: "订单暂时无法提交，请检查资料和网络后重试。" },
  } as const;
  return messages[locale][key];
}
