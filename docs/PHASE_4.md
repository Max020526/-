# 第四阶段：订单、履约与售后中心

第四阶段已将订单运营、仓库履约、顾客订单进度和退货退款接入同一订单与库存模型。历史 `order_status` 枚举仅作为旧客户端兼容投影；新业务使用相互独立的 `lifecycle_status`、`payment_status` 和 `fulfillment_status`。

## 已完成

- Internal Admin：订单筛选、详情、三状态、时间线、付款核验、取消、备注、异常和退货退款工作区。
- Warehouse PWA：履约队列、开始拣货、逐行确认、复核打包、配送发货、自提备货和领取核销。
- 顾客端：订单三状态、公开时间线、未付款取消、已完成订单退货申请和售后记录。
- 配送发货与自提领取通过 `rpc_consume_order_stock` 原子减少 `on_hand` 和 `reserved`；重复命令返回原结果。
- 取消与超时通过 `rpc_release_order_stock` 或超时任务只减少 `reserved`，保留 `on_hand`。
- 退货必须经过申请、批准、收货和质检。`restockable` 增加可售库存；`quarantine` 和 `damaged` 进入原库存余额的独立数量桶；`write_off` 只写不可变流水。
- 退款与库存处置相互独立。当前仅提供内部 `manual` 适配器边界，不调用真实支付网关，也不保存银行卡数据。
- `outbox_events` 记录待发送通知；无邮件/短信凭证时不伪造发送成功。
- 核心表已撤销浏览器直接写权限；写入使用窄 RPC、权限校验、组织隔离、幂等结果和审计日志。

## 数据库迁移

- `20260801190000_phase4_order_fulfillment_returns.sql`
- `20260801191000_phase4_order_fulfillment_rpcs.sql`
- `20260801192000_phase4_storefront_order_projection.sql`
- `20260801193000_phase4_uuid_min_compat.sql`

`supabase/tests/phase4_order_fulfillment_returns.sql` 是可回滚数据库行为测试，覆盖 A08–A10，结束时执行 `ROLLBACK`。

## 状态机

- 订单：`draft -> pending -> confirmed -> processing -> completed | cancelled`
- 付款：`unpaid -> pending -> paid -> partially_refunded -> refunded | failed`
- 履约：`unfulfilled -> reserved -> picking -> packed -> shipped/ready_pickup -> delivered/picked_up`
- 预占：`active -> consumed | released | expired`
- 退货：`requested -> approved -> received -> inspected -> refund_pending -> completed | rejected`

## 当前限制

- V1 暂不支持部分取消、已发货改行、复杂波次拣货和多包裹拆单。
- 承运商、邮件、短信和支付仅保留适配器边界，没有接入真实外部 API。
- 退款是内部授权确认记录，不代表支付机构清算；真实网关必须使用服务端 webhook 和 provider 幂等键。
- 没有执行 Netlify/Sites 正式部署。

## 手工验收

1. 订单客服在 `/admin/orders` 确认订单并核验付款。
2. 仓库人员在 `/warehouse/fulfillment` 逐行确认、打包并选择配送或自提分支。
3. 配送发货确认 `on_hand` 与 `reserved` 同时减少；自提只在领取码核销后减少。
4. 顾客端已完成订单申请退货；管理员批准、仓库收货并选择质检处置。
5. 确认只有“可重新销售”增加可售库存，再由退款权限账号完成内部退款记录。
