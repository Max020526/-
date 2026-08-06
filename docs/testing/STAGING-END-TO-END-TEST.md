# Staging end-to-end acceptance test

本清单只允许在独立 Staging Supabase 与 Staging Netlify 站点执行。所有数据使用 `TEST-*` 标记；开始前核对页面横幅、Supabase project ref 与 Netlify context。测试结束只清理本次创建的测试数据，不碰 Production。

## 前置条件

- Admin、Operations 连接 Staging Supabase，页面显示 `STAGING 测试环境`。
- Storefront 未完成独立整合前写 `N/A`，不得把根应用的旧 `/shop` 当作验收商城。
- 准备 Owner、Warehouse Manager、Warehouse Staff、Merchandiser 和 Customer 测试账号。
- 准备测试主仓库、测试分类、测试图片；订单号、SKU、邮箱均以 `TEST-` 或 `.test` 标识。
- 记录测试开始时间、执行人、commit SHA、Netlify deploy ID 和 Staging schema migration 版本。

## 测试用例

| # | 场景 | 操作 | 预期结果 | 证据 |
|---:|---|---|---|---|
| 1 | 新款入库 | Operations 创建 `TEST-DRESS-001` 到货并确认 | 到货单、明细、库存余额和流水一致 | 到货单号、SQL/RPC结果、截图 |
| 2 | 多颜色 | 红/蓝各建变体 | 颜色不串货，各自 SKU 唯一 | 变体列表 |
| 3 | 多尺码 | 每颜色建 S/M/L | 六个 SKU 数量分别准确 | SKU/库存矩阵 |
| 4 | 旧款补货 | 对既有 `TEST-DRESS-001` 追加库存 | 不重复建商品；余额增加、流水可追踪 | 前后数量 |
| 5 | 重复 SKU | 重复提交同一 SKU | 明确拒绝，不产生半成品数据 | 错误信息、记录数 |
| 6 | 库存流水 | 核对每次确认/调整 | 流水不可丢失，余额等于流水汇总 | 对账结果 |
| 7 | 商品资料完善 | 补全名称、分类、描述、尺码信息 | 状态按流程推进，必填项校验生效 | 状态记录 |
| 8 | 图片上传 | 上传合法图片及非法类型/超限文件 | 合法文件进入 Staging bucket；非法文件被拒绝 | Storage 路径、响应 |
| 9 | 定价 | 设置正常价格及非法负数/空价格 | 正常价格保存；非法输入拒绝 | 商品价格 |
| 10 | 提交审核 | Merchandiser 提交完整商品 | 状态进入待审核；重复提交幂等 | audit log、状态 |
| 11 | 管理员批准 | Admin 审核通过 | 状态进入可发布/已批准，记录审核人 | audit log |
| 12 | 商品上架 | 有权限用户发布商品 | Staging Storefront 可见，库存/价格正确 | 页面 URL |
| 13 | 仓库员工越权 | Warehouse Staff 尝试财务、员工、发布操作 | 前端隐藏/禁用且后端/RLS拒绝 | 403/RPC错误 |
| 14 | 商品运营越权 | Merchandiser 尝试未授权仓库/分类 | 只能访问分配分类，不能入库或跨范围读取 | RLS结果 |
| 15 | 测试网站可见 | 访客访问 Staging Storefront | 已发布测试商品可见；测试横幅/noindex存在 | HTML/headers |
| 16 | Production 不可见 | 只读查看 Production Storefront | `TEST-DRESS-001` 不存在 | 搜索结果；禁止写操作 |
| 17 | 重复提交 | 对入库、审核、发布、下单重复请求 | idempotency key 防止重复库存/订单 | 请求ID、记录数 |
| 18 | 网络失败 | 提交中断/超时后刷新重试 | 状态可恢复，无重复或残缺记录 | 日志、重试结果 |
| 19 | RLS | anon、普通员工、跨仓库、跨分类直接调用 API | 所有越权 SELECT/INSERT/UPDATE/DELETE 被拒绝 | pgTAP/API结果 |
| 20 | Storage 权限 | anon/员工上传、覆盖、读取不同路径 | 仅允许规定 bucket/path；upsert 同时验证 SELECT/INSERT/UPDATE | Storage响应 |

## 登入与基础页面

- 首页、登录、退出、刷新路由、Admin、Operations、Storefront（如已整合）均无 404。
- 桌面与手机布局可操作；控制台无严重错误，图片/字体无 404。
- Staging 响应包含 `X-Robots-Tag: noindex, nofollow`，页面包含 robots noindex。
- 环境交叉测试：Preview/Local 配置 Production ref 时构建必须失败。

## 通过标准

- 20 项全部通过或明确标记 `N/A` 且说明尚未启用原因。
- RLS、Storage、权限、幂等、网络失败测试不能豁免。
- Production 全程只读且没有测试数据。
- 测试数据清理经过 ID/前缀复核，记录清理 SQL 或后台操作日志。
- 发现任何库存、订单、权限或跨环境问题时，状态为“不建议合并”。

