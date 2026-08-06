## 修改摘要

<!-- 一个 PR 只处理一个明确任务。 -->

## 应用范围

- [ ] Admin
- [ ] Operations
- [ ] Storefront
- [ ] Wholesale（预留）

## 环境影响

- 目标分支：`develop` / `main`
- 数据库变化：无 / migration 文件清单
- Storage / RLS / Function 变化：
- 环境变量变化（只写变量名，不写值）：

## 安全确认

- [ ] Preview/Staging 未连接 Production Supabase
- [ ] 未提交 `.env`、密码、service role 或私钥
- [ ] 未修改已执行的历史 migration
- [ ] Staging seed 不会在 Production 执行

## 测试结果

- [ ] lint
- [ ] typecheck
- [ ] unit/integration tests
- [ ] build
- [ ] migration reset/lint
- [ ] 手机端
- [ ] 桌面端

## Deploy Preview

<!-- 填写三个 Preview URL；未创建的应用写 N/A。 -->

- Admin：
- Operations：
- Storefront：

## 回滚方案与已知风险

<!-- 前端 Deploy 回滚、数据库兼容/回滚、已知问题。 -->
