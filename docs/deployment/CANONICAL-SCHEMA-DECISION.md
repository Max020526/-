# Canonical Schema decision

## Decision

Production 的当前对象是营业行为参考；本分支 Git migrations 是未来新环境唯一可重放标准。Staging 的实验 history 不会直接写入 Production。

## Production objects kept as canonical references

- 核心组织、RBAC、商品、SKU、库存、订单、财务和审计表。
- Production-only legacy `staff_invitations` 对象暂时保留，避免隐式数据删除；浏览器访问继续 deny-by-default。
- `rls_auto_enable()` 属于 Supabase 平台，不纳入 NEXORA migrations，只做条件加固。

## Staging changes promoted into Git

- 快速入库调用链修复。
- 商品媒体列名/generated path 修复。
- product status enum cast。
- Storefront catalog/order/cart wrapper 修复。

这些变更解决当前 Production 对象审计中发现的调用链/列名问题，但本 PR不会应用到 Production。

## Staging changes rejected or superseded

没有用空 migration 丢弃 history。两条 media migration 都保留其真实 SQL；后一条是最终定义。所有浏览器直接调用 private SECURITY DEFINER 的授权由 forward migration `20260806105305_reconcile_rpc_execution_grants.sql` 取代。

## Git historical replay corrections

仅包括平台对象存在性、legacy RPC 存在性、环境专属 fixture、明确 enum cast 和列兼容。已执行远程环境不会由本 PR重放这些文件。

## Future forward work

1. 重新授权 Staging connector，生成当前 Staging normalized catalog。
2. 在 clean Docker replay 后对 local/Production/Staging 对象签名做差异表。
3. 对确认废弃的 `staff_invitations` 另建 expand/contract migration；本 PR不删除表或数据。
4. Production 发布前另开 release PR，备份并批准 migration history 方案。

## Staging rebuild recommendation

优先方案 2：在确认没有需保留的测试数据/Auth/Storage 后，新建干净 Staging 并从 Canonical migrations 重建。

| 维度 | 修复现有 history | 干净重建 |
|---|---|---|
| 风险 | 高，56 条 history 与 Git 版本不一致 | 低，先保留旧项目即可回退 |
| 工作量 | 高，需逐条 repair 设计 | 中，重放、seed、重新建测试账号 |
| 可复现性 | 仍受旧 history 影响 | 最佳 |
| 后续维护 | 复杂 | 简单 |
| 回滚 | history repair 难逆 | 切回旧 Staging |
| Auth/Storage | 无迁移成本 | 需导出/重建测试账号与测试文件 |

当前无法确认 Staging 数据、Auth、Storage 是否可丢弃；connector 返回无权限。不得删除或 reset 当前项目。先由 owner 确认保留清单并重新授权只读审计。

## Migration repair

现在不需要、也不允许执行 repair。未来只有在：clean replay 全绿、三方对象差异已签字、Production 备份/PITR有效、每个版本映射已审阅、回滚演练完成时，才可评估 repair。若采用新建 Staging，Staging 无需 repair；Production history 仍需单独批准 baseline/映射方案。
