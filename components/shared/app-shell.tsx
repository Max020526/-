"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  Home,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Palette,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UserCog,
} from "lucide-react";
import type { Portal } from "@/lib/constants";
import { CurrentUser } from "@/components/shared/current-user";
import { RETAIL_STOREFRONT_URL } from "@/lib/workspaces";

const nav = {
  warehouse: [
    { section: "P01 · 入库作业", links: [
      { href: "/warehouse", label: "作业首页", icon: Home },
      { href: "/inbound/new", label: "快速入库", icon: PlusCircle },
      { href: "/inbound/batch", label: "批量入库", icon: ClipboardList },
      { href: "/warehouse/receipts/new", label: "OCR / 货单入库", icon: PackageCheck },
      { href: "/warehouse/receipts", label: "统一入库记录", icon: ClipboardCheck },
    ] },
    { section: "仓库与门店", links: [
      { href: "/warehouse/inventory", label: "库存查询与盘点", icon: Boxes },
      { href: "/warehouse/fulfillment", label: "P04 · 履约作业", icon: Truck },
      { href: "/warehouse/pos", label: "P08 · 门店 POS", icon: Store },
    ] },
    { section: "产品入口", links: [
      { href: "/", label: "返回主页 · 切换产品", icon: Menu },
      { href: RETAIL_STOREFRONT_URL, label: "打开零售顾客网站", icon: ExternalLink, external: true },
    ] },
  ],
  admin: [
    { section: "经营与交易", links: [
      { href: "/admin", label: "P07 · 老板经营", icon: LayoutDashboard },
      { href: "/admin/orders", label: "P03 · 订单与客服", icon: ShoppingBag },
      { href: "/admin/returns", label: "退货退款", icon: ClipboardCheck },
    ] },
    { section: "商品与库存", links: [
      { href: "/admin/products", label: "P02 · 商品运营", icon: Boxes },
      { href: "/admin/products/new", label: "新建并上架", icon: PlusCircle },
      { href: "/admin/products/pending", label: "待完善商品", icon: PackageCheck },
      { href: "/admin/inventory", label: "库存监管", icon: ClipboardList },
    ] },
    { section: "采购与财务", links: [
      { href: "/admin/purchasing", label: "P05 · 采购管理", icon: Truck },
      { href: "/admin/finance", label: "P06 · 财务对账", icon: CircleDollarSign },
    ] },
    { section: "P09 · 系统管理", links: [
      { href: "/settings/colors", label: "颜色管理", icon: Palette },
      { href: "/settings/categories", label: "分类管理", icon: Tags },
      { href: "/settings/suppliers", label: "供应商管理", icon: Settings },
      { href: "/settings/users", label: "员工管理", icon: UserCog },
      { href: "/settings/audit", label: "操作日志", icon: ShieldCheck },
    ] },
    { section: "产品入口", links: [
      { href: "/", label: "返回主页 · 切换产品", icon: Menu },
      { href: RETAIL_STOREFRONT_URL, label: "打开零售顾客网站", icon: ExternalLink, external: true },
    ] },
  ],
};

function active(pathname: string, href: string) {
  if (href === "/admin" || href === "/warehouse") return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ portal, title, children }: { portal: Portal; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const mobileLinks = portal === "warehouse"
    ? [
      { href: "/warehouse", label: "首页", icon: Home },
      { href: "/inbound/new", label: "快速入库", icon: PlusCircle },
      { href: "/warehouse/receipts", label: "入库记录", icon: ClipboardList },
      { href: "/warehouse/inventory", label: "库存", icon: Boxes },
      { href: "/", label: "切换产品", icon: Menu },
    ]
    : [
      { href: "/admin", label: "首页", icon: Home },
      { href: "/admin/products", label: "商品", icon: PackageCheck },
      { href: "/admin/orders", label: "订单", icon: ShoppingBag },
      { href: "/admin/inventory", label: "库存", icon: Boxes },
      { href: "/", label: "切换产品", icon: Menu },
    ];

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">N</span><div><b>NEXORA</b><small>{portal === "warehouse" ? "WAREHOUSE & POS" : "INTERNAL ADMIN"}</small></div></Link>
      <nav>{nav[portal].map((group) => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({ href, label, icon: Icon, external }) => external ? <a key={href} href={href} target="_blank" rel="noreferrer" className="nav-link"><Icon size={17} /><span>{label}</span></a> : <Link key={href} href={href} className={`nav-link ${active(pathname, href) ? "active" : ""}`}><Icon size={17} /><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><CurrentUser /></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><ChevronRight size={14} color="#a1aaa5" /><span className="muted" style={{ fontSize: 11 }}>{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date())}</span><div className="topbar-actions"><Link className="button small" href="/"><Menu size={14} />返回主页 · 切换产品</Link></div></header>
      {children}
    </div>
    <nav className="mobile-nav">{mobileLinks.map(({ href, label, icon: Icon }) => <Link key={href} className={active(pathname, href) ? "active" : ""} href={href}><Icon size={19} /><span>{label}</span></Link>)}</nav>
  </div>;
}
