"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Boxes, ChevronRight, ClipboardList, ExternalLink, Home, LayoutDashboard, Menu, PackageCheck, PlusCircle, ShoppingBag, Truck } from "lucide-react";
import type { Portal } from "@/lib/constants";
import { CurrentUser } from "@/components/shared/current-user";

const nav = {
  warehouse: [
    { section:"入库作业", links:[{href:"/warehouse",label:"入库首页",icon:Home},{href:"/inbound/new",label:"快速入库",icon:PlusCircle},{href:"/inbound/batch",label:"批量入库",icon:ClipboardList},{href:"/warehouse/receipts/new",label:"OCR/货单入库",icon:PackageCheck},{href:"/warehouse/receipts",label:"入库记录",icon:Truck}]},
    { section:"库存", links:[{href:"/warehouse/inventory",label:"库存与盘点",icon:Boxes}]},
    { section:"系统入口", links:[{href:"/admin",label:"前往管理端",icon:BarChart3},{href:"https://nexora-studio-shop.xrx020526.chatgpt.site",label:"打开顾客网站",icon:ExternalLink,external:true},{href:"/",label:"切换端口",icon:Menu}]},
  ],
  admin: [
    { section:"经营管理", links:[{href:"/admin",label:"数据仪表盘",icon:LayoutDashboard},{href:"/admin/orders",label:"订单管理",icon:ShoppingBag}]},
    { section:"商品管理", links:[{href:"/admin/products/new",label:"新建并上架",icon:PlusCircle},{href:"/admin/products/pending",label:"待完善商品",icon:PackageCheck},{href:"/admin/products",label:"全部商品",icon:Boxes}]},
    { section:"库存管理", links:[{href:"/admin/inventory",label:"库存控制中心",icon:ClipboardList},{href:"/warehouse/receipts",label:"查看入库记录",icon:Truck}]},
    { section:"系统入口", links:[{href:"/warehouse",label:"前往入库端",icon:PackageCheck},{href:"https://nexora-studio-shop.xrx020526.chatgpt.site",label:"打开顾客网站",icon:ExternalLink,external:true},{href:"/",label:"切换端口",icon:Menu}]},
  ],
};

function active(pathname:string, href:string){ return href === "/admin" || href === "/warehouse" ? pathname === href : pathname.startsWith(href); }

export function AppShell({ portal, title, children }: { portal:Portal; title:string; children:React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">N</span><div><b>NEXORA</b><small>{portal === "warehouse" ? "WAREHOUSE" : "OPERATIONS"}</small></div></Link>
      <nav>{nav[portal].map(group => <div key={group.section}><div className="nav-section">{group.section}</div>{group.links.map(({href,label,icon:Icon,external}) => external ? <a key={href} href={href} target="_blank" rel="noreferrer" className="nav-link"><Icon size={17}/><span>{label}</span></a> : <Link key={href} href={href} className={`nav-link ${active(pathname,href)?"active":""}`}><Icon size={17}/><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><CurrentUser/></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><span className="topbar-title">{title}</span><ChevronRight size={14} color="#a1aaa5"/><span className="muted" style={{fontSize:11}}>{new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric"}).format(new Date())}</span><div className="topbar-actions"><button className="icon-btn" aria-label="通知"><Bell size={17}/></button></div></header>
      {children}
    </div>
    <nav className="mobile-nav"><Link className={active(pathname,portal==="warehouse"?"/warehouse":"/admin")?"active":""} href={portal==="warehouse"?"/warehouse":"/admin"}><Home size={19}/><span>首页</span></Link><Link href={portal==="warehouse"?"/warehouse/receipts/new":"/admin/products/pending"}><PackageCheck size={19}/><span>{portal==="warehouse"?"入库":"商品"}</span></Link><Link href={portal==="warehouse"?"/warehouse/inventory":"/admin/orders"}><ClipboardList size={19}/><span>{portal==="warehouse"?"库存":"订单"}</span></Link><Link href="/"><Menu size={19}/><span>端口</span></Link></nav>
  </div>;
}
