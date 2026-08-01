import Link from "next/link";
import { ReturnsCenter } from "@/components/returns/returns-center";
import { PageHead } from "@/components/shared/page-head";

export default function ReturnsPage() {
  return <main className="page">
    <PageHead eyebrow="P03 · RETURNS & REFUNDS" title="退货、质检与退款" subtitle="退货收货后先质检；仅可重新销售商品回到可售库存，退款独立留痕。" action={<Link className="button" href="/admin/orders">返回订单</Link>} />
    <ReturnsCenter />
  </main>;
}
