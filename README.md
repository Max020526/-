# NEXORA Fashion Commerce Platform V1.0

NEXORA 是服装零售商业平台。部署生命周期严格分为 Local、Staging 和 Production；Admin、Operations 与 Storefront 使用独立 Netlify 站点，并按生命周期连接独立 Supabase 项目。

> 当前处于兼容迁移阶段：GitHub 根目录仍是合并式 Admin/Operations 应用；原版顾客商城已安全归档到 `apps/storefront`。`apps/admin`、`apps/operations` 仍是边界占位目录，不可直接部署。完整现状见 [`docs/deployment/ARCHITECTURE.md`](docs/deployment/ARCHITECTURE.md)。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS、App Router
- Supabase PostgreSQL、Auth、Storage、RLS、PostgreSQL RPC
- Netlify 构建准备；数据库使用 Supabase Cloud
- 正式和测试 Supabase Database/Auth/Storage 完全隔离
- 原版顾客商城源码位于 `apps/storefront`，有独立锁文件、测试和 Netlify 构建配置

## 工作区

- `/warehouse`：仓库与门店作业入口
- `/warehouse/receipts`：标准到货单
- `/inbound/new`：主管快速入库
- `/warehouse/fulfillment`：拣货、复核、打包、配送和自提
- `/admin/products`：商品资料、图片、价格与渠道发布
- `/admin/orders`：订单运营、付款核验、取消和时间线
- `/admin/returns`：退货审核、收货、质检处置和内部退款记录
- `/admin/purchasing`：采购审批、下达、部分收货和采购差异
- `/admin/finance`：经营收支、费用、采购付款、毛利和 CSV
- `/admin/business`：老板统一经营指标与下钻入口
- `/warehouse/pos`：开班、扫码销售、收款、扣库存和现金交班
- `/inventory`：库存余额与不可变流水查询
- `/settings`：颜色、分类、供应商、员工和审计

## 本地运行

需要 Node.js 22.13 或更高版本。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev:netlify
```

将 `.env.local` 连接到 Supabase CLI (`http://127.0.0.1:54321`)。临时连接远程 Staging 必须显式设置 `ALLOW_REMOTE_STAGING_FOR_LOCAL=true`；Local 永远不能连接 Production。不要把 service role 或 secret key 放入 `NEXT_PUBLIC_*`。

换电脑时从 GitHub 克隆 `develop`，不要复制旧电脑的 `node_modules`、`.next` 或真实 `.env`。完整流程见 [`NEW-COMPUTER-SETUP.md`](docs/development/NEW-COMPUTER-SETUP.md)。商城依赖单独安装：`npm --prefix apps/storefront ci`。

## Supabase 初始化

1. 创建 Supabase 项目并安装 Supabase CLI。
2. 将根目录 `supabase/migrations/` 按时间顺序应用到开发项目。
3. 本地 reset 会依次运行 `supabase/seeds/base.sql` 与 `supabase/seeds/staging.sql`；Production 工作流不会运行任何 seed。
4. 创建第一个内部 Owner 后，在 `/settings/users` 分配其他岗位。
5. 在 Auth 控制台启用泄露密码检测，并为 Owner/System Admin 配置 MFA。
6. 保持 `product-images` Storage bucket 为 Private。

核心环境变量见 `.env.example`。正式环境必须分别在内部端和顾客商城配置可信站点 URL 与 Auth Redirect URL。

## 权限与数据一致性

- 岗位包括 Owner、System Admin、Warehouse Manager、Warehouse Staff、Product Operator、Order & CS、Buyer、Finance、Auditor 和 Cashier。
- 页面守卫、服务端操作、RLS、Storage Policy 和 RPC 同时校验权限。
- 可售库存为 `on_hand - reserved - safety_stock`，不小于零。
- 库存余额来自唯一 `inventory` 表，`inventory_balances` 只是安全视图；库存事实来自不可变 `inventory_movements`。
- 入库、预占、取消释放、发货/领取、退货质检都在单个事务中更新余额、流水和审计。
- 顾客端不能直接写核心订单、库存、付款、履约、退货或退款表。

## 第四阶段：订单、履约与售后

订单总体状态、付款状态和履约状态已经分离。配送发货和自提领取通过 `rpc_consume_order_stock` 扣减库存；取消通过 `rpc_release_order_stock` 只释放预占；退货通过 `rpc_post_return` 按质检处置决定可售、隔离、破损或报损。

关键 RPC：

- `rpc_order_command`
- `rpc_release_order_stock`
- `rpc_consume_order_stock`
- `rpc_request_return`
- `rpc_post_return`
- `rpc_return_command`

当前退款适配器仅记录内部授权结果，不代表真实支付网关清算；没有保存银行卡数据，也没有伪造邮件、短信或承运商发送成功。详细说明见 `docs/PHASE_4.md`。

## 第五阶段：采购、经营财务与 POS

采购单按 `draft → approved → ordered → partially_received → received` 流转，仓库通过 `rpc_receive_purchase_order` 分批收货并原子更新统一库存和加权平均成本。POS 通过 `rpc_complete_pos_sale` 复用订单、付款和库存模型；费用、采购付款、线上收款、POS 收款和退款形成不可覆盖的 `financial_entries`。

老板看板与财务中心共用 `rpc_business_metrics`，所有日期边界使用 Europe/Rome。经营财务是内部管理账，不替代意大利法定会计、IVA、SDI 或税控收银设备。详细口径见 `docs/PHASE_5.md`。

## 测试与质量门禁

```powershell
npm run lint
npm run typecheck
npm run verify:environment
npm test
npm run build:netlify
```

数据库 A08–A13 行为测试位于 `supabase/tests/`。它们在事务中临时建立商品、库存、订单、采购、费用与 POS 数据，断言完成后执行 `ROLLBACK`。

## 部署治理

所有构建先运行环境门禁。Preview/Branch Deploy 必须连接非生产 Supabase；main/Production 和 develop/Staging 的分支、URL、项目 ref 不匹配时构建直接失败。非 Production 显示环境横幅并禁止搜索引擎收录。

部署文档：

- [`ENVIRONMENT-MATRIX.md`](docs/deployment/ENVIRONMENT-MATRIX.md)
- [`GITHUB-BRANCHING.md`](docs/deployment/GITHUB-BRANCHING.md)
- [`NETLIFY-SETUP.md`](docs/deployment/NETLIFY-SETUP.md)
- [`SUPABASE-ENVIRONMENTS.md`](docs/deployment/SUPABASE-ENVIRONMENTS.md)
- [`DATABASE-MIGRATION.md`](docs/deployment/DATABASE-MIGRATION.md)
- [`PRODUCTION-DEPLOYMENT.md`](docs/deployment/PRODUCTION-DEPLOYMENT.md)
- [`ROLLBACK.md`](docs/deployment/ROLLBACK.md)
- [`SECRETS-MANAGEMENT.md`](docs/deployment/SECRETS-MANAGEMENT.md)
- [`RELEASE-CHECKLIST.md`](docs/deployment/RELEASE-CHECKLIST.md)
- [`NEW-COMPUTER-SETUP.md`](docs/development/NEW-COMPUTER-SETUP.md)
- [`RESTORE-PROCEDURE.md`](docs/backup/RESTORE-PROCEDURE.md)

部署前必须：

1. 备份数据库并演练回滚。
2. 运行全部 migration、RLS/RPC 测试及 Supabase Security/Performance Advisors。
3. 使用不同岗位账号完成越权测试。
4. 核对域名、环境变量和 Auth Redirect URLs。
5. 获得明确的正式上线授权。

本阶段没有执行 Netlify/Sites 正式部署，没有创建远程项目，也没有写入正式业务数据。

## 第六阶段：发布准备

V1.0 已进入功能冻结和发布验收阶段。Phase 6 增加部署环境隔离门禁、关键 RPC 安全错误提示、审计与库存流水不可变迁移、A01–A16 证据矩阵、恢复/回滚手册、岗位手册、GDPR 基线和 Day 1/Week 1 运行清单。

当前仅为 Conditional GO：允许进入独立预发布/UAT，不代表获准生产部署。生产硬门禁和已知限制见 `docs/final_release_readiness.md`。

## 当前限制

- 暂不支持真实支付回调、承运商 API、邮件/短信发送、复杂波次拣货、多包裹拆单和部分取消。
- POS V1 需要网络连接，尚未实现离线队列、法定税控小票或真实发票接口。
- 财务中心是经营管理账，正式会计、IVA、SDI 和银行对账仍需外部法定系统。
- 旧枚举/表名作为无损升级兼容层保留；新代码使用正式视图和受控 RPC。
