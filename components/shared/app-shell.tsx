"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Boxes, ChevronRight, ClipboardList, Home, Image, LayoutDashboard, Menu, PackageCheck, Search, Settings, ShoppingBag, Tags, Truck, Users } from "lucide-react";
import type { Portal } from "@/lib/constants";

const nav = {
  warehouse: [
    { section:"仓库作业", links:[{href:"/warehouse",label:"入库首页",icon:Home},{href:"/warehouse/receipts/new",label:"新建入库单",icon:PackageCheck},{href:"/warehouse/receipts",label:"入库记录",icon:ClipboardList},{href:"/warehouse/inventory",label:"库存查询",icon:Search}]},
    { section:"其他", links:[{href:"/admin",label:"前往管理端",icon:Boxes},{href:"/",label:"切换端口",icon:Menu}]},
  ],
  admin: [
    { section:"工作台", links:[{href:"/admin",label:"仪表盘",icon:LayoutDashboard}]},
    { section:"商品", links:[{href:"/admin/products/pending",label:"待完善商品",icon:PackageCheck},{href:"/admin/products",label:"全部商品",icon:Boxes},{href:"/admin/categories",label:"商品分类",icon:Tags},{href:"/admin/images",label:"图片管理",icon:Image},{href:"/admin/listings",label:"网店上架",icon:ShoppingBag}]},
    { section:"业务", links:[{href:"/admin/inventory",label:"库存中心",icon:ClipboardList},{href:"/admin/receipts",label:"入库记录",icon:Truck},{href:"/admin/orders",label:"订单管理",icon:ShoppingBag},{href:"/admin/staff",label:"员工权限",icon:Users},{href:"/admin/settings",label:"系统设置",icon:Settings}]},
  ],
};

function active(pathname:string, href:string){ return href === "/admin" || href === "/warehouse" ? pathname === href : pathname.startsWith(href); }

export function AppShell({ portal, title, children }: { portal:Portal; title:string; children:React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">N</span><div><b>NEXORA</b><small>{portal === "warehouse" ? "WAREHOUSE" : "OPERATIONS"}</small></div></Link>
      <nav>{nav[portal].map(group => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={`nav-link ${active(pathname,href)?"active":""}`}><Icon size={17}/><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="user-mini"><div className="avatar">NX</div><div><b>NEXORA 员工</b><span>未登录</span></div></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><ChevronRight size={14} color="#a1aaa5"/><span className="muted" style={{fontSize:11}}>{new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(new Date())}</span><div className="topbar-actions"><button className="icon-btn" aria-label="通知"><Bell size={17}/></button></div></header>
      {children}
    </div>
    <nav className="mobile-nav"><Link className={active(pathname,portal==="warehouse"?"/warehouse":"/admin")?"active":""} href={portal==="warehouse"?"/warehouse":"/admin"}><Home size={19}/><span>首页</span></Link><Link href={portal==="warehouse"?"/warehouse/receipts/new":"/admin/products/pending"}><PackageCheck size={19}/><span>{portal==="warehouse"?"入库":"商品"}</span></Link><Link href={portal==="warehouse"?"/warehouse/inventory":"/admin/orders"}><ClipboardList size={19}/><span>{portal==="warehouse"?"库存":"订单"}</span></Link><Link href="/"><Menu size={19}/><span>端口</span></Link></nav>
  </div>;
}
