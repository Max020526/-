# Restore procedure

## 代码恢复

1. 从 GitHub 克隆并 checkout 已知稳定 tag 或 commit。
2. 用锁文件执行根应用和 `apps/storefront` 的 `npm ci`。
3. 重新从安全保管位置配置环境变量。
4. 执行 lint、typecheck、test、build；通过后用 Netlify 历史 Deploy 或 GitHub PR 恢复前端。

## 数据库恢复

1. 冻结写入并记录事故时间、当前 migration 与受影响表。
2. 在 Supabase 控制台确认可用备份/时间点；先恢复到隔离项目验证，禁止直接覆盖 Production 试验。
3. 比较 `supabase_migrations.schema_migrations` 与 GitHub migrations，验证 RLS、RPC、Auth 和 Storage policy。
4. 由负责人批准 Production 恢复，恢复后运行只读健康检查和小范围业务验收。
5. 若只是应用错误，优先回滚 Netlify；不要因为前端问题回滚数据库。

破坏性变更使用 Expand-and-Contract。每次演练记录恢复点目标、实际耗时、数据差异和改进项。
