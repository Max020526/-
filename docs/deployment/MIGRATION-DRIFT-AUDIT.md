# Migration drift audit status

## Baseline

| Source | Count | Unique migrations |
|---|---:|---|
| Git `origin/develop` | 50 | — |
| Production | 54 | 4 staff invitation migrations |
| Staging | 56 | 6 functional/security repair migrations |

三方共同 migration 的时间戳版本均不一致。Production 有 39 条原始指纹差异，Staging 有 4 条。完整逐条分类和对象签名位于 `docs/deployment/schema-audit/`。

## Reconciliation branch

本分支恢复全部 10 条远程独有真实 migration，修复历史 clean-replay 依赖，并新增一个 forward RPC grant 收敛 migration。因此 Canonical 文件总数为 61。数量增加是恢复真实 SQL 与明确 forward change 的结果，不是为了强制凑齐远程 history。

## Safety state

- Production writes: 0
- Staging writes: 0
- `db push`: 未执行
- `migration repair`: 未执行
- remote reset/seed/DDL: 未执行
- Netlify deploy: 未执行

隔离 CI 的 fresh replay、db lint、pgTAP、类型生成和 schema diff 已全部通过。Staging connector 的当前对象只读复核仍未完成，因此数据库部署继续冻结。
