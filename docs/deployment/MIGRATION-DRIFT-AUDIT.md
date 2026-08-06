# Migration drift audit — 2026-08-06

本审计只读取 Git 文件、`supabase_migrations.schema_migrations` 和 Supabase Advisors。没有执行 `db push`、`migration repair`、远程 DDL、远程 reset 或 seed。

## 结论

- Git 有 50 个 migration 文件，Production 有 54 条 history，Staging 有 56 条 history。
- 50 个 Git migration 在两个远程项目中都能按逻辑名称找到，但三方的 history `version` 全部不一致。Supabase CLI 按时间戳判断迁移是否已应用，因此当前不能安全执行 `db push`。
- 对远程 `statements` 与 Git 文件做 MD5 原始文本指纹比较：Production 11/50 完全一致、39/50 不同；Staging 46/50 完全一致、4/50 不同。原始文本不同可能来自 SQL 内容、注释、空白或换行差异，必须做受控 SQL diff 才能判断语义差异。
- Production 独有 4 条 staff invitation migration；当前 Git 历史和 Staging 均没有。
- Staging 独有 6 条修复 migration；对应 SQL 只存在于 Draft PR #11 分支，尚未进入 `develop`。
- Git migration 从零重放在 `20260731201429_harden_and_complete_core.sql` 失败：它撤销不存在的 `public.rls_auto_enable()`。在不修改已执行历史 migration 的约束下，需要单独批准 baseline/squash 或兼容引导策略。

## 分类、来源与处理

| 分类 | 可能来源 | 风险 | 推荐处理 |
|---|---|---|---|
| C1 | 可能通过 Dashboard/MCP 逐条执行，远程使用执行时间生成 history version；名称仍对应 Git | 严重：CLI 会把 Git 时间戳视为未执行，可能尝试重复 DDL | 冻结远程 push；导出 SQL、逐条语义 diff；设计经审核的 baseline/reconciliation，不直接 repair |
| C2 | Production-only Dashboard/MCP migration，源文件未进入 Git | 严重：Git 无法重建 Production，Staging 缺少同一能力 | 只读导出 SQL，清理敏感数据后创建新的向前 migration；先验证 Staging |
| C3 | Staging 修复分支直接应用，尚未合并 Git/develop | 高：Staging 超前，PR 关闭后代码来源可能丢失 | 从 PR #11 拆出只新增 migration 的审查 PR；先解决 fresh replay 与历史修改问题 |
| C4 | 其他组合 | 待定 | 停止发布并人工调查 |

“内容”列的“同/异”仅表示原始 SQL 文本指纹是否与当前 Git 文件完全相同，不代表语义等价或不等价。

## 逐条矩阵

| 逻辑 migration | Git 版本 | Production history | 内容 | Staging history | 内容 | 分类 |
|---|---:|---:|:---:|---:|:---:|:---:|
| `initial_nexora_schema` | `20260731185604` | `20260731201234` | 异 | `20260805145727` | 同 | C1 |
| `harden_and_complete_core` | `20260731201429` | `20260731201543` | 异 | `20260805145823` | 异 | C1 |
| `complete_foreign_key_indexes` | `20260731214000` | `20260731202347` | 异 | `20260805145824` | 同 | C1 |
| `receipt_ocr_attachments` | `20260731224500` | `20260731203856` | 异 | `20260805145827` | 同 | C1 |
| `apply_ocr_product_metadata` | `20260731225500` | `20260731204310` | 异 | `20260805145828` | 同 | C1 |
| `catalog_product_editor` | `20260731235900` | `20260731212721` | 异 | `20260805145829` | 同 | C1 |
| `inventory_adjustment_rpc` | `20260801000100` | `20260731214601` | 异 | `20260805145849` | 同 | C1 |
| `secure_orders_and_receipts` | `20260801013000` | `20260731222511` | 异 | `20260805145851` | 同 | C1 |
| `optimize_role_policies` | `20260801014500` | `20260731222829` | 异 | `20260805145853` | 同 | C1 |
| `fast_inbound_foundation` | `20260801094858` | `20260801095713` | 异 | `20260805145908` | 同 | C1 |
| `confirm_fast_inbound` | `20260801100527` | `20260801100613` | 同 | `20260805145912` | 同 | C1 |
| `cancel_fast_inbound` | `20260801100936` | `20260801101037` | 同 | `20260805145913` | 同 | C1 |
| `product_image_management` | `20260801101305` | `20260801101404` | 异 | `20260805145915` | 同 | C1 |
| `add_inbound_custom_colors` | `20260801110403` | `20260801110839` | 异 | `20260805145918` | 同 | C1 |
| `repair_reference_text_encoding` | `20260801114454` | `20260801114659` | 异 | `20260805145920` | 同 | C1 |
| `enforce_inventory_rpc_only` | `20260801143000` | `20260801130818` | 异 | `20260805145924` | 同 | C1 |
| `v1_phase1_baseline_alignment` | `20260801160000` | `20260801142749` | 异 | `20260805145927` | 同 | C1 |
| `post_size_aware_inbound_receipt` | `20260801161000` | `20260801142757` | 异 | `20260805145934` | 同 | C1 |
| `harden_inbound_cancellation` | `20260801162000` | `20260801142759` | 异 | `20260805145935` | 同 | C1 |
| `phase2_product_operations` | `20260801170000` | `20260801142804` | 异 | `20260805145937` | 同 | C1 |
| `phase2_product_operations_rpc` | `20260801171000` | `20260801142812` | 异 | `20260805145940` | 同 | C1 |
| `phase2_media_public_boundary` | `20260801172000` | `20260801142817` | 异 | `20260805145942` | 同 | C1 |
| `phase2_advisor_hardening` | `20260801173000` | `20260801142909` | 异 | `20260805145944` | 同 | C1 |
| `staff_invitation_accounts` | — | `20260801174809` | — | — | — | C2 |
| `staff_invitation_advisor_hardening` | — | `20260801175013` | — | — | — | C2 |
| `phase3_storefront_orders` | `20260801180000` | `20260801150754` | 异 | `20260805145949` | 同 | C1 |
| `phase3_pgcrypto_namespace` | `20260801181000` | `20260801151009` | 异 | `20260805145951` | 同 | C1 |
| `phase3_advisor_indexes` | `20260801182000` | `20260801151057` | 异 | `20260805145953` | 同 | C1 |
| `phase4_order_fulfillment_returns` | `20260801190000` | `20260801153544` | 异 | `20260805145955` | 同 | C1 |
| `phase4_order_fulfillment_rpcs` | `20260801191000` | `20260801153626` | 异 | `20260805145956` | 同 | C1 |
| `phase4_storefront_order_projection` | `20260801192000` | `20260801154240` | 异 | `20260805150004` | 同 | C1 |
| `phase4_uuid_min_compat` | `20260801193000` | `20260801154655` | 异 | `20260805150007` | 同 | C1 |
| `phase4_advisor_hardening` | `20260801194000` | `20260801155001` | 异 | `20260805150013` | 同 | C1 |
| `phase5_procurement_finance_pos` | `20260801200000` | `20260801160450` | 异 | `20260805150015` | 同 | C1 |
| `phase5_business_rpcs` | `20260801201000` | `20260801160459` | 异 | `20260805150017` | 同 | C1 |
| `phase5_pos_metrics` | `20260801202000` | `20260801160520` | 异 | `20260805150020` | 同 | C1 |
| `phase5_idempotency_rls_hardening` | `20260801203000` | `20260801161123` | 异 | `20260805150021` | 同 | C1 |
| `phase5_receive_status_normalization` | `20260801204000` | `20260801161255` | 异 | `20260805150027` | 同 | C1 |
| `fix_staff_account_list_return_type` | — | `20260801204643` | — | — | — | C2 |
| `fix_staff_invitation_email_ambiguity` | — | `20260801204745` | — | — | — | C2 |
| `phase5_command_result_upsert` | `20260801205000` | `20260801161350` | 异 | `20260805150029` | 同 | C1 |
| `phase5_pos_payment_status` | `20260801206000` | `20260801161439` | 异 | `20260805150036` | 同 | C1 |
| `phase5_uuid_aggregate_compat` | `20260801207000` | `20260801161513` | 异 | `20260805150038` | 同 | C1 |
| `phase5_foreign_key_indexes` | `20260801208000` | `20260801161911` | 异 | `20260805150040` | 同 | C1 |
| `phase6_release_hardening` | `20260801209000` | `20260801173603` | 异 | `20260805150111` | 同 | C1 |
| `fast_inbound_canonical_permissions` | `20260804120000` | `20260804092200` | 同 | `20260805150113` | 同 | C1 |
| `canonical_inventory_viewers` | `20260804121000` | `20260804092309` | 同 | `20260805150115` | 同 | C1 |
| `fix_fast_inbound_sku_value` | `20260804122000` | `20260804092413` | 同 | `20260805150118` | 同 | C1 |
| `user_warehouse_policy_advisors` | `20260804123000` | `20260804093552` | 同 | `20260805150120` | 同 | C1 |
| `employee_invitation_rbac_scopes` | `20260804130000` | `20260804095320` | 同 | `20260805150146` | 异 | C1 |
| `employee_session_control` | `20260804131000` | `20260804095736` | 同 | `20260805150148` | 同 | C1 |
| `repair_max_and_manager_invite` | `20260804132000` | `20260804101108` | 同 | `20260805150215` | 异 | C1 |
| `employee_access_advisor_hardening` | `20260804133000` | `20260804101140` | 同 | `20260805150259` | 异 | C1 |
| `complete_receiving_product_scope_rls` | `20260804134000` | `20260804101408` | 同 | `20260805150302` | 同 | C1 |
| `restore_fast_inbound_rpc_execution` | — | — | — | `20260805150922` | — | C3 |
| `fix_product_media_file_size_column` | — | — | — | `20260805151429` | — | C3 |
| `secure_storefront_rpc_wrapper` | — | — | — | `20260805151605` | — | C3 |
| `fix_product_media_generated_storage_path` | — | — | — | `20260805151718` | — | C3 |
| `cast_product_publication_status` | — | — | — | `20260805151812` | — | C3 |
| `secure_storefront_order_rpc_wrappers` | — | — | — | `20260806071212` | — | C3 |

## Advisors 与附加证据

- Production Security Advisor：1 个 WARN（Leaked Password Protection 未启用）。
- Staging Security Advisor：8 个 WARN；其中 7 个涉及公开或已登录角色可执行 `SECURITY DEFINER` Storefront RPC，另 1 个为 Leaked Password Protection 未启用。公开商城 RPC 可能是有意设计，但必须逐函数验证鉴权、速率限制、参数校验与最小授权。
- Performance Advisor：Production 168 个 INFO，Staging 190 个 INFO；主要为未使用索引。新环境或低流量环境的该指标不能直接作为删索引依据。
- 当前机器没有可用 Docker；GitHub Actions 的隔离 Docker 验证已真实运行，并在第二个 migration 失败。

## 解阻顺序

1. 对 39 个 Production 指纹差异和 4 个 Staging 指纹差异做 SQL 语义 diff，不修改远程。
2. 只读导出 C2 的 SQL，建立新的 Git 迁移来源；不得把真实业务数据写入文件。
3. 拆分 PR #11 的 C3 文件，禁止夹带未经证明的历史 migration 修改。
4. 选择并书面批准 fresh-database 策略：受控 baseline/squash，或等价的可重放兼容方案。
5. 在 CI/本地空库通过 `db reset`、`db lint`、pgTAP 后，才允许将 reconciliation 先应用到 Staging。
6. Staging 完整验收后，另开 Production Release PR；先备份/PITR，再人工批准。
