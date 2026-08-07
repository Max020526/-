# New computer setup

本流程把 GitHub 作为代码真源，把 Supabase Staging 作为远程测试数据源。禁止把旧电脑的 `.env.local`、`node_modules`、`.next` 或数据库密码复制进仓库。

## 1. 安装工具

安装 Git、Node.js 22.13+、GitHub CLI 和 Supabase CLI。项目当前使用 npm 与已提交的 `package-lock.json`，不要擅自改用其他包管理器。

## 2. 登录并克隆

```bash
gh auth login
git clone https://github.com/Max020526/WholesaleSystem.git nexora-fashion-commerce
cd nexora-fashion-commerce
git checkout develop
git pull --ff-only origin develop
npm ci
npm --prefix apps/storefront ci
```

## 3. 配置本地环境

```bash
cp .env.example .env.local
cp apps/storefront/.env.example apps/storefront/.env.local
```

优先运行本地 Supabase：

```bash
supabase start
supabase db reset
```

如确需读取远程 Staging，在 `.env.local` 中设置 Staging URL、publishable key、两个环境 project ref，并显式设置 `ALLOW_REMOTE_STAGING_FOR_LOCAL=true`。Local 和 Preview 永远不得使用 Production URL。

## 4. 关联 Staging 与生成类型

```bash
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
STAGING_SUPABASE_PROJECT_REF=<STAGING_PROJECT_REF> npm run types:generate:staging
git diff -- packages/types/src/database.types.ts
```

类型变化必须和对应 migration 一起提交。生成脚本明确使用 Staging project ref，不依赖某台电脑的默认链接。

## 5. 启动与验证

```bash
npm run dev:netlify
npm --prefix apps/storefront run dev:netlify
npm run lint
npm run typecheck
npm run test
npm run build
npm --prefix apps/storefront run lint
npm --prefix apps/storefront run typecheck
npm --prefix apps/storefront run test
npm --prefix apps/storefront run build:netlify
```

浏览器验证：测试 Owner 登录、商品目录、库存、图片读取、仓库端和商城；确认页面顶部显示非生产环境标识，浏览器网络请求只指向 Staging/Local Supabase。

## 6. 开发与收尾

```bash
git checkout develop
git pull --ff-only origin develop
git switch -c feature/<short-name>
# 修改并测试
git status
git add <明确文件>
git commit -m "feat: describe the change"
git push -u origin feature/<short-name>
gh pr create --draft --base develop
```

每次离开电脑前确认 `git status`、远程分支和 Draft PR。禁止直接推送 main 或使用 `git push --force`。
