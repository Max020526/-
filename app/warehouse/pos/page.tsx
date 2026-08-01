import { PosRegister } from "@/components/pos/pos-register";
import { PageHead } from "@/components/shared/page-head";

export default function PosWorkspacePage() {
  return <main className="page"><PageHead eyebrow="P08 · POS" title="门店 POS" subtitle="开班、扫码销售、多方式收款、统一库存扣减和现金差异审计。" /><PosRegister /></main>;
}
