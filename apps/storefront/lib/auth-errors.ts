import type { StoreLocale } from "./i18n";

export function authErrorMessage(error: unknown, locale: StoreLocale) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const key = /invalid login|invalid credentials/i.test(message) ? "credentials" : /password/i.test(message) ? "password" : /rate|too many/i.test(message) ? "rate" : /email/i.test(message) ? "email" : "generic";
  const messages = {
    it: { credentials: "Email o password non corretti.", password: "La password non soddisfa i requisiti di sicurezza.", rate: "Troppi tentativi. Riprova più tardi.", email: "Controlla l'indirizzo email.", generic: "Operazione non riuscita. Riprova." },
    en: { credentials: "Email or password is incorrect.", password: "The password does not meet the security requirements.", rate: "Too many attempts. Try again later.", email: "Check the email address.", generic: "The operation failed. Please try again." },
    zh: { credentials: "邮箱或密码不正确。", password: "密码不符合安全要求。", rate: "尝试次数过多，请稍后重试。", email: "请检查邮箱地址。", generic: "操作失败，请重试。" },
  } as const;
  return messages[locale][key];
}
