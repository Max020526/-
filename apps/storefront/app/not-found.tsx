import Link from "next/link";
export default function NotFound() { return <main className="catalog-empty"><span>404</span><h1>没有找到这个页面</h1><p>商品可能已下架，或链接已经更新。</p><Link className="primary-link" href="/shop">返回商品页</Link></main>; }
