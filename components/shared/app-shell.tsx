"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
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
  Send,
  Store,
  Tags,
  Truck,
  UserCog,
} from "lucide-react";
import type { Portal } from "@/lib/constants";
import { CurrentUser } from "@/components/shared/current-user";
import { RETAIL_STOREFRONT_URL } from "@/lib/workspaces";
import { getSupabase } from "@/lib/supabase/client";
import { loadAuthorization } from "@/lib/auth/permissions";

const NAV_PERMISSIONS: Record<string,string> = {
  "/warehouse/receipts/new":"receiving.create","/warehouse/receipts":"receiving.view","/inbound/new":"inventory.create",
  "/warehouse/inventory":"inventory.view","/admin/products":"product.view","/admin/inventory":"inventory.view",
  "/admin/orders":"order.view","/admin/finance":"finance.view","/settings/users":"employee.view",
  "/settings/audit":"audit.view","/settings/categories":"system.settings.view","/settings/colors":"system.settings.view","/settings/suppliers":"system.settings.view",
};

const nav = {
  warehouse: [
    { section: "入库", links: [
      { href: "/warehouse", label: "作业首页", icon: Home },
      { href: "/warehouse/receipts/new", label: "新建到货单", icon: PackageCheck },
      { href: "/warehouse/receipts", label: "入库记录", icon: ClipboardCheck },
      { href: "/inbound/new", label: "快速入库", icon: PlusCircle },
    ] },
    { section: "仓库与门店", links: [
      { href: "/warehouse/inventory", label: "库存盘点", icon: Boxes },
      { href: "/warehouse/fulfillment", label: "履约作业", icon: Truck },
      { href: "/warehouse/pos", label: "门店 POS", icon: Store },
    ] },
    { section: "产品入口", links: [
      { href: "/", label: "切换工作区", icon: Menu },
      { href: RETAIL_STOREFRONT_URL, label: "顾客商城", icon: ExternalLink, external: true },
    ] },
  ],
  admin: [
    { section: "经营与交易", links: [
      { href: "/admin", label: "经营首页", icon: LayoutDashboard },
      { href: "/admin/orders", label: "订单管理", icon: ShoppingBag },
      { href: "/admin/returns", label: "退货退款", icon: ClipboardCheck },
    ] },
    { section: "商品与库存", links: [
      { href: "/admin/products", label: "商品管理", icon: Boxes },
      { href: "/admin/products/new", label: "创建商品草稿", icon: PlusCircle },
      { href: "/admin/products?queue=enriching", label: "资料完善队列", icon: PackageCheck },
      { href: "/admin/products?queue=ready", label: "待发布队列", icon: Send },
      { href: "/admin/inventory", label: "库存监管", icon: ClipboardList },
    ] },
    { section: "采购与财务", links: [
      { href: "/admin/purchasing", label: "采购管理", icon: Truck },
      { href: "/admin/finance", label: "财务对账", icon: CircleDollarSign },
    ] },
    { section: "系统", links: [
      { href: "/settings/colors", label: "颜色管理", icon: Palette },
      { href: "/settings/categories", label: "分类管理", icon: Tags },
      { href: "/settings/suppliers", label: "供应商管理", icon: Settings },
      { href: "/settings/users", label: "员工管理", icon: UserCog },
      { href: "/settings/audit", label: "操作日志", icon: ShieldCheck },
    ] },
    { section: "产品入口", links: [
      { href: "/", label: "切换工作区", icon: Menu },
      { href: RETAIL_STOREFRONT_URL, label: "顾客商城", icon: ExternalLink, external: true },
    ] },
  ],
};

function active(pathname: string, href: string) {
  if (href === "/admin" || href === "/warehouse") return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ portal, title, children }: { portal: Portal; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [permissions,setPermissions]=useState<Set<string>|null>(null);
  useEffect(()=>{let active=true;const client=getSupabase();if(!client){setPermissions(new Set());return;}void loadAuthorization(client).then((auth)=>{if(active)setPermissions(new Set(auth.permissions));}).catch(()=>{if(active)setPermissions(new Set());});return()=>{active=false};},[]);
  const visible=(href:string,external?:boolean)=>external||href==="/"||!NAV_PERMISSIONS[href]||Boolean(permissions?.has(NAV_PERMISSIONS[href]));
  const mobileLinks = portal === "warehouse"
    ? [
      { href: "/warehouse", label: "首页", icon: Home },
      { href: "/warehouse/receipts/new", label: "新建到货", icon: PlusCircle },
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
      <nav>{nav[portal].map((group) => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.filter(({href,external})=>visible(href,external)).map(({ href, label, icon: Icon, external }) => external ? <a key={href} href={href} target="_blank" rel="noreferrer" className="nav-link"><Icon size={17} /><span>{label}</span></a> : <Link key={href} href={href} className={`nav-link ${active(pathname, href) ? "active" : ""}`}><Icon size={17} /><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><CurrentUser /></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><div className="topbar-actions"><Link className="button small" href="/"><Menu size={15} />切换工作区</Link></div></header>
      {children}
    </div>
    <nav className="mobile-nav">{mobileLinks.filter(({href})=>visible(href)).map(({ href, label, icon: Icon }) => <Link key={href} className={active(pathname, href) ? "active" : ""} href={href}><Icon size={19} /><span>{label}</span></Link>)}</nav>
  </div>;
}
