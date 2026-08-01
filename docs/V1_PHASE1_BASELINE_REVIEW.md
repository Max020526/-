# NEXORA V1.0 第一阶段基线审查

审查日期：2026-08-01

## 已审阅资料

- System Specification V1.0 PDF（20 页）
- System Specification V1.0 DOCX
- 架构、核心 ER 与三条业务流程图册 PDF（5 页）
- 核心 ER、采购到入库上架、订单到收款、退货退款四张 PNG

PDF 已逐页渲染检查；DOCX 与 PDF 的标题、RPC、ER 实体和 A01–A16 关键文本已交叉核对。图册与独立 PNG 的实体、泳道和状态说明一致。

## 第一阶段正式业务规则

1. 平台只有一个业务数据库；仓库端、管理端和未来顾客端是职责工作区，不是相互复制数据的独立系统。
2. 授权数据来自数据库角色关系，不来自可由用户修改的 `user_metadata`。
3. SPU 型号不能代替 SKU；颜色和尺码组合形成独立 SKU。
4. 入库状态唯一采用 `draft → counting → ready_to_post → posted / cancelled`。
5. 库存采用不可变流水 + 可查询余额双模型。
6. 任何库存变化都必须具备组织、地点、SKU、数量、来源、操作人和时间。
7. 入库过账必须单事务、行锁、幂等；失败整体回滚。
8. 已过账记录和流水不能直接修改或删除。
9. 商品媒体使用私有 Storage、受控路径、类型和大小限制。
10. RLS 与 Data API GRANT 是两层独立控制，二者都必须配置。

## 规格冲突与采用结论

| 事项 | 不同描述 | 采用结论 |
| --- | --- | --- |
| 本轮阶段范围 | 规格路线把基础、商品、入库拆成多个小阶段；用户本轮要求合并 | 以本轮明确范围为准，合并交付，但不扩展商城/财务/完整履约 |
| 入库状态 | 需求正文举例 `submitted/approved`；正式规格为 `counting/ready_to_post` | 采用正式规格，不保留平行状态 |
| 旧版角色 | 现有代码只有 `employee/admin` | 升级为正式九岗位，保留只读兼容映射以便迁移 |
| 旧版表名 | `stock_receipts/inventory/product_images` 与正式名称不同 | 建立 Canonical 安全视图，不复制数据；物理重命名留到维护窗口 |
| 快速与货单入库 | 现有代码有两套记录表 | 新代码统一从 `inbound_receipts` 契约查询，所有新过账使用正式 RPC；旧记录只为升级兼容保留 |

## 当前实现边界

- `locations`、`inventory_balances`、`product_media`、`inbound_receipts`、`inbound_receipt_lines` 是 `security_invoker` 视图；其中统一入库视图聚合两条兼容录入路径，但不建立第二份入库、余额或媒体事实。
- 仓库员工以标准到货单完成草稿、点货和提交；仓库经理负责过账、取消及经理快速过账，避免员工录入端与管理端重复承担审批职责。
- 旧函数继续工作是为了可回滚升级；正式新入口使用 `rpc_post_inbound_receipt()` 和 `rpc_transition_inbound_receipt()`。
- 本轮不在生产应用迁移，不删除旧表，不迁移真实业务数据。

## 远程 Supabase 只读审计

- 项目状态：ACTIVE_HEALTHY，PostgreSQL 17。
- 已有业务表均启用 RLS。
- Security Advisor：1 个 WARN，泄露密码检测未开启。
- Performance Advisor：仅未使用索引 INFO；当前数据库业务数据接近空，不能据此删除为后续查询准备的外键/工作流索引。
- 2026 年 Data API 默认行为要求新增对象显式 GRANT，本次迁移已处理。
