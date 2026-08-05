# GitHub Pull Request 与 Netlify Deploy Preview 工作流

## 强制流程

1. 更新本地 `main`：只允许 fast-forward 到 `origin/main`。
2. 从最新 `main` 创建单一任务分支：
   - `feature/<name>`：新功能
   - `fix/<name>`：BUG 修复
   - `ui/<name>`：页面调整
   - `chore/<name>`：系统配置
3. 在分支运行 lint、TypeScript、测试、Sites build 和 Netlify build。
4. 只提交本任务文件，推送分支后创建 Draft Pull Request。
5. 等待 GitHub `PR policy`、`Code quality and builds` 与 Netlify Deploy Preview 全部通过。
6. 使用 Preview URL 完成手机端、桌面端和本任务相关业务验收。
7. Owner 明确回复“测试通过，可以合并”后，才允许将 PR 合并到 `main`。

禁止直接向 `main` 推送、强制推送、跳过检查、在 Preview 使用生产数据库或从自动化流程部署生产数据库迁移。

## Netlify 固定配置

- GitHub 仓库：`Max020526/WholesaleSystem`
- Production branch：`main`
- Build command：`npm run verify:environment && npm run build:netlify`
- Publish directory：`.next`
- Node.js：24
- Package manager：npm（使用 `package-lock.json` 和 `npm ci`）
- Deploy Previews：对所有指向 `main` 的 Pull Request 启用
- Branch deploys：仅生产分支；日常测试使用 Deploy Preview

`netlify.toml` 是构建配置的版本化来源。Netlify UI 中与它冲突的构建值不应覆盖仓库配置。

## Supabase 环境隔离

Netlify 中以下变量必须使用 Context-specific values，真实值只能保存在 Netlify：

| 变量 | Production | Deploy Previews |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 正式项目 URL | 独立开发项目或 Supabase Branch URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 正式 publishable key | 对应开发项目/Branch 的 publishable key |
| `PRODUCTION_SUPABASE_PROJECT_REF` | 正式项目 ref | 同一个正式项目 ref，仅用于隔离校验 |
| `SUPABASE_SECRET_KEY` | 仅 Builds/Functions/Runtime，正式值 | 默认不提供；确需员工管理 API 时使用测试项目 Secret |

`NEXT_PUBLIC_SITE_URL` 的 Production 值为正式域名；Deploy Preview 自动使用 Netlify 提供的 `DEPLOY_PRIME_URL`。不要把 `service_role`、数据库密码或 Secret 添加 `NEXT_PUBLIC_` 前缀。

如果没有测试 Supabase 项目，Deploy Preview 必须在环境检查阶段失败。此时只允许查看静态代码检查结果，不得把 Preview 临时改回生产项目，也不得执行订单、库存、账号或财务写入测试。

## Pull Request 检查

每个 PR 必须填写仓库模板中的修改摘要、文件、数据库影响、环境变量、测试步骤、已知问题、Preview URL 和回滚方法。测试数据使用 `TEST_` 或 `preview-test@example.com` 等明显标识，并且只在开发数据库清理。

最低页面检查：

- 首页、登录/退出、管理端、员工端、仓库端和商城入口可打开。
- 手机端与桌面端布局正常，刷新深层路由不返回 404。
- 图片和字体没有 404，浏览器控制台没有严重错误。
- 按本次任务选择商品、SKU、入库、库存、权限、订单或财务流程测试。

## 数据库 Migration

- Migration 必须单独列在 PR 描述中。
- 先在独立 Supabase 开发项目/Branch 验证。
- 优先采用向后兼容的前向迁移；PR 中说明旧代码兼容性。
- 提供回滚 SQL，或说明为何应使用前向修复而不是破坏性 down migration。
- PR/Netlify 自动化不得应用生产 Migration；生产应用必须在 Owner 确认和备份之后单独执行。

## 回滚

- 未合并 PR：继续在同一分支修复，或关闭 PR；不会影响生产。
- 已合并但未迁移数据库：在新 `fix/` 分支 revert 对应 commit，并通过新的 PR。
- 已部署且包含数据库变化：优先回滚 Netlify 到上一成功部署，并根据 PR 中的兼容方案执行已审核的前向修复。禁止擅自重置生产数据库。
