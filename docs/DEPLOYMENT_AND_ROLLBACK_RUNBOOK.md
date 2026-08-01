# 部署、恢复与回滚手册

## 环境隔离

内部端和商城分别部署，连接同一个环境内的 Supabase，但 Preview 不得连接生产项目。Netlify 自动提供 `CONTEXT`；构建前运行 `npm run verify:environment`：

- `production`：URL 中的项目 ref 必须等于 `PRODUCTION_SUPABASE_PROJECT_REF`。
- `deploy-preview` / `branch-deploy`：项目 ref 必须与生产 ref 不同。
- 任意环境：`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 禁止使用 `sb_secret_` 或 service_role key。

推荐使用数据为空的 Supabase Branch/独立 Preview 项目。不要把生产数据复制到个人或公开预览环境。

## 发布前备份

1. 记录当前 Git commit、Netlify deploy ID、Supabase migration 列表和数据库版本。
2. 确认 Supabase 计划支持的备份/PITR 状态；Free 项目应使用 `supabase db dump` 导出 roles/schema/data。
3. 单独导出 Storage bucket、对象路径、大小、MIME 和校验值；数据库备份不包含 Storage 文件。
4. 备份 Auth/站点 URL/邮件模板/Storage policy 等项目配置截图或配置清单。
5. 对备份加密、限制访问并记录创建人、时间和保留期限。

## 预发布顺序

1. 从干净数据库按文件名顺序应用 `supabase/migrations/`。
2. 应用 `supabase/seed.sql`；确认只产生参考数据，不产生订单、库存或财务模拟数据。
3. 运行 `supabase/tests/phase4_order_fulfillment_returns.sql`、`phase5_procurement_finance_pos.sql`、`phase6_release_readiness.sql`；行为测试必须在事务中回滚。
4. 运行 Security/Performance Advisors，解释每条告警。
5. 运行根应用和 `customer-store` 的 lint、typecheck、test、Netlify build。
6. 使用岗位账号完成 UAT，再生成不可变发布候选 commit/tag。

## 生产变更窗口

1. 冻结业务写入并通知操作人员。
2. 完成最后备份，校验可读取。
3. 先应用向后兼容数据库迁移，再部署内部端，最后部署商城。
4. 执行只读冒烟：登录、商品目录、库存查询、订单查询、RLS 拒绝路径。
5. 执行一笔获批的小额/测试业务时必须由 Owner 授权并登记；否则不写生产业务数据。
6. 观察数据库/API/Auth/Storage 日志与错误率至少 30 分钟。

## 回滚条件

任一条件触发立即停止：登录大面积失败、RLS 越权、库存不守恒、重复订单/入库、付款状态错配、迁移异常、错误率显著上升。

回滚顺序：

1. 禁止新的业务写入，保留日志和 request/idempotency key。
2. Netlify 回滚到上一成功 deploy。
3. 若数据库迁移向后兼容，保留数据库版本并让旧应用读取；不要急于做破坏性 down migration。
4. 若必须恢复数据库，按 Supabase 恢复能力恢复到新项目优先，核对表计数、库存不变量、迁移版本、Auth 与 Storage，再切换连接。
5. Storage 文件需从独立备份恢复并核对 `product_media`/对象路径。
6. 记录事故时间线、影响范围、决策人和修复 commit。

## 恢复验收

- 所有 public 表 RLS 开启；公开视图为 security invoker。
- 用户/角色计数、商品/SKU/订单/付款/库存流水计数与备份清单一致。
- `quantity_available = quantity_on_hand - quantity_reserved - safety_stock` 且不为负。
- 订单预留与库存预留汇总一致；财务流水与付款/退款状态可追溯。
- Storage 元数据指向实际存在对象；随机抽样可读取授权文件、不可匿名读取私有文件。

本仓库未执行真实恢复演练；该项是生产上线前人工硬门禁。
