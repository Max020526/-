import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import { PwaInstall } from "@/components/shared/pwa-install";
import { NetworkStatus } from "@/components/shared/network-status";
import "./globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "NEXORA 批发零售一体化系统",
    template: "%s · NEXORA",
  },
  description: "从供应商货单到网店订单的准确库存闭环。",
  applicationName: "NEXORA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NEXORA",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "NEXORA 批发零售一体化系统",
    description: "库存准确 · 数据可追踪 · 操作更简单",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "NEXORA 批发零售一体化系统" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXORA 批发零售一体化系统",
    description: "库存准确 · 数据可追踪 · 操作更简单",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/app-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/app-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/app-icon-192.png", type: "image/png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#13251e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${display.variable}`}>
        <NetworkStatus />
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
