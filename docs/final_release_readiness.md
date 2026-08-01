# NEXORA V1.0 Final Release Readiness

评估日期：2026-08-01（Europe/Rome）  
评估范围：内部管理端、独立顾客商城、Supabase 数据库/Auth/Storage、Netlify 构建准备。  
当前决策：**Conditional GO（仅允许进入预发布/UAT，不代表获准生产上线）**。

## 结论

代码、数据库设计和自动化门禁已达到 V1 预发布基线。审计中未发现 P0 或未解决的 P1。现有云项目为空业务库，RLS 全部启用，公开视图使用 `security_invoker`，核心浏览器角色不能直接写库存/财务流水。库存余额、预留量、可售量与流水未发现不一致。

生产上线仍被以下人工门禁阻止：生产备份/恢复演练、真实设备 UAT、各岗位账号越权复测、域名与 Auth Redirect 核对、泄露密码保护/MFA 配置、生产迁移评审与最终负责人签字。**本阶段未执行生产部署、未应用 Phase 6 云端迁移、未写入真实业务数据。**

## P0–P3 清单

| 等级 | 数量 | 状态 | 说明 |
| --- | ---: | --- | --- |
| P0 | 0 | 无 | 未发现会导致资金、库存或权限立即失控的问题。 |
| P1 | 0 | 已收口 | 关键入库页原始数据库错误泄露已改为安全中文提示；Preview 误连生产已增加构建阻断。 |
| P2 | 3 | 上线前处理/接受 | Supabase 泄露密码保护尚未启用；真实设备 UAT 未签字；恢复演练未在独立项目完成。 |
| P3 | 3 | 后续优化 | 部分早期组件仍可继续减少显式 `any`；空库导致 Performance Advisor 报告若干 unused index 信息；Drizzle Kit 的仅开发期 esbuild 链仍有 4 个 moderate 公告且上游只提供破坏性降级方案。 |

## A01–A16 摘要

| 编号 | 结果 | 证据类型 | 发布前剩余动作 |
| --- | --- | --- | --- |
| A01 | 通过（代码） | 环境示例、无密钥扫描、部署环境门禁 | Netlify 实际变量双人复核 |
| A02 | 通过（自动+DB） | 页面守卫、RLS、GRANT、RPC、Storage Policy | 岗位 UAT 越权签字 |
| A03 | 通过（自动） | 多颜色/尺码、旧款复用、新商品草稿测试 | 仓库平板实测 |
| A04 | 通过（DB） | 入库幂等与重复确认行为测试 | 预发布并发压测 |
| A05 | 通过（DB） | 余额+不可变流水同事务，Phase 6 追加不可变触发器 | 应用 Phase 6 迁移后重跑 SQL |
| A06 | 通过（自动） | 商品、图片、价格、检查、发布闭环 | 真实图片上传 UAT |
| A07 | 通过（自动+DB） | 匿名只读已发布目录，服务端价格/库存重算 | 自定义域名缓存检查 |
| A08 | 通过（DB） | 最后一件库存并发/回滚测试 | 预发布并发压测 |
| A09 | 通过（DB） | 取消释放、发货扣减、退货质检库存处置 | 端到端 UAT |
| A10 | 通过（自动+DB） | 订单到履约完成状态机 | 支付/物流外部适配器另行验收 |
| A11 | 通过（DB） | 采购审批、分批收货、超收限制、成本更新 | 采购岗位 UAT |
| A12 | 通过（DB） | POS 开关班、幂等销售、统一库存/付款 | 真实 POS 设备/税控边界验收 |
| A13 | 通过（DB） | 统一经营口径、精确金额、CSV | 会计确认口径；非意大利法定账 |
| A14 | 通过（自动+DB） | 核心操作审计，追加不可变触发器迁移 | 应用迁移后元数据测试 |
| A15 | 通过（构建） | 双端响应式、加载/空/错误/403 状态 | iOS/Android/平板人工证据 |
| A16 | 通过（自动），待生产签字 | 双端 lint/typecheck/vinext/Netlify build；内部端 67 项、商城 13 项自动测试；云端只读不变量与 Advisors | 真实设备 UAT、恢复演练和发布 commit 签字 |

## 已验证事实

- Supabase 项目 `dtfcldfiwxmacpwagapy` 状态为健康，区域 eu-west-1；检查时业务表为零业务数据。
- 所有 `public` 基础表已启用 RLS；未发现非 `security_invoker` 的公开视图。
- Security Advisor 仅报告 Auth 泄露密码保护未启用。
- Performance Advisor 仅报告空库下的 unused index 信息；不据此删除约束/外键/业务索引。
- `npm audit fix` 已清除 high 公告；`npm audit --audit-level=high` 作为发布门禁。余下 4 个 moderate 均来自未用于生产请求处理的 Drizzle Kit 开发链，不能以 `--force` 降级修复；禁止对外暴露其开发服务器并等待上游修复。
- `receipt-scans` 与 `product-images` 为 Private bucket，并限制文件类型和大小。
- 时间字段使用 `timestamptz`；金额字段未发现浮点类型。
- 内部端 67 项、商城 13 项自动测试通过；两个 Next.js Netlify production build 通过。

## 生产上线硬门禁

1. 在独立 Preview/Branch 或预发布项目应用全部迁移与 seed，并运行 `supabase/tests/`。
2. 应用 `20260801209000_phase6_release_hardening.sql` 后运行 `phase6_release_readiness.sql`。
3. 完成数据库逻辑备份与 Storage 对象清单备份；在独立项目验证恢复结果。
4. 启用泄露密码保护；Owner/System Admin 启用 MFA。
5. 使用各岗位真实测试账号完成允许/拒绝矩阵和移动端 UAT。
6. 核对两个 Netlify 站点的生产 URL、Supabase URL/key、生产 project ref、Auth redirect、CORS/Allowed URLs。
7. Owner、技术负责人和数据负责人签字；之后才可执行生产迁移与域名切换。

## 已知边界

- 支付、退款、承运商、邮件、短信为内部状态/适配器边界，尚未连接真实外部服务。
- POS V1 在线运行，不提供离线队列、法定税控小票或 SDI 发票。
- 经营财务不是法定会计系统，不替代 IVA、银行对账或税务申报。
- Supabase 数据库备份不包含 Storage 对象；必须单独备份对象清单和源文件。
