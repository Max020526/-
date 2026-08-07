"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="catalog-empty"><h1>页面暂时无法显示</h1><p>请检查网络后重试，购物袋内容仍保存在当前设备。</p><button className="primary-link" onClick={reset}>重新加载</button></main>; }
