# NEXORA Fashion Commerce Platform V1.0

NEXORA 是一个统一数据库、多个职责工作区的服装商业管理平台。本仓库当前已交付 V1.0 第一阶段和第二阶段：项目基础、正式 RBAC、入库端 MVP、库存事实模型，以及完整的商品运营、渠道价格和发布边界。

正式开发基线是 `NEXORA_Fashion_Commerce_Platform_System_Specification_V1.0`、核心 ER 图、三条业务流程图和 Phase 2–6 开发提示词。当前阶段不交付完整商城、完整订单履约、完整财务中心或高级分析；现有相关路由只保留明确边界，不能当作本阶段验收完成项。

## 第二阶段已完成

- 商品运营队列：草稿、完善中、待发布、发布受阻、已发布、已归档。
- SPU 多语言资料与颜色/尺码 SKU 管理，商品编辑器不再直接改库存。
- `channels`、`price_books`、`price_book_items`、`product_publications` 正式渠道发布模型。
- 逐字段发布检查、渠道级发布/下架、批量分类/推荐/归档和全链路审计。
- 私有商品媒体登记、排序、主图、软删除和安全签名媒体出口。
- 匿名商城只读投影，不公开成本、供应商、审计、私有路径或未发布商品。

第二阶段详细说明见 [第二阶段交付报告](docs/PHASE_2.md)。

## 第一阶段已完成

- Next.js App Router、TypeScript 严格模式、Tailwind CSS、响应式后台和 PWA 基础。
- 登录、会话刷新、受保护路由、403、404、全局加载和错误状态。
- 正式岗位：Owner、System Admin、Warehouse Manager、Warehouse Staff、Product Operator、Order & CS、Buyer、Finance、Cashier。
- 页面访问、服务端接口、PostgreSQL Function、RLS 和 Storage 的分层授权。
- `organizations` 组织隔离，以及组织级限制性 RLS 策略。
- SPU 商品主档与颜色/尺码 SKU 变体，型号不能替代 SKU。
- 标准到货单：Warehouse Staff 创建草稿、录入或识别货单、点货并提交；Warehouse Manager 审核后过账。
- 经理快速过账：供应商、供应商单号、到货日期、型号、多颜色、多尺码和数量；仅用于已经线下核对完成的货物。
- 正式入库状态：`draft → counting → ready_to_post → posted / cancelled`。
- 原子过账 RPC：创建或匹配商品与 SKU、锁定库存、更新余额、写不可变流水与审计日志。
- 幂等键防止重复过账；普通客户端不能直接写库存余额、库存流水或审计日志。
- Canonical 只读契约：`locations`、`inventory_balances`、`product_media`、`inbound_receipts`、`inbound_receipt_lines`。
- 私有商品媒体 Bucket、10MB 限制、JPG/PNG/WEBP、组织路径、短期签名预览、排序和删除。
- 商品列表、商品基础编辑、SKU/库存查询、图片管理和发布前校验基础。
- UTF-8 BOM CSV 导出、参考颜色/尺码/分类 Seed、自动化契约测试。

详细范围与基线差异见 [V1 第一阶段基线审查](docs/V1_PHASE1_BASELINE_REVIEW.md)，验收映射见 [A01–A16 验收矩阵](docs/A01_A16_ACCEPTANCE.md)。

## 工作区边界

| 前端产品 | 入口 | 第一阶段职责 |
| --- | --- | --- |
| Warehouse & POS PWA | `/warehouse` | P01 入库与库存查询；P04/P08 仅预留边界 |
| Internal Admin | `/admin` | 商品基础、库存监管、用户与基础资料；后续模块不计入第一阶段 |
| Retail Storefront | 独立项目 | 本阶段不开发 |
| B2B Portal | 未启用 | 可选后续阶段 |

四个前端产品未来共享同一 Supabase 业务模型，不复制商品、SKU、库存或订单主数据。

## 本地运行

要求 Node.js 22.13 或更高版本。

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev:netlify
```

打开 `http://localhost:3000`。未配置 Supabase 时，应用只显示配置提示和安全空状态，不生成模拟业务数据。

### 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

- 浏览器和普通服务端会话仅使用 Publishable Key，并受 RLS 约束。
- `SUPABASE_SECRET_KEY` 只供受保护的员工账号管理 API 使用，绝不能添加 `NEXT_PUBLIC_` 前缀。
- 不要提交 `.env.local`、Secret Key、旧 `service_role` Key 或测试密码。

## Supabase 初始化

建议先创建独立开发项目或开发分支，不要直接在生产数据库试跑迁移。

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase db seed
```

迁移按文件名顺序执行。第一阶段正式对齐迁移是：

- `20260801160000_v1_phase1_baseline_alignment.sql`
- `20260801161000_post_size_aware_inbound_receipt.sql`
- `20260801162000_harden_inbound_cancellation.sql`

第二阶段商品运营迁移是：

- `20260801170000_phase2_product_operations.sql`
- `20260801171000_phase2_product_operations_rpc.sql`
- `20260801172000_phase2_media_public_boundary.sql`
- `20260801173000_phase2_advisor_hardening.sql`

迁移显式配置 Data API `GRANT` 与 RLS。Supabase 2026 年的新默认设置不再自动暴露新表，因此不要省略 GRANT。

### 创建首个 Owner

1. 在 Supabase Auth 创建 Owner 用户。
2. 执行以下 SQL，将邮箱替换为真实 Owner 邮箱：

```sql
update public.profiles profile
set role = 'owner', is_active = true
from auth.users auth_user
where profile.id = auth_user.id
  and auth_user.email = 'owner@example.com';

insert into public.user_roles (user_id, role_id)
select auth_user.id, role.id
from auth.users auth_user
join public.profiles profile on profile.id = auth_user.id
join public.roles role
  on role.organization_id = profile.organization_id
 and role.code = 'owner'
where auth_user.email = 'owner@example.com'
on conflict do nothing;
```

3. 登录后在 `/settings/users` 创建其他内部账号并分配最小岗位权限。
4. 临时密码应通过安全渠道交付，首次登录后立即修改。

### 必做的控制台安全设置

- Auth → Password Security：开启泄露密码检测。
- 生产环境建议为 Owner/System Admin 开启 MFA。
- Site URL 与 Redirect URLs 只保留受信任的本地和 Netlify 域名。
- Storage 的 `product-images` Bucket 应为 Private；不要改回 Public。

## 核心数据一致性规则

- 商品型号在组织内唯一；SKU 由型号、颜色和尺码构成并全局唯一。
- 库存余额查询使用 `inventory_balances`；库存事实来自不可变 `inventory_movements`。
- 可售库存 = `on_hand - reserved - safety_stock`，结果不小于零。
- 所有库存变化必须通过受控 RPC，余额和流水在同一事务更新。
- 过账请求必须提供幂等键；重复请求返回原结果，不重复增加库存。
- 已过账流水不能修改或删除；修正使用反向流水或调整流水。
- `audit_logs` 对普通应用角色只读，写入只能由受控函数完成。
- 商品图片使用 `<organization-id>/products/<product-id>/...` 路径和短期签名 URL。

## 质量检查

```powershell
npm run lint
npm run typecheck
npm test
npm run build:netlify
```

`npm test` 包含构建、页面渲染、解析器、RBAC、迁移契约、库存事务、幂等性和媒体安全检查。数据库行为测试应在独立 Supabase 开发分支执行，不能使用真实生产业务数据。

## Netlify 部署准备

仓库已提供 `netlify.toml`，构建命令为 `npm run build:netlify`。在 Netlify 环境变量中配置上述变量，并将 `NEXT_PUBLIC_SITE_URL` 设置为最终 HTTPS 域名。

本次在用户授权后已将第一阶段正式对齐迁移和第二阶段迁移写入现有 `NEXORA_WHOLESALE` Supabase Cloud 项目；执行时商品、SKU、库存和到货业务表均为空。没有创建收费资源，也没有执行 Netlify 生产部署。正式开放给员工前必须：

1. 在开发 Supabase 项目完整执行迁移和 Seed。
2. 执行 A01–A16 第一阶段适用项。
3. 重新运行 Security Advisor 与 Performance Advisor。
4. 使用 Warehouse Staff、Warehouse Manager、Product Operator、System Admin 四类账号做越权测试。
5. 完成备份和回滚演练后，才可安排生产变更窗口。

## 项目结构

```text
app/                    App Router 页面、受保护布局与服务端 API
components/             共享 UI、入库、商品和库存组件
hooks/                  可取消的 Supabase 查询 Hook
lib/auth/               正式角色、路由授权与兼容映射
lib/supabase/           浏览器、服务端和受控管理员客户端
lib/validation/         集中表单校验和标准化
supabase/migrations/    可重复执行的数据库迁移、RLS、RPC 与 Storage Policy
supabase/seed.sql       仅参考数据，不含模拟业务记录
tests/                  页面、TypeScript 逻辑和数据库契约测试
docs/                   基线审查、端口规划、验收与部署说明
```

## 当前限制

- 旧版表名仍保留以支持无损升级；新代码应使用 Canonical 视图/RPC。物理表重命名应在独立维护窗口完成，不应与业务上线同时进行。
- 第一阶段没有完整商城、支付、订单履约、财务、POS、采购单、退货退款、批发客户或第三方渠道同步。
- 当前自动化数据库测试以迁移契约为主；上线前仍需在 Supabase 开发分支执行真实 RLS/RPC 并发测试。
- 泄露密码检测是 Supabase 控制台项目设置，代码不能替用户安全地开启。
