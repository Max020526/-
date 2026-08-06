# Migration reconciliation

本工作只修改 Git 和隔离 CI。Production/Staging 均未执行 DDL、seed、reset、push 或 repair。

## Remote-only migrations

| Migration | 来源 | 实际 SQL 来源 | 当前对象 | 纳入 Git | 处理方案 | 风险 |
|---|---|---|---|---|---|---|
| `20260801174809_staff_invitation_accounts` | Production | Production history 只读导出 | `staff_invitations` 与四个 legacy staff RPC | 是 | 保留真实版本和 SQL；后续 employee migration 继续撤销浏览器执行权 | 中：legacy 模块仍存在 |
| `20260801175013_staff_invitation_advisor_hardening` | Production | Production history 只读导出 | deny policy 与 FK indexes | 是 | 原样恢复 | 低 |
| `20260801204643_fix_staff_account_list_return_type` | Production | Production history 只读导出 | account list RPC 的 varchar→text cast | 是 | 原样恢复 | 低 |
| `20260801204745_fix_staff_invitation_email_ambiguity` | Production | Production history 只读导出 | invitation RPC 使用限定列名 | 是 | 原样恢复 | 低 |
| `20260805150922_restore_fast_inbound_rpc_execution` | Staging | Draft PR #11 commit `01f260d` | 恢复公开入库 wrapper 调用链 | 是 | 保留真实版本；由后续 canonical grant migration 收紧私有函数 | 高：Production 当前链路受阻 |
| `20260805151429_fix_product_media_file_size_column` | Staging | Draft PR #11 commit `01f260d` | media RPC 使用 `file_size_bytes` | 是 | 保留真实 SQL | 高：Production 当前定义仍未使用新列 |
| `20260805151605_secure_storefront_rpc_wrapper` | Staging | Draft PR #11 commit `01f260d` | catalog wrapper 改为 definer | 是 | 保留真实 SQL；后续撤销 private direct EXECUTE | 高：公开边界 |
| `20260805151718_fix_product_media_generated_storage_path` | Staging | Draft PR #11 commit `01f260d` | 兼容 generated `storage_path` | 是 | 保留真实 SQL，覆盖前一 media 定义 | 中 |
| `20260805151812_cast_product_publication_status` | Staging | Draft PR #11 commit `01f260d` | product status enum cast | 是 | 保留真实语义并允许 clean replay 已修正时 NOTICE | 高：Production 当前未显式 cast |
| `20260806071212_secure_storefront_order_rpc_wrappers` | Staging | Draft PR #11 commit `53c50a5` | order/lookup/cart public wrappers | 是 | 保留真实 SQL；后续撤销 private direct EXECUTE | 高：匿名下单边界 |

没有创建空白 migration。新增 `20260806105305_reconcile_rpc_execution_grants.sql` 是 forward security migration：公开 wrapper 作为唯一入口，private implementation 对 `anon`、`authenticated` 和 `service_role` 撤销直接执行。

## Fingerprint results

- 原始基线：Git 50，Production 54，Staging 56。
- Production 与 `origin/develop`：11/50 原始指纹一致，39/50 不同。
- 39 条中，规范化比较识别 34 条为格式/注释差异；5 条涉及函数、业务或 schema 顺序，需要最终对象快照和 clean replay 决策。
- Staging 与原 Git：46/50 一致，4/50 为可选对象/环境 fixture guard。
- 逐条 Production 表：`schema-audit/production-migration-fingerprint-analysis.md`。
- 逐条 Staging 表：`schema-audit/staging-migration-fingerprint-analysis.md`。
- Production 当前对象签名：`schema-audit/production-normalized-catalog.md`。

## History policy

保留远程独有 migration 的真实远程版本。共同 50 条的三方版本号仍不一致，所以任何已有远程项目都禁止 `db push`。本 PR优先建立可重放 Canonical migrations；history 对齐只能在对象级 parity、备份、审批和演练全部完成后单独决定。

## Isolated CI evidence

GitHub Actions run `31096427366` 在 2026-08-06 对 commit `05b1fdb` 完成隔离验证：

- 61 条 migration 从空数据库顺序回放：通过。
- tenant-aware reference seed：通过。
- `supabase db lint --local --level error`：通过。
- reconciliation、Phase 4、Phase 5、Phase 6 pgTAP：通过。
- 本地 schema TypeScript 类型生成：通过。
- migrations 对 fresh replay schema 的 diff：为空，通过。
- canonical local schema artifact：已生成。
- 应用 lint、typecheck、tests、build 与 Netlify build：通过。
- secret scan 与 high/critical dependency gate：通过。

该证据只证明 Git migrations 能在隔离空库构建 Canonical schema；不等于已对现有 Staging 或 Production 执行、修复或部署。
