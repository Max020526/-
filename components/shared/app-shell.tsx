"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChevronRight, ClipboardList, ExternalLink, Home, LayoutDashboard, Menu, PackageCheck, Palette, PlusCircle, Settings, ShieldCheck, ShoppingBag, Tags, Truck, UserCog } from "lucide-react";
import type { Portal } from "@/lib/constants";
import { CurrentUser } from "@/components/shared/current-user";

const nav = {
  warehouse: [
    { section:"入库作业", links:[{href:"/warehouse",label:"入库首页",icon:Home},{href:"/inbound/new",label:"快速入库",icon:PlusCircle},{href:"/inbound/batch",label:"批量入库",icon:ClipboardList},{href:"/inbound/today",label:"今日入库",icon:Truck},{href:"/warehouse/receipts/new",label:"OCR/货单入库",icon:PackageCheck},{href:"/warehouse/receipts",label:"历史货单",icon:ClipboardList}]},
    { section:"库存", links:[{href:"/warehouse/inventory",label:"库存与盘点",icon:Boxes}]},
    { section:"系统入口", links:[{href:"/",label:"返回主页 · 切换端口",icon:Menu},{href:"https://nexora-studio-shop.xrx020526.chatgpt.site",label:"打开顾客网站",icon:ExternalLink,external:true}]},
  ],
  admin: [
    { section:"经营管理", links:[{href:"/admin",label:"数据仪表盘",icon:LayoutDashboard},{href:"/admin/orders",label:"订单管理",icon:ShoppingBag}]},
    { section:"商品管理", links:[{href:"/admin/products/new",label:"新建并上架",icon:PlusCircle},{href:"/admin/products/pending",label:"待完善商品",icon:PackageCheck},{href:"/admin/products",label:"全部商品",icon:Boxes}]},
    { section:"库存管理", links:[{href:"/admin/inventory",label:"库存控制中心",icon:ClipboardList}]},
    { section:"系统设置", links:[{href:"/settings/colors",label:"颜色管理",icon:Palette},{href:"/settings/categories",label:"分类管理",icon:Tags},{href:"/settings/suppliers",label:"供应商管理",icon:Settings},{href:"/settings/users",label:"员工管理",icon:UserCog},{href:"/settings/audit",label:"操作日志",icon:ShieldCheck}]},
    { section:"系统入口", links:[{href:"/",label:"返回主页 · 切换端口",icon:Menu},{href:"https://nexora-studio-shop.xrx020526.chatgpt.site",label:"打开顾客网站",icon:ExternalLink,external:true}]},
  ],
};

function active(pathname:string, href:string){ return href === "/admin" || href === "/warehouse" ? pathname === href : pathname.startsWith(href); }

export function AppShell({ portal, title, children }: { portal:Portal; title:string; children:React.ReactNode }) {
  const pathname = usePathname();
  const mobileLinks = portal === "warehouse"
    ? [{ href: "/warehouse", label: "首页", icon: Home }, { href: "/inbound/new", label: "快速入库", icon: PlusCircle }, { href: "/inbound/batch", label: "批量入库", icon: ClipboardList }, { href: "/warehouse/inventory", label: "库存", icon: Boxes }, { href: "/", label: "切换端口", icon: Menu }]
    : [{ href: "/admin", label: "首页", icon: Home }, { href: "/admin/products", label: "商品", icon: PackageCheck }, { href: "/admin/orders", label: "订单", icon: ShoppingBag }, { href: "/admin/inventory", label: "库存", icon: Boxes }, { href: "/", label: "切换端口", icon: Menu }];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">N</span><div><b>NEXORA</b><small>{portal === "warehouse" ? "WAREHOUSE" : "OPERATIONS"}</small></div></Link>
      <nav>{nav[portal].map(group => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({href,label,icon:Icon,external}) => external ? <a key={href} href={href} target="_blank" rel="noreferrer" className="nav-link"><Icon size={17}/><span>{label}</span></a> : <Link key={href} href={href} className={`nav-link ${active(pathname,href)?"active":""}`}><Icon size={17}/><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><CurrentUser/></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><ChevronRight size={14} color="#a1aaa5"/><span className="muted" style={{fontSize:11}}>{new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(new Date())}</span><div className="topbar-actions"><Link className="button small" href="/"><Menu size={14}/>返回主页 · 切换端口</Link></div></header>
      {children}
    </div>
    <nav className="mobile-nav">{mobileLinks.map(({ href, label, icon: Icon }) => <Link key={href} className={active(pathname, href) ? "active" : ""} href={href}><Icon size={19}/><span>{label}</span></Link>)}</nav>
  </div>;
}
