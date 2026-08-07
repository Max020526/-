# NEXORA Staging 端到端验收报告（2026-08）

## 1. 测试环境

| 项目 | 值 |
| --- | --- |
| 测试日期 | 2026-08-07 |
| Git 分支 | `develop` |
| Git Commit | `739b0fc6810229ccd3274d9b50609ef2c191d98a` |
| Staging Netlify | `https://nexora-wholesale-staging.netlify.app` |
| Netlify Deploy ID | `6a75c0d6741e9d56d4128f4e` |
| Staging Supabase Project Ref | `hpyhxljzsppocknycilz` |
| Migration 数量 | 61 |
| Production 变更 | 无 |

本轮只操作 Staging。未修改 `main`、Production Supabase、Production Netlify，也未部署 Storefront。

## 2. 测试用户

| 角色 | 测试账号 | 状态 | 仓库范围 | 分类范围 |
| --- | --- | --- | --- | --- |
| Owner | `owner.staging@nexora.test` | active | all | all |
| Admin | `admin.staging@nexora.test` | active | all | all |
| Warehouse Manager | `warehouse.staging@nexora.test` | active | selected：测试主仓库 | all |
| Warehouse Staff | `staff.staging@nexora.test` | active | selected：测试主仓库 | all |
| Product Operator | `product.staging@nexora.test` | active | none | all |

测试密码为临时随机密码，仅保留在本次测试会话中，未写入 Git、报告或日志。

## 3. 基础页面与部署检查

| 测试项 | Expected | Actual | 结果 |
| --- | --- | --- | --- |
| 首页 | 正常打开 | 正常 | Pass |
| 登录页 | 正常打开 | 正常 | Pass |
| `/admin` 未登录访问 | 跳转登录 | 正确跳转 | Pass |
| `/warehouse` 未登录访问 | 跳转登录 | 正确跳转 | Pass |
| `/inbound` 未登录访问 | 跳转登录 | 正确跳转 | Pass |
| `/inventory` 未登录访问 | 跳转登录 | 正确跳转 | Pass |
| `/products` 未登录访问 | 跳转登录 | 正确跳转 | Pass |
| 404 / 500 | 不出现 | 未发现 | Pass |
| 应用 Console | 无关键应用错误 | 未发现应用域关键错误；仅有 Netlify Private 认证回调的边缘访问噪声 | Pass |
| Supabase 环境 | 只连接 `hpyhxljzsppocknycilz` | UI 写入后在该项目中查到对应 Product、库存、流水和入库单 | Pass |
| STAGING 横幅 | 明显显示 | 正常显示 | Pass |
| 页面标题 | 明确测试环境 | `NEXORA Internal Staging [STAGING]` | Pass |
| robots | noindex / nofollow / noarchive | `robots.txt` 为 `Disallow: /`；代码配置了 noindex/noarchive | Pass（运行时响应头未单独抓取） |
| Netlify Private | 必须启用 | 已启用 | Pass |
| Deploy Preview | 关闭 | 已设置为 `Don’t deploy pull requests` | Pass |
| 部署分支 | 仅 develop | Production branch=`develop`；Branch deploys=仅该分支 | Pass |

Auth Site URL 已设置为 `https://nexora-wholesale-staging.netlify.app`，Redirect URLs 包含该域名通配路径和 `http://localhost:3000/**`，未加入 Production 域名。

## 4. 登录与角色检查

| 测试项 | Expected | Actual | 结果 |
| --- | --- | --- | --- |
| Owner 登录 | 进入完整后台 | 登录后进入 `/admin` | Pass |
| Owner 商品模块 | 可访问 | `/admin/products` 可打开 | Pass（队列存在后述读取问题） |
| Owner 库存模块 | 可访问 | `/admin/inventory` 可打开 | Pass |
| Owner 员工权限 | 可访问 | `/settings/users` 可打开 | Pass |
| Owner 审计日志 | 可访问 | `/settings/audit` 可打开 | Pass |
| Warehouse Manager 登录 | 进入仓库端 | 登录后进入 `/warehouse` | Pass |
| Warehouse Manager 快速入库 | 可操作测试主仓库 | 成功完成四次测试入库 | Pass |
| Product Operator 登录 | 进入商品模块 | 登录后进入 `/admin/products` | Pass |
| Product Operator 读取待完善商品 | 可读取新入库商品 | 显示“商品队列读取失败”，RLS 只读探针返回 0 条 | **Fail / Blocker** |
| Admin 详细权限 | 按模板验证 | 因停止条件未继续 | Not Run |
| Warehouse Staff 详细权限 | 入库允许、发布/价格/财务拒绝 | 因停止条件未继续 | Not Run |
| Product Operator 越权写库存 | RLS/RPC 拒绝 | 因停止条件未继续 | Not Run |

## 5. 入库测试数据与结果

### 5.1 生成对象

| 对象 | ID / 编号 |
| --- | --- |
| Product | `fdf61252-50f4-45ff-862b-3a95fd40846c` |
| 黑色 Variant | `54c9a458-139a-4f8c-90e2-6092a0cd1f92` |
| 棕色 Variant | `2ab4dccb-63c1-4133-9471-72b33f5cd60c` |
| 红色 Variant | `64768170-b381-401c-a7d6-279718657eaa` |
| 黑色 Inventory Item | `0746d0dd-69da-449d-a370-897aaf868566` |
| 棕色 Inventory Item | `a76141e4-f9e8-479e-b33f-7707ed15e7f1` |
| 红色 Inventory Item | `35dfa827-8a16-4bce-b22d-da73e708e4a1` |
| 首次入库 | `IN-20260807-0001` / `44671372-7d85-4d1b-ac0e-14f032b24386` |
| 多颜色入库 | `IN-20260807-0002` / `3420dee9-a127-4cac-9a3c-566b6adcdba6` |
| 黑色补货 | `IN-20260807-0003` / `53459d68-8b50-4bb7-a345-499a71fd5b2b` |
| 重复点击测试 | `IN-20260807-0004` / `58e716ea-b1b7-40da-82b2-e3c092ae8f64` |

### 5.2 业务结果

| 测试项 | Expected | Actual | 结果 |
| --- | --- | --- | --- |
| 新款入库：黑色 ONE_SIZE 18 | 新建一个 Product、一个 Variant、库存 18 | Product=1；SKU=`TEST-DRESS-001-BLK-ONE`；0→18 | Pass |
| Product 初始状态 | 进入待完善流程 | `status=PENDING_DETAILS`，`workflow_status=draft` | Pass |
| 首次库存流水 | 0→18 | Movement 记录正确 | Pass |
| 首次 Audit Log | 写入审计 | 1 条对应记录 | Pass |
| 多颜色：棕 12、红 8 | 仍为一个 Product，新增两个唯一 SKU，总库存 38 | 黑18、棕12、红8；总计38 | Pass |
| 旧款黑色补货 10 | 18→28，不重复 Product/Variant/SKU | 18→28；Product=1；黑色 Variant=1 | Pass |
| 双击确认 | 只执行一次 | 两次快速点击均返回，但只生成 `IN-20260807-0004` 一张入库单；棕色 12→13 | Pass |
| 同一 idempotency key 的底层重试 | 幂等 | 触发停止条件后未继续 | Not Run |
| 当前库存 | 测试结果可追踪 | 黑28、棕13、红8，总计49 | Pass |
| 当前库存流水 | 每条入库独立 | 5 条 Movement；4 条入库 Audit | Pass |

## 6. 阻塞问题

### STG-BLOCKER-001：新入库未分类商品被商品 RLS 隐藏

- Severity：Blocker / High
- 安全相关：是（授权逻辑错误，属于合法用户被错误拒绝；当前未发现越权泄露）
- Production 风险：如果同一策略上线，会阻断正式“入库 → 商品完善”流程。
- 证据：
  - 入库 RPC 创建的 Product `category_id` 为 `NULL`。
  - `private.has_category_access(required_category_id)` 首先要求 `required_category_id is not null`。
  - `rbac_products_select` 强制调用 `private.has_category_access(category_id)`。
  - Product Operator 已拥有 `product.view`、`product.edit`、全部分类范围，但 RLS 只读探针仍返回 `visible_test_products=0`。
- 影响：Product Operator 无法打开新入库商品去设置分类；商品永远无法进入资料完善、图片、定价、审核和发布阶段。
- 推荐修复：为 `category_id IS NULL` 的待完善商品定义明确权限规则。Owner/System Admin 和具有 `product.edit` 且全分类范围的商品运营应可读取并首次分配分类；指定分类员工不应借此读取已分类但不在范围内的商品。修复需新增 migration、pgTAP 和 UI 集成测试。

### STG-HIGH-002：商品队列查询存在关系歧义风险

- Severity：High
- 证据：运行时显示“商品队列读取失败”；当前 `develop` 查询使用 `categories(name),brands(name)`，仓库中存在未合并的 `fix/product-catalog-read` 分支，将其改为显式外键关系 `categories!products_category_id_fkey` 和 `brands!products_brand_id_fkey`。
- 说明：本轮没有获得浏览器中的原始 PostgREST 错误正文，因此该项为高可信诊断，不作为已确认的唯一根因。
- 风险：该修复分支与当前 `develop` 历史差异较大，不能直接盲目合并；应从最新 `develop` 提取最小修复并重新跑 CI。

### STG-MEDIUM-003：前端错误信息过于笼统

- Severity：Medium
- Actual：仅显示“商品队列读取失败”。
- Expected：普通用户看到清晰中文错误与重试入口；开发环境记录 Supabase error code/message，不向正式用户暴露数据库细节。

## 7. 未执行项目

以下项目在触发停止条件后未继续：

- 商品名称、分类、描述和价格完善
- 主图与第二张图片上传
- 提交审核
- Owner/Admin 审批与发布
- Product Publication 最终状态检查
- Warehouse Staff 全部越权测试
- Product Operator 库存/RPC 越权测试
- 匿名内部表读取测试
- Storage 上传、私有文件和敏感 bucket RLS 测试
- 数量 0、负数、非法款号、非法颜色/尺码、超大图片、错误格式、网络失败等异常用例
- Production 中不存在 `TEST-DRESS-001` 的只读交叉核验

未执行项不是 Pass，必须在阻塞修复部署到 Staging 后重新测试。

## 8. 环境隔离结论

- Staging 页面执行的 Product、Inventory、Inbound、Movement、Audit 数据均在 `hpyhxljzsppocknycilz` 中查到。
- 未使用或记录 Production Secret。
- 未修改 Production Supabase、Production Netlify 或 `main`。
- 因停止条件已触发，本轮没有继续读取 Production 来做商品不存在性核验。

## 9. 验收结论

**未达到 Staging 验收标准，不建议进入 Production。**

入库核心事务、库存数字、多颜色、旧款补货和双击防重复均通过；但“新入库商品 → Product Operator 完善资料”被 RLS/商品队列读取问题阻断，无法继续到审核与发布。

建议顺序：

1. 从最新 `develop` 创建独立 `fix/*` 分支。
2. 修复未分类待完善商品的 RLS，并补充 pgTAP。
3. 修复商品队列显式外键关系与开发诊断错误信息。
4. 运行完整 CI。
5. 合并到 `develop` 并仅部署统一 Staging。
6. 从“Product Operator 商品完善”开始复测，并补做全部未执行用例。
7. 全部通过前不得创建 `develop → main` Release PR。
