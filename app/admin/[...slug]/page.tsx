import { Construction } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
export default function PlannedModule(){return <main className="page"><PageHead eyebrow="NEXORA MODULE" title="模块入口已就绪" subtitle="此模块将在下一阶段接入完整业务操作。"/><section className="panel"><div className="empty"><div><div className="empty-icon"><Construction size={20}/></div><b>数据结构与权限边界已预留</b><span>当前版本优先交付入库、商品、上架、订单与库存联动的核心闭环。</span></div></div></section></main>}
