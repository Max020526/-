# Environment matrix

| Environment | Git branch | Netlify | Supabase | Data | Purpose |
|---|---|---|---|---|---|
| Local | `feature/*`, `fix/*`, `chore/*`, `docs/*` | local process | Supabase CLI (`127.0.0.1:54321`) | simulated developer data | individual development |
| Preview | Pull Request | Deploy Preview | Preview Branch or Staging | temporary test data | review and page preview |
| Staging | `develop` | three Staging sites | `nexora-fashion-staging` | complete simulated data | integration/UAT |
| Production | `main` | three Production sites | `nexora-fashion-production` | real business data | live operations |

## Mandatory variables

All applications:

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_APP_SURFACE`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred modern key; legacy anon key is accepted temporarily)
- `NEXT_PUBLIC_SITE_URL`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `STAGING_SUPABASE_PROJECT_REF`

Cross-application URLs:

- Admin: `NEXT_PUBLIC_STOREFRONT_URL`
- Operations: `NEXT_PUBLIC_ADMIN_URL`
- Storefront: `NEXT_PUBLIC_ADMIN_URL`
- Optional shared: `NEXT_PUBLIC_OPERATIONS_URL`

Preview Branch deployments additionally set `PREVIEW_SUPABASE_PROJECT_REF`.

## Expected values

| Context | APP_ENV | Branch | Supabase ref must equal |
|---|---|---|---|
| local | local | short-lived | local (or explicitly allowed Staging) |
| deploy-preview | preview | PR head | Preview ref or Staging ref |
| Staging site production context | staging | develop | Staging ref |
| Production site production context | production | main | Production ref |

The project refs are guards, not credentials. Real keys and passwords remain in Netlify/GitHub/Supabase secret stores.

## Environment identity

- Local banner: `LOCAL 本地开发环境`.
- Preview banner: `PREVIEW 预览环境 — 仅供代码审查与验收`.
- Staging banner: `STAGING 测试环境 — 当前数据不会进入正式系统`.
- Production has no environment banner.
- Preview/Staging titles include an environment suffix and send noindex instructions.
