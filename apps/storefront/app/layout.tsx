import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { StoreShell } from "@/components/store-shell";
import "./globals.css";

const sans = Noto_Sans_SC({ variable: "--font-sans", subsets: ["latin"] });
const editorial = Cormorant_Garamond({ variable: "--font-editorial", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "NEXORA STUDIO | Abbigliamento donna", template: "%s | NEXORA STUDIO" },
  description: "Abbigliamento donna essenziale per l'ufficio, il quotidiano, il viaggio, il movimento leggero e la sera.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "NEXORA STUDIO", description: "Vestirsi per ogni momento.", type: "website", locale: "it_IT", alternateLocale: ["en_GB", "zh_CN"], images: [{ url: "/og-phase1.png", width: 1731, height: 909, alt: "NEXORA STUDIO abbigliamento donna" }] },
  twitter: { card: "summary_large_image", title: "NEXORA STUDIO", description: "Vestirsi per ogni momento.", images: ["/og-phase1.png"] },
  alternates: { canonical: "/", languages: { "it-IT": "/?lang=it", "en-GB": "/?lang=en", "zh-CN": "/?lang=zh" } },
  robots: process.env.NEXT_PUBLIC_APP_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f4ef" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
  const banner = appEnv === "staging"
    ? "STAGING 测试环境 — 当前数据不会进入正式系统"
    : appEnv === "preview"
      ? "PREVIEW 预览环境"
      : appEnv === "local"
        ? "LOCAL 本地环境"
        : null;

  return <html lang="it-IT"><body className={`${sans.variable} ${editorial.variable}`}>{banner ? <div role="status" style={{ background: "#7f1d1d", color: "white", padding: "8px 16px", textAlign: "center", font: "600 13px/1.4 system-ui", letterSpacing: ".02em" }}>{banner}</div> : null}<LocaleProvider><CartProvider><StoreShell>{children}</StoreShell></CartProvider></LocaleProvider></body></html>;
}
