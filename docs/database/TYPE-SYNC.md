# Supabase TypeScript type sync

唯一规范类型文件是 `packages/types/src/database.types.ts`，根目录 `types/database.ts` 仅作为兼容 re-export。数据库结构变化后，在 migration 已部署并验证于 Staging 后执行：

```bash
supabase login
STAGING_SUPABASE_PROJECT_REF=<STAGING_PROJECT_REF> npm run types:generate:staging
```

审查类型 diff，并将类型文件与 migration 提交在同一 PR。不要分别手工编辑不同电脑上的类型。Production 与 Staging schema 必须在生产发布完成后回到同一 migration 版本。
