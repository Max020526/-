# NEXORA 批发零售一体化系统 V1.0

NEXORA 将供应商货单、仓库收货、商品资料、网店上架、顾客订单与库存流水连接在同一个 Supabase 数据库中。第一原则是库存准确，其次是数据可追踪与移动端易用。

## 当前交付范围

### 已完成

- 三端统一项目：`/warehouse` 入库端、`/admin` 管理端、`/shop` 网店端。
- 简体中文响应式界面，适配电脑、平板和手机。
- 文字货单解析：款号标准化、颜色字典、均码、紧凑尺码、缺失数量、重复 SKU 提示及显式合并。
- 入库流程：创建入库单、解析检查、实收差异核对、事务确认入库、库存流水。
- 新旧商品处理：新款、新颜色/尺码、旧 SKU 补货均在数据库事务中匹配。
- 商品中心：待完善列表、商品资料、SKU/库存、图片上传、价格、描述、网店设置。
- 上架硬校验：名称、分类、价格、主图、详情图、描述、Slug、启用 SKU 与网店可售库存。
- 网店：已上架商品列表、详情、颜色尺码选择、实时可售库存、购物车、服务器计价结算、订单列表与订单详情。
- 结构化货单：支持 `.xlsx`、`.csv` 标准列导入、格式校验、重复 SKU 提示，以及手动逐行录入。
- 拍照识别：支持手机后置摄像头和多图上传，在设备端完成图像增强、旋转纠正、条码及中/英/意文字识别，并提取款号、颜色、尺码、数量、品牌、商品名称和材质；原图保存到私有入库附件。
- 可安装 APP：提供 PWA 清单、安卓安装提示、iPhone 添加到主屏幕指引、品牌图标、独立窗口、应用快捷入口和安全的断网提示页。
- 订单运营：支持付款、拣货、打包、发货/自取、完成、取消与退款状态流转；库存占用和扣减由数据库事务处理。
- 网店库存：商品管理员可按仓库和 SKU 设置网店可售上限，所有修改写入审计日志。
- 订单数据库函数：幂等创建、库存占用、取消释放、发货扣减与销售流水。
- Supabase Auth、角色表、全表 RLS、Storage 权限、审计日志与显式 Data API grants。
- 自动化测试：核心解析场景和主要页面服务端渲染。

### 待完成

- 连续扫码设备接入与离线待办同步（库存写入仍必须联网，避免设备间库存冲突）。
- 在线支付网关对接（当前支持订单创建与后台人工确认付款）。
- 图片自动压缩和缩略图 Edge Function。
- 分类、员工权限、报表等管理端的完整编辑界面。
- 并发压测、真实设备验收与生产监控。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开终端输出的本地地址。未配置 Supabase 时，系统只显示安全的空状态，不会注入模拟业务数据。

## 环境变量

在 Supabase 项目的 Connect 对话框中获取项目 URL 和 Publishable Key：

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
NEXT_PUBLIC_SITE_URL=https://YOUR_DEPLOYED_DOMAIN
```

浏览器端仅使用 Publishable Key。不要将 Secret Key 或旧版 `service_role` Key 放进任何 `NEXT_PUBLIC_` 变量。

## 数据库初始化

1. 创建 Supabase 项目。
2. 安装 Supabase CLI 并登录。
3. 将本地项目连接到远程项目。
4. 推送迁移和参考数据。

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase db seed
```

主迁移位于 `supabase/migrations/`，其中包含核心表、约束、RLS、Storage 策略和事务函数。`supabase/seed.sql` 只写入分类等参考数据，不包含模拟商品、库存或订单。

### 创建首个 Owner

先通过 Supabase Auth 创建用户，再在 SQL Editor 中执行以下语句。把邮箱替换为实际 Owner 邮箱：

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u cross join public.roles r
where u.email = 'owner@example.com' and r.name = 'OWNER'
on conflict do nothing;
```

之后 Owner 可通过管理端为员工分配 `WAREHOUSE_STAFF`、`PRODUCT_MANAGER` 或 `ORDER_STAFF`。

## 关键库存规则

- `products.style_no` 全局唯一。
- `(product_id, color_id, size_id)` 唯一，SKU 不会重复。
- `inventory.quantity_on_hand` 与 `quantity_reserved` 均不能为负，占用量不能大于实际库存。
- 入库只能通过 `confirm_stock_receipt()`，重复确认会被数据库拒绝。
- 订单通过 `create_online_order()` 原子占用库存；价格从已上架记录读取，不信任客户端价格。
- 取消或发货通过 `transition_order_inventory()`，分别释放占用或同时扣减实际库存和占用库存。
- 所有正式库存变化都写入 `inventory_movements`，重要操作写入 `audit_logs`。

## 测试与构建

```bash
npm test
npm run lint
npm run build
```

上线前还应在已连接的 Supabase 项目运行数据库 Advisors，并完成角色权限、两次点击幂等、并发下单、取消释放与发货扣减测试。

## 部署

应用可部署到 OpenAI Sites、Vercel 或兼容 Cloudflare Worker 的平台。部署环境需要配置上述两个公开 Supabase 变量。Supabase Storage 使用公开读取、员工角色写入的 `product-images` Bucket；商品二进制不会写入数据库。

部署到 HTTPS 域名后，安卓浏览器会显示“安装 NEXORA APP”；iPhone 可通过 Safari 的“分享 → 添加到主屏幕”安装。已安装版本以独立窗口启动，并提供拍照入库、管理中心和商店快捷入口。

## 项目结构

```text
app/                 三端页面与业务流程
components/          共用布局和界面组件
hooks/               Supabase 数据读取 hooks
lib/parser/          货单解析与标准化
lib/supabase/        客户端初始化
supabase/migrations/ 数据库版本迁移
supabase/seed.sql    参考数据
tests/               解析与页面测试
```
