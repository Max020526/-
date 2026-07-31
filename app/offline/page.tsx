import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-card">
        <div className="offline-icon"><WifiOff size={30} /></div>
        <p className="eyebrow">NEXORA APP</p>
        <h1>网络暂时不可用</h1>
        <p>请检查手机网络后重试。为保证库存准确，入库、订单和库存操作必须联网完成。</p>
        <Link className="button primary" href="/"><RefreshCw size={16} /> 重新连接</Link>
      </div>
    </main>
  );
}
