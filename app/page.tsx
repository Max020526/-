import Link from "next/link";
import { ArrowRight, Boxes, ExternalLink, PackageCheck } from "lucide-react";

const portals = [
  { href: "/warehouse", icon: PackageCheck, eyebrow: "WAREHOUSE", title: "入库端", copy: "新货收货、OCR 识别、入库核对、库存盘点与调整。", tone: "mint", external: false },
  { href: "/admin", icon: Boxes, eyebrow: "OPERATIONS", title: "管理端", copy: "商品上架、库存控制、订单处理与经营数据统计。", tone: "blue", external: false },
  { href: "https://nexora-studio-shop.xrx020526.chatgpt.site", icon: ExternalLink, eyebrow: "CUSTOMER WEBSITE", title: "顾客网站入口", copy: "直接打开独立顾客网站，查看管理端已经发布的商品。", tone: "amber", external: true },
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
        {portals.map(({ href, icon: Icon, eyebrow, title, copy, tone, external }) => {
          const content = <>
            <div className="portal-icon"><Icon size={25} strokeWidth={1.8} /></div>
            <p>{eyebrow}</p><h2>{title}</h2><span>{copy}</span>
            <b>{external ? "打开网站" : "进入系统"} <ArrowRight size={17} /></b>
          </>;
          return external ? <a className={`portal-card ${tone}`} href={href} target="_blank" rel="noreferrer" key={href}>{content}</a> : <Link className={`portal-card ${tone}`} href={href} key={href}>{content}</Link>;
        })}
      </section>
      <footer className="portal-footer"><span>库存准确</span><i /><span>数据可追踪</span><i /><span>操作更简单</span></footer>
    </main>
  );
}
