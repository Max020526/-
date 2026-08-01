import { OwnerDashboard } from "@/components/business/owner-dashboard";
import { PageHead } from "@/components/shared/page-head";

export default function BusinessDashboardPage() {
  return <main className="page"><PageHead eyebrow="P07 · OWNER DASHBOARD" title="老板经营看板" subtitle="销售、退款、毛利、费用、库存价值和经营净额采用统一可下钻口径。" /><OwnerDashboard /></main>;
}
