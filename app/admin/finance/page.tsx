import { FinanceCenter } from "@/components/finance/finance-center";
import { PageHead } from "@/components/shared/page-head";

export default function FinanceWorkspacePage() {
  return <main className="page"><PageHead eyebrow="P06 · MANAGEMENT FINANCE" title="经营财务中心" subtitle="收入、退款、费用、采购付款和毛利均可下钻到来源单据。" /><FinanceCenter /></main>;
}
