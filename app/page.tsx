import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FRONTEND_PRODUCTS } from "@/lib/workspaces";

export default function Home() {
  return (
    <main className="portal-page">
      <div className="portal-orb portal-orb-one" />
      <div className="portal-orb portal-orb-two" />
      <header className="portal-header">
        <span className="brand-mark">N</span>
        <span className="brand-word">NEXORA</span>
        <span className="portal-version">FASHION COMMERCE PLATFORM · V1.0</span>
      </header>
      <section className="portal-hero">
        <p className="kicker">四个前端产品，一套业务数据</p>
        <h1>每个岗位只看需要的事，<br /><span>库存与订单始终一致。</span></h1>
        <p className="portal-lead">仓库与门店作业、内部经营管理、零售顾客网站和未来批发门户共享同一套商品、库存、订单与审计模型。</p>
      </section>
      <section className="portal-grid portal-product-grid" aria-label="选择 NEXORA 前端产品">
        {FRONTEND_PRODUCTS.map(({ id, href, icon: Icon, eyebrow, title, description, scope, tone, external, status }) => {
          const content = <>
            <div className="portal-card-top">
              <div className="portal-icon"><Icon size={25} strokeWidth={1.8} /></div>
              <span className={`status-chip ${status === "active" ? "available" : "planned"}`}>{status === "active" ? "已启用" : "V1.0 可选"}</span>
            </div>
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            <span>{description}</span>
            <small>{scope}</small>
            <b>{href ? (external ? "打开独立网站" : "进入工作区") : "暂不启用"} {href ? <ArrowRight size={17} /> : null}</b>
          </>;

          if (!href) return <article className={`portal-card ${tone} disabled`} key={id}>{content}</article>;
          if (external) return <a className={`portal-card ${tone}`} href={href} target="_blank" rel="noreferrer" key={id}>{content}</a>;
          return <Link className={`portal-card ${tone}`} href={href} key={id}>{content}</Link>;
        })}
      </section>
      <footer className="portal-footer"><span>单一商品主档</span><i /><span>单一库存事实</span><i /><span>全流程可追踪</span></footer>
    </main>
  );
}
