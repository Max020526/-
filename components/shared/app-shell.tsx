"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
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
  X,
} from "lucide-react";
import type { Portal } from "@/lib/constants";
import { CurrentUser } from "@/components/shared/current-user";
import { getSupabase } from "@/lib/supabase/client";
import { loadAuthorization } from "@/lib/auth/permissions";

const NAV_PERMISSIONS: Record<string,string> = {
  "/warehouse/receipts/new":"receiving.create","/warehouse/receipts":"receiving.view","/inbound/new":"inventory.create",
  "/warehouse/inventory":"inventory.view","/warehouse/fulfillment":"fulfillment.read","/warehouse/pos":"pos.use",
  "/admin/products":"product.view","/admin/inventory":"inventory.view","/admin/orders":"order.view","/admin/returns":"order.refund",
  "/admin/purchasing":"purchase.read","/admin/finance":"finance.view","/settings/users":"employee.view",
  "/settings/audit":"audit.view","/settings/categories":"system.settings.view","/settings/colors":"system.settings.view","/settings/suppliers":"system.settings.view",
};

const nav = {
  warehouse: [
    { section: "入库", links: [
      { href: "/warehouse", label: "首页", icon: Home },
      { href: "/inbound/new", label: "快速入库", icon: PlusCircle },
      { href: "/warehouse/receipts/new", label: "到货单", icon: ClipboardCheck },
      { href: "/warehouse/receipts", label: "入库记录", icon: ClipboardCheck },
    ] },
    { section: "仓库", links: [
      { href: "/warehouse/inventory", label: "库存", icon: Boxes },
      { href: "/warehouse/fulfillment", label: "履约", icon: Truck },
      { href: "/warehouse/pos", label: "门店", icon: Store },
    ] },
  ],
  admin: [
    { section: "经营", links: [
      { href: "/admin", label: "首页", icon: LayoutDashboard },
      { href: "/admin/orders", label: "订单", icon: ShoppingBag },
      { href: "/admin/returns", label: "售后", icon: ClipboardCheck },
    ] },
    { section: "商品", links: [
      { href: "/admin/products", label: "商品", icon: Boxes },
      { href: "/admin/inventory", label: "库存", icon: ClipboardList },
    ] },
    { section: "业务", links: [
      { href: "/admin/purchasing", label: "采购", icon: Truck },
      { href: "/admin/finance", label: "财务", icon: CircleDollarSign },
    ] },
    { section: "设置", links: [
      { href: "/settings/colors", label: "颜色", icon: Palette },
      { href: "/settings/categories", label: "分类", icon: Tags },
      { href: "/settings/suppliers", label: "供应商", icon: Settings },
      { href: "/settings/users", label: "员工", icon: UserCog },
      { href: "/settings/audit", label: "日志", icon: ShieldCheck },
    ] },
  ],
};

function routeMatches(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ portal, title, children }: { portal: Portal; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [permissions,setPermissions]=useState<Set<string>|null>(null);
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{let active=true;const client=getSupabase();if(!client){setPermissions(new Set());return;}void loadAuthorization(client).then((auth)=>{if(active)setPermissions(new Set(auth.permissions));}).catch(()=>{if(active)setPermissions(new Set());});return()=>{active=false};},[]);
  useEffect(()=>{if(!menuOpen)return;const previous=document.body.style.overflow;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenuOpen(false)};document.body.style.overflow="hidden";window.addEventListener("keydown",close);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",close)}},[menuOpen]);
  const visible=(href:string)=>href==="/"||!NAV_PERMISSIONS[href]||Boolean(permissions?.has(NAV_PERMISSIONS[href]));
  const visibleGroups=nav[portal].map((group)=>({...group,links:group.links.filter(({href})=>visible(href))})).filter((group)=>group.links.length);
  const activeHref=visibleGroups.flatMap((group)=>group.links.map(({href})=>href)).filter((href)=>routeMatches(pathname,href)).sort((a,b)=>b.length-a.length)[0]??null;
  const mobileLinks = portal === "warehouse"
    ? [
      { href: "/warehouse", label: "首页", icon: Home },
      { href: "/inbound/new", label: "快速入库", icon: PlusCircle },
      { href: "/warehouse/receipts", label: "入库记录", icon: ClipboardList },
      { href: "/warehouse/inventory", label: "库存", icon: Boxes },
    ]
    : [
      { href: "/admin", label: "首页", icon: Home },
      { href: "/admin/products", label: "商品", icon: PackageCheck },
      { href: "/admin/orders", label: "订单", icon: ShoppingBag },
      { href: "/admin/inventory", label: "库存", icon: Boxes },
    ];
  const mobileVisibleLinks=mobileLinks.filter(({href})=>visible(href));
  const menuIsActive=menuOpen||Boolean(activeHref&&!mobileVisibleLinks.some(({href})=>href===activeHref));
  const closeMenu=()=>setMenuOpen(false);

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">N</span><div><b>NEXORA</b></div></Link>
      <nav>{visibleGroups.map((group) => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${activeHref===href ? "active" : ""}`}><Icon size={17} /><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><CurrentUser /></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><div className="topbar-actions"><button type="button" className="button small mobile-menu-trigger" aria-label="打开全部功能" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={16}/><span>全部功能</span></button><Link className="button small desktop-workspace-link" href="/"><Menu size={15} />工作区</Link></div></header>
      {children}
    </div>
    <nav className="mobile-nav" aria-label="常用功能">{mobileVisibleLinks.map(({ href, label, icon: Icon }) => <Link key={href} className={activeHref===href ? "active" : ""} href={href}><Icon size={19} /><span>{label}</span></Link>)}<button type="button" className={menuIsActive?"active":""} aria-label="全部功能" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={19}/><span>全部</span></button></nav>
    {menuOpen&&<><button type="button" className="mobile-drawer-backdrop" aria-label="关闭全部功能" onClick={closeMenu}/><aside className="mobile-drawer" aria-label="全部功能菜单"><header className="mobile-drawer-head"><Link href="/" className="mobile-drawer-brand" onClick={closeMenu}><span className="brand-mark">N</span><b>NEXORA</b></Link><button type="button" className="icon-btn" aria-label="关闭全部功能" onClick={closeMenu}><X size={19}/></button></header><nav className="mobile-drawer-nav">{visibleGroups.map((group)=><section key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`mobile-drawer-link ${activeHref===href?"active":""}`} onClick={closeMenu}><Icon size={19}/><span>{label}</span></Link>)}</section>)}</nav><footer className="mobile-drawer-foot"><Link className="mobile-workspace-link" href="/" onClick={closeMenu}><Menu size={18}/><span>切换工作区</span></Link><CurrentUser/></footer></aside></>}
  </div>;
}
