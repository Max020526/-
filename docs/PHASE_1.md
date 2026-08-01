# 第1阶段：项目基础与 Supabase 连接

## 已建立

- 继续使用现有 Next.js App Router 根目录结构，避免移动页面造成路由回归。
- `lib/supabase/client.ts`：浏览器客户端，使用 Publishable Key。
- `lib/supabase/server.ts`：服务端 Cookie 客户端，用户权限仍由 RLS 控制。
- `lib/supabase/admin.ts`：仅服务端管理员客户端，为后续员工账号管理预留。
- `lib/supabase/config.ts`：统一检查公开 Supabase 配置。
- `types/domain.ts`：新业务角色、商品状态、入库状态和库存流水类型。
- `netlify.toml`：Netlify Next.js 构建和本地开发配置。

## 环境变量

本地复制 `.env.example` 为 `.env.local`。Netlify 上应在 Project configuration → Environment variables 中设置变量，不应把真实密钥写入 `netlify.toml`。

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：可公开的 Publishable Key。
- `NEXT_PUBLIC_SITE_URL`：当前部署域名。
- `SUPABASE_SECRET_KEY`：仅未来员工管理服务端接口使用，第一阶段可不配置。

## 构建入口

- `npm run dev` / `npm run build`：保留现有 Sites/Vinext 流程。
- `npm run dev:netlify` / `npm run build:netlify`：原生 Next.js 与 Netlify 流程。
- `npm run typecheck`：独立 TypeScript 严格检查。
