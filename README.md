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
- 服装快速入库：员工只填款号、颜色、数量，数据库事务自动创建商品、SKU、库存、入库单、流水和日志。
- 批量入库：支持多行粘贴、键盘录入、重复合并、整批校验和原子提交。
- 两级内部角色：`employee` 与 `admin`，页面、服务端接口和 RLS 同时鉴权。
- 今日入库与取消：管理员取消会生成反向库存流水，不删除历史记录。
- 基础资料管理：颜色、分类、供应商、员工账号和审计日志。
- 报表导出：商品、库存、指定日期入库可导出 Excel 兼容的 UTF-8 BOM CSV。

### 后续外部集成（不属于本阶段）

- 连续扫码设备接入与离线待办同步（库存写入仍必须联网，避免设备间库存冲突）。
- 在线支付网关对接（当前支持订单创建与后台人工确认付款）。
- TikTok Shop、Shopify 与第三方物流真实 API。
- 多仓库调拨、条码标签打印、供应商采购单和批发客户销售单。
- 生产监控、支付渠道及真实设备的持续回归测试。

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

服务端 Supabase 客户端已经拆分为三个明确边界：

- `lib/supabase/client.ts`：浏览器会话，只能使用 Publishable Key。
- `lib/supabase/server.ts`：服务端用户会话，使用 Cookie 并继续受 RLS 限制。
- `lib/supabase/admin.ts`：仅限后续员工管理等受保护的服务端代码，读取 `SUPABASE_SECRET_KEY`。

`SUPABASE_SECRET_KEY` 仅供受保护的员工账号管理接口使用；不使用该功能时可以不配置。任何真实密钥都只能保存在 `.env.local`、Netlify 环境变量或 Sites 环境变量中，不能提交到 Git。

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

### 创建首个管理员与测试账号

先通过 Supabase Auth 创建用户，再在 SQL Editor 中执行以下语句。把邮箱替换为实际 Owner 邮箱：

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u cross join public.roles r
where u.email = 'owner@example.com' and r.name = 'OWNER'
on conflict do nothing;
```

同时把该账号映射到新的两级角色：

```sql
update public.profiles p
set role = 'admin', is_active = true
from auth.users u
where p.id = u.id and u.email = 'owner@example.com';
```

首次登录后，管理员可在 `/settings/users` 创建 `employee` 测试账号、设置临时密码并随时停用。请勿在 README、Issue 或聊天记录中保存真实密码。

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
npm run lint
npm run typecheck
npm run build
npm run build:netlify
npm test
```

上线前还应在已连接的 Supabase 项目运行数据库 Advisors，并完成角色权限、两次点击幂等、并发下单、取消释放与发货扣减测试。

## 安全与性能基线

- 内部页面统一通过会话代理校验，管理操作同时受服务端身份检查与 Supabase RLS 保护。
- 管理员账号写接口要求同源 JSON 请求、限制请求体大小，并阻止当前管理员停用或移除自己的管理员角色。
- Next.js/Netlify 与 Sites Worker 两条部署链路均发送 CSP、HSTS、点击劫持、MIME 嗅探和浏览器权限安全头。
- 共用数据查询 Hook 会取消过期响应，内联空数组不会触发重复请求循环。
- 商品和 OCR 图片限制格式、文件大小与解码像素数，避免超大图片耗尽设备内存。
- 管理员创建的临时密码要求 12 至 128 位；建议在 Supabase Auth 控制台启用泄露密码检测和 MFA。

本轮审计记录见 `docs/SECURITY_PERFORMANCE_AUDIT_2026-08-01.md`。

## Netlify 部署

仓库已提供 `netlify.toml`。将 Git 仓库连接到 Netlify 后，平台会执行 `npm run build:netlify` 并发布 Next.js 输出。请在 Netlify 项目设置中添加：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- 后续确实需要员工管理接口时再添加 `SUPABASE_SECRET_KEY`

Netlify 不依赖提交的 `.env.local`；环境变量应通过 Netlify 控制台保存。当前仓库仍保留原有 Sites/Vinext 构建：`npm run build` 用于现有 Sites，`npm run build:netlify` 用于 Netlify，两者互不覆盖。

## PWA 与其他部署

应用可部署到 OpenAI Sites、Vercel 或兼容 Cloudflare Worker 的平台。部署环境需要配置上述两个公开 Supabase 变量。Supabase Storage 使用公开读取、员工角色写入的 `product-images` Bucket；商品二进制不会写入数据库。

部署到 HTTPS 域名后，安卓浏览器会显示“安装 NEXORA APP”；iPhone 可通过 Safari 的“分享 → 添加到主屏幕”安装。已安装版本以独立窗口启动，并提供拍照入库、管理中心和商店快捷入口。

## 项目结构

```text
app/                 三端页面与业务流程
components/          共用布局和界面组件
hooks/               Supabase 数据读取 hooks
lib/parser/          货单解析与标准化
lib/supabase/        浏览器、服务端与管理员 Supabase 客户端
supabase/migrations/ 数据库版本迁移
supabase/seed.sql    参考数据
tests/               解析与页面测试
docs/                分阶段实施计划与阶段交付说明
```

完整增量实施顺序见 `docs/IMPLEMENTATION_PLAN.md`。14 个阶段均已完成，逐阶段验收记录位于 `docs/PHASE_1.md` 至 `docs/PHASE_14.md`。
