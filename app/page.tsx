import Link from "next/link";
import { ArrowRight, Boxes, PackageCheck, ShoppingBag } from "lucide-react";

const portals = [
  { href: "/warehouse", icon: PackageCheck, eyebrow: "WAREHOUSE", title: "入库工作台", copy: "导入货单、实收核对、新旧款匹配与确认入库。", tone: "mint" },
  { href: "/admin", icon: Boxes, eyebrow: "OPERATIONS", title: "管理中心", copy: "完善商品、管理库存、上架网店与处理订单。", tone: "blue" },
  { href: "/shop", icon: ShoppingBag, eyebrow: "STOREFRONT", title: "NEXORA 商店", copy: "浏览已上架商品、选购规格并创建零售订单。", tone: "amber" },
];

export default function Home() {
  return (
    <main className="portal-page">
      <div className="portal-orb portal-orb-one" />
      <div className="portal-orb portal-orb-two" />
      <header className="portal-header">
        <span className="brand-mark">N</span>
        <span className="brand-word">NEXORA</span>
        <span className="portal-version">WHOLESALE SYSTEM · V1.0</span>
      </header>
      <section className="portal-hero">
        <p className="kicker">一套库存，一条业务链</p>
        <h1>让每一件新货，<br /><span>都有迹可循。</span></h1>
        <p className="portal-lead">供应商货单、仓库收货、商品资料、网店订单与库存流水，在同一个系统准确联通。</p>
      </section>
      <section className="portal-grid" aria-label="选择系统端口">
        {portals.map(({ href, icon: Icon, eyebrow, title, copy, tone }) => (
          <Link className={`portal-card ${tone}`} href={href} key={href}>
            <div className="portal-icon"><Icon size={25} strokeWidth={1.8} /></div>
            <p>{eyebrow}</p><h2>{title}</h2><span>{copy}</span>
            <b>进入系统 <ArrowRight size={17} /></b>
          </Link>
        ))}
      </section>
      <footer className="portal-footer"><span>库存准确</span><i /><span>数据可追踪</span><i /><span>操作更简单</span></footer>
    </main>
  );
}
