# Migration drift audit status

## Baseline

| Source | Original count | Unique migrations |
|---|---:|---|
| Git `origin/develop` before reconciliation | 50 | — |
| Production | 54 | 4 staff invitation migrations |
| Staging before reconciliation | 56 | 6 functional/security repair migrations |

三方共同 migration 的时间戳版本均不一致。Production 有 39 条原始指纹差异，Staging 有 4 条。完整逐条分类和对象签名位于 `docs/deployment/schema-audit/`。

## Canonical Git history

Migration reconciliation 恢复全部 10 条远程独有真实 migration，修复历史 clean-replay 依赖，并新增一个 forward RPC grant 收敛 migration。因此 Canonical 文件总数为 61。数量增加是恢复真实 SQL 与明确 forward change 的结果，不是为了强制凑齐远程 history。

隔离 CI 已通过：61 条 migration fresh replay、reference seed、`db lint --level error`、全部 pgTAP、数据库类型生成和空 schema diff。

## Staging deployment on 2026-08-06

只对 Staging 项目 `iucikdtxpwnvhdcpulqa` 应用了 forward migration `reconcile_rpc_execution_grants`。执行前后均未 reset、未 seed、未 repair，也未运行 `db push`。

- Staging history：56 → 57。
- 6 个 `private` SECURITY DEFINER 实现已撤销 `anon`、`authenticated`、`service_role` 的直接执行权。
- 公开 wrapper 保留最小所需执行角色。
- 入库、库存、商品与上架相关 10 张业务表均已确认启用 RLS 并存在 policy。
- Production writes：0。

Staging 仍保留其历史重新编号版本，因此不能对现有项目运行普通 `supabase db push`。后续若要完全对齐 61 条 Canonical history，应新建空白 Staging 项目回放，或在对象级 parity、备份和专项审批后设计独立 history reconciliation；不得盲目 `migration repair`。

## Current safety state

- Production writes: 0
- Production `db push`: 未执行
- Production `migration repair`: 未执行
- Production reset/seed/DDL: 未执行
- Staging reset/seed/repair: 未执行
- Staging destructive DDL: 未执行

## Next gate

1. 合并通过 CI 的部署架构到 `develop`。
2. 仅部署连接 Staging Supabase 的 Netlify Staging 站点。
3. 验证登录、RLS、Storage 与入库到上架流程。
4. 测试失败只修复 Staging；不得触碰 Production。
5. 完整验收后另建 `develop → main` Release PR，并在 Production 备份和人工审批后发布。
