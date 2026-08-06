# Supabase Edge Functions

2026-08-06 只读检查确认 Production 和 Staging 均没有已部署 Edge Function。本目录现在作为源代码的唯一预留位置；以后每个函数使用 `supabase/functions/<name>/index.ts`，并通过 PR 管理。

```bash
# Staging first
supabase functions deploy <name> --project-ref <STAGING_PROJECT_REF>
supabase secrets set KEY=value --project-ref <STAGING_PROJECT_REF>

# Production only after approval
supabase functions deploy <name> --project-ref <PRODUCTION_PROJECT_REF>
```

Secret 只能存入 Supabase Secrets 或受保护 CI Environment，不能写入函数源码、README、`.env.example` 的真实值或浏览器变量。
