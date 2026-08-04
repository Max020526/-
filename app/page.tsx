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
      </header>
      <section className="portal-hero">
        <h1>选择<span>工作区</span></h1>
      </section>
      <section className="portal-grid portal-product-grid" aria-label="选择 NEXORA 前端产品">
        {FRONTEND_PRODUCTS.map(({ id, href, icon: Icon, title, tone, external }) => {
          const content = <>
            <div className="portal-icon"><Icon size={25} strokeWidth={1.8} /></div>
            <h2>{title}</h2>
            <b>{external ? "打开" : "进入"} <ArrowRight size={17} /></b>
          </>;

          if (external) return <a className={`portal-card ${tone}`} href={href} target="_blank" rel="noreferrer" key={id}>{content}</a>;
          return <Link className={`portal-card ${tone}`} href={href} key={id}>{content}</Link>;
        })}
      </section>
    </main>
  );
}
