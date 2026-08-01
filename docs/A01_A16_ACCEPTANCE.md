# NEXORA V1.0 A01–A16 验收矩阵

状态说明：`通过（自动）` 表示已有可重复自动证据；`通过（设计/审计）` 表示实现和权限已审计；`待 UAT` 表示不应以模拟器代替真实岗位/设备签字。

| 编号 | 状态 | 可重复证据 | 尚需人工证据 |
| --- | --- | --- | --- |
| A01 | 通过（自动） | `.env.example`、secret 扫描、`verify:environment` 阻断 Preview 误连生产 | Netlify 实际变量和 Redirect URL 双人核对 |
| A02 | 通过（设计/DB） | 页面/服务端/RLS/GRANT/RPC/Storage 四层权限；Security Advisor | 全岗位允许/拒绝矩阵 UAT |
| A03 | 通过（自动） | 多颜色/尺码、粘贴、旧款复用、新草稿测试 | 仓库平板和弱网 UAT |
| A04 | 通过（DB） | 入库幂等、重复确认、事务回滚行为测试 | 预发布并发测试 |
| A05 | 通过（DB） | 统一余额与流水；Phase 6 不可变触发器及元数据测试 | 预发布应用 Phase 6 迁移后重跑 |
| A06 | 通过（自动） | 商品资料、媒体、价格、发布检查和上下架契约 | 真实图片/手机拍照 UAT |
| A07 | 通过（自动/DB） | 商城匿名投影只读，价格与库存服务端重算 | 域名/CDN 缓存 UAT |
| A08 | 通过（DB） | 行锁、条件更新、最后一件库存和失败回滚测试 | 预发布并发负载 |
| A09 | 通过（DB） | 取消释放、发货/领取扣减、退货质检处置 | 跨岗位端到端 UAT |
| A10 | 通过（自动/DB） | 订单、付款、履约状态机与时间线 | 外部支付/物流接入另行验收 |
| A11 | 通过（DB） | 采购审批、下达、分批收货、超收、幂等、加权成本 | Buyer+仓库 UAT |
| A12 | 通过（DB） | POS 开关班、扫码销售、重复提交、现金差异 | 真实设备和税控边界验收 |
| A13 | 通过（DB） | 精确金额、收退款/费用/采购付款/毛利/库存价值统一口径 | 会计确认；本系统非法定账 |
| A14 | 通过（设计/DB） | 核心动作审计；Phase 6 审计不可变触发器 | 预发布迁移后抽样审计 |
| A15 | 通过（构建），待 UAT | 双应用响应式、加载/空/错误/403、渲染测试 | iOS/Android/平板截图和签字 |
| A16 | 通过（自动），待生产签字 | 双端 lint/typecheck/vinext/Netlify build；内部端 67 项、商城 13 项测试；云端只读不变量与 Advisors | 发布 commit、备份恢复、设备 UAT 与负责人签字 |

## 数据库行为测试

- `supabase/tests/phase4_order_fulfillment_returns.sql`
- `supabase/tests/phase5_procurement_finance_pos.sql`
- `supabase/tests/phase6_release_readiness.sql`

Phase 4/5 测试在事务内建立临时业务数据并 `ROLLBACK`；Phase 6 是元数据只读检查。禁止对生产库运行会写入真实业务数据的测试。

完整判定、P0–P3 和生产门禁见 `docs/final_release_readiness.md`。
