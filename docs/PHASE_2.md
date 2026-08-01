# 第2阶段：数据库兼容基础、角色与 RLS

## 已完成

- 在保留现有商城、订单、`stock_receipts` 和多仓库库存结构的前提下，新增快速入库兼容层。
- `profiles.role` 增加 `employee` / `admin` 两级内部角色；商城顾客不被错误转换成员工。
- 旧 `OWNER` 自动映射为 `admin`，旧仓库、商品和订单员工角色兼容映射为 `employee`。
- `products` 补齐款号、三语言名称、内部名称、子分类、商品属性、促销价和货币等标准字段。
- `colors`、`categories`、`suppliers` 补齐多语言、排序、代码及更新时间字段。
- 新增 `inbound_orders` 与 `inbound_order_items`，为快速入库和批量入库提供独立单据结构。
- 新增基于数据库原子 UPSERT 的每日入库编号函数，格式为 `IN-YYYYMMDD-XXXX`。
- 新增必要唯一约束、外键索引、更新时间触发器和商品款号/SKU标准化触发器。
- 禁止已认证前端直接写入 `inventory` 和 `inventory_movements`；后续库存变更只能通过受控事务函数完成。
- 为新入库表启用 RLS：员工只可处理自己的草稿，管理员可读取全部单据；已确认库存不允许通过普通表更新。
- 写入 26 个标准 SKU 颜色代码、中文/英文/意大利语名称、HEX 色值、基础分类和 `ONE_SIZE`。
- 明确配置 `product-images` Bucket 的 10MB 与 JPG/PNG/WEBP 约束。
- 从线上 Supabase 架构重新生成 `types/database.ts`。

## 线上验证

- 迁移已记录为 `fast_inbound_foundation`。
- 两张快速入库表均启用 RLS，共有 6 条策略。
- 26 个标准颜色代码全部存在；旧颜色记录与既有商品关联保留。
- `authenticated` 对库存表没有直接更新权限，对库存流水没有直接插入权限。
- 入库编号函数对 `authenticated` 不开放直接执行权限，并通过回滚测试验证格式与连续唯一性。
- Supabase Security Advisor 未发现本次数据库迁移造成的 RLS 或函数安全问题。

## 兼容说明

现有价格列精度已能满足金额需求，因此未强制修改列类型，避免影响原有商品上架同步触发器。快速入库确认 RPC 将在第4阶段建立，并在同一事务中调用私有编号函数、更新多仓库库存、写入流水和审计日志。
