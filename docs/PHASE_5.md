# 第五阶段：采购、经营财务、老板看板与基础 POS

第五阶段继续使用唯一的 `products`、`product_variants`、`orders`、`order_items`、`inventory`、`inventory_movements` 和 `payments`，没有建立平行商品、订单或库存系统。

## 采购与成本

- 采购状态：`draft → approved → ordered → partially_received → received`，可在允许状态取消。
- 采购收货通过 `rpc_receive_purchase_order` 完成。它锁定采购行和库存余额，在一个事务中累计已收数量、更新加权平均成本、生成收货单、库存流水和审计记录。
- 超收被数据库拒绝；使用相同幂等键重试会返回第一次结果，不重复增加库存。
- 采购付款与采购收货分开记录，现金付款时间不等于库存成本发生时间。

## 统一经营口径

所有汇总由 `rpc_business_metrics` 计算，数据库保存 UTC `timestamptz`，日期边界使用 `Europe/Rome`。

| 指标 | 口径 | 来源 |
| --- | --- | --- |
| 销售额 | 已确认线上/POS 收款流入 | `financial_entries` |
| 退款 | 已完成退款流出 | `financial_entries` |
| 净销售 | 销售额减退款 | 统一指标函数 |
| COGS | 发货或 POS 销售时冻结的成本快照 | `order_items.cogs_amount` |
| 毛利 | 净销售减 COGS | 统一指标函数 |
| 经营费用 | 已批准且确认付款的费用 | `expenses` + `financial_entries` |
| 采购付款 | 已确认供应商付款 | `purchase_payments` + `financial_entries` |
| 经营净额 | 所有流入减所有流出 | `financial_entries` |
| 库存成本价值 | 在手数量 × 加权平均成本 | `inventory` |
| 库存零售价值 | 在手数量 × 当前零售价 | `inventory` + `products` |
| 现金差异 | 关班实点现金减应有现金 | `pos_sessions` + `cash_movements` |

`financial_entries` 是追加式经营账，确认后不可更新或删除；错误通过反向分录处理。它不替代意大利法定会计、IVA 申报、SDI 电子发票或支付机构清算核心。

## POS

- `rpc_pos_session_command`：开班、现金存入/取出和关班。
- `rpc_complete_pos_sale`：服务端重算价格和角色折扣上限，原子创建订单/订单行/付款、扣减统一库存、生成库存流水和经营财务分录。
- 收银员只能查看并操作自己的班次；仓库主管、Owner 和 System Admin 可管理班次。
- V1 POS 需要网络连接，未实现离线队列和法定税控小票。

## 验收

数据库行为测试：`supabase/tests/phase5_procurement_finance_pos.sql`。测试覆盖 A11–A13，并始终在事务中创建临时数据后回滚。
