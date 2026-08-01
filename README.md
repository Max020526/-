# NEXORA Fashion Commerce Platform V1.0

NEXORA 是一个统一数据库、多职责工作区的服装零售商业平台。当前已完成入库、商品运营、安全零售商城，以及订单、仓库履约、退货与退款内部流程。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS、App Router
- Supabase PostgreSQL、Auth、Storage、RLS、PostgreSQL RPC
- Netlify 构建准备；数据库使用 Supabase Cloud
- 独立顾客商城位于 `customer-store/`，与内部端共用同一 Supabase 数据库，但使用独立 Git 仓库

## 工作区

- `/warehouse`：仓库与门店作业入口
- `/warehouse/receipts`：标准到货单
- `/inbound/new`：主管快速入库
- `/warehouse/fulfillment`：拣货、复核、打包、配送和自提
- `/admin/products`：商品资料、图片、价格与渠道发布
- `/admin/orders`：订单运营、付款核验、取消和时间线
- `/admin/returns`：退货审核、收货、质检处置和内部退款记录
- `/inventory`：库存余额与不可变流水查询
- `/settings`：颜色、分类、供应商、员工和审计

## 本地运行

需要 Node.js 22.13 或更高版本。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev:netlify
```

独立顾客商城：

```powershell
cd customer-store
npm install
Copy-Item .env.example .env.local
npm run dev:netlify
```

不要把 service role 或 secret key 放入 `NEXT_PUBLIC_*`。浏览器只使用 Supabase URL 和 publishable key。

## Supabase 初始化

1. 创建 Supabase 项目并安装 Supabase CLI。
2. 将根目录 `supabase/migrations/` 按时间顺序应用到开发项目。
3. 运行 `supabase/seed.sql`；Seed 仅包含角色、颜色、尺码等参考数据，不包含模拟订单或库存。
4. 创建第一个内部 Owner 后，在 `/settings/users` 分配其他岗位。
5. 在 Auth 控制台启用泄露密码检测，并为 Owner/System Admin 配置 MFA。
6. 保持 `product-images` Storage bucket 为 Private。

核心环境变量见 `.env.example`。正式环境必须分别在内部端和顾客商城配置可信站点 URL 与 Auth Redirect URL。

## 权限与数据一致性

- 岗位包括 Owner、System Admin、Warehouse Manager、Warehouse Staff、Product Operator、Order & CS、Buyer、Finance 和 Cashier。
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

## 测试与质量门禁

```powershell
npm run lint
npm run typecheck
npm test
npm run build:netlify

cd customer-store
npm run lint
npm run typecheck
npm test
npm run build:netlify
```

数据库 A08–A10 行为测试位于 `supabase/tests/phase4_order_fulfillment_returns.sql`。它在一个事务中临时建立商品、库存、配送、自提与退货数据，断言完成后执行 `ROLLBACK`。

## Netlify 部署准备

两个仓库均提供 `netlify.toml`，构建命令为 `npm run build:netlify`。部署前必须：

1. 备份数据库并演练回滚。
2. 运行全部 migration、RLS/RPC 测试及 Supabase Security/Performance Advisors。
3. 使用不同岗位账号完成越权测试。
4. 核对域名、环境变量和 Auth Redirect URLs。
5. 获得明确的正式上线授权。

本阶段没有执行 Netlify/Sites 正式部署，没有创建收费资源，也没有写入真实或演示业务数据。

## 当前限制

- 暂不支持真实支付回调、承运商 API、邮件/短信发送、复杂波次拣货、多包裹拆单和部分取消。
- 采购、经营财务、老板指标与 POS 完整功能属于第五阶段。
- 旧枚举/表名作为无损升级兼容层保留；新代码使用正式视图和受控 RPC。
