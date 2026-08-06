# Production migration 指纹差异语义分类

生成时间：2026-08-06。基线严格使用 `origin/develop` 的 50 条 Git migration，与 Production 只读 history 比较；本分支新增/修复文件不计入此表。

分类：A 格式/注释；B 顺序变化；C 函数定义；D 表/字段/约束/索引；E RLS Policy；F 权限/search_path/SECURITY；G 业务逻辑；H 无法确认。自动分类用于缩小审计范围，最终取舍见 Canonical Schema 决策和对象快照。

共 39 条原始指纹不同。

| Migration | Git版本 | Production版本 | 分类 | Git版本摘要 / 远程差异摘要 | 最终Schema影响 | 安全影响 | 业务影响 | 推荐基准/forward migration |
|---|---:|---:|---|---|---|---|---|---|
| `initial_nexora_schema` | `20260731185604` | `20260731201234` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `harden_and_complete_core` | `20260731201429` | `20260731201543` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `complete_foreign_key_indexes` | `20260731214000` | `20260731202347` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `receipt_ocr_attachments` | `20260731224500` | `20260731203856` | A | create policy warehouse_staff_all_receipt_attachments / create policy warehouse_staff_all_receipt_attachments on public.stock_receipt_attachments for all to authenticated | 否 | 否 | 否 | Git（仅规范化格式） |
| `apply_ocr_product_metadata` | `20260731225500` | `20260731204310` | A | insert into public.brands(name) values(item.source_metadata->>'brand') / on conflict(name) do update set name=excluded.name returning id into b_id; | 否 | 否 | 否 | Git（仅规范化格式） |
| `catalog_product_editor` | `20260731235900` | `20260731212721` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `inventory_adjustment_rpc` | `20260801000100` | `20260731214601` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `secure_orders_and_receipts` | `20260801013000` | `20260731222511` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `optimize_role_policies` | `20260801014500` | `20260731222829` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `fast_inbound_foundation` | `20260801094858` | `20260801095713` | C/G | raise exception '你没有权限修改员工角色或账号状态'; / raise exception '款号字段不一致，请重新检查'; | 可能；以最终对象快照判定 | 需核对函数 | 需核对 | Production 当前对象为运行参考；差异通过独立 forward migration 收敛 |
| `product_image_management` | `20260801101305` | `20260801101404` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `add_inbound_custom_colors` | `20260801110403` | `20260801110839` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `repair_reference_text_encoding` | `20260801114454` | `20260801114659` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `enforce_inventory_rpc_only` | `20260801143000` | `20260801130818` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `v1_phase1_baseline_alignment` | `20260801160000` | `20260801142749` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `post_size_aware_inbound_receipt` | `20260801161000` | `20260801142757` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `harden_inbound_cancellation` | `20260801162000` | `20260801142759` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase2_product_operations` | `20260801170000` | `20260801142804` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase2_product_operations_rpc` | `20260801171000` | `20260801142812` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase2_media_public_boundary` | `20260801172000` | `20260801142817` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase2_advisor_hardening` | `20260801173000` | `20260801142909` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase3_storefront_orders` | `20260801180000` | `20260801150754` | D | create extension if not exists pg_trgm with schema extensions; / create index if not exists stock_reservations_variant_idx | 可能；以最终对象快照判定 | 否 | 否 | Production 当前对象为运行参考；差异通过独立 forward migration 收敛 |
| `phase3_pgcrypto_namespace` | `20260801181000` | `20260801151009` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase3_advisor_indexes` | `20260801182000` | `20260801151057` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase4_order_fulfillment_returns` | `20260801190000` | `20260801153544` | C/G | ('returns.read','returns','read','查看退货与质检记录'), / ('returns.manage','returns','manage','审核、收货和质检退货'), | 可能；以最终对象快照判定 | 需核对函数 | 需核对 | Production 当前对象为运行参考；差异通过独立 forward migration 收敛 |
| `phase4_order_fulfillment_rpcs` | `20260801191000` | `20260801153626` | C/G | raise exception '操作标识无效，请刷新页面后重试'; / if actor_id is null then raise exception '请先登录'; end if; | 可能；以最终对象快照判定 | 需核对函数 | 需核对 | Production 当前对象为运行参考；差异通过独立 forward migration 收敛 |
| `phase4_storefront_order_projection` | `20260801192000` | `20260801154240` | C/G | if not found then raise exception '订单不存在或查询信息无效'; end if; / if p_lookup_token is null then raise exception '订单不存在或查询信息无效'; end if; | 可能；以最终对象快照判定 | 需核对函数 | 需核对 | Production 当前对象为运行参考；差异通过独立 forward migration 收敛 |
| `phase4_uuid_min_compat` | `20260801193000` | `20260801154655` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase4_advisor_hardening` | `20260801194000` | `20260801155001` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_procurement_finance_pos` | `20260801200000` | `20260801160450` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_business_rpcs` | `20260801201000` | `20260801160459` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_pos_metrics` | `20260801202000` | `20260801160520` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_idempotency_rls_hardening` | `20260801203000` | `20260801161123` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_receive_status_normalization` | `20260801204000` | `20260801161255` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_command_result_upsert` | `20260801205000` | `20260801161350` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_pos_payment_status` | `20260801206000` | `20260801161439` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_uuid_aggregate_compat` | `20260801207000` | `20260801161513` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase5_foreign_key_indexes` | `20260801208000` | `20260801161911` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
| `phase6_release_hardening` | `20260801209000` | `20260801173603` | A | 仅换行、空格或注释差异 | 否 | 否 | 否 | Git（仅规范化格式） |
