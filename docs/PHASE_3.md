# 第三阶段：独立零售商城与安全下单

第三阶段已按照 V1.0 基线建立独立、移动端优先的 B2C 商城。商城仍使用统一 Supabase 数据库，但只通过窄化 RPC 读取第二阶段已发布商品，不能读取成本价、原始库存、草稿或内部媒体路径。

## 已完成

- 首页、分类/搜索、URL 筛选、分页、商品详情、购物袋、登录注册、地址簿、结账、订单确认与访客订单查询。
- SEO canonical、动态 metadata、Open Graph、sitemap、robots 与 Product JSON-LD。
- 匿名结账及登录顾客结账；配送和门店自取；地址、联系信息、商品名称、SKU、价格、税额和图片引用快照。
- `stock_reservations` 库存预留表、过期释放、订单归属 RLS 与不可直接写库存规则。
- `rpc_get_storefront_catalog`、`rpc_create_storefront_order`、`rpc_get_storefront_order`、`rpc_merge_customer_cart` 四个窄化接口。
- 服务端重新读取渠道、发布状态、价格和可售库存；浏览器提交的金额不会进入订单计算。
- 行锁、条件更新、唯一幂等键、稳定访客查询令牌和请求频率限制。
- Netlify 构建配置已准备；本阶段没有执行正式部署或接入真实支付。

## 数据库验证

迁移已应用到现有 Supabase 项目。测试在单个事务中临时创建一件商品和一件库存，验证：

1. 商品只能通过安全目录 RPC 返回。
2. 首次匿名下单生成一个订单和一个有效预留。
3. 相同幂等键重试返回同一个订单与同一个访客查询令牌，不重复预留。
4. 第二个访客购买最后一件时被拒绝。
5. 订单、预留和库存数量保持一致。
6. 测试事务最终回滚，未保留测试商品或订单。

结果：`A07_A08_transaction_rollback_passed`。

## 安全边界

- `anon` 无权 SELECT 原始 `products`、`product_variants`、`product_images`、价格表或 `inventory`。
- 已登录零售顾客也不能通过通用 `authenticated` 角色读取内部商品列；内部读取需 `products.read`。
- 顾客资料、地址、购物袋和订单使用 own-only RLS；管理员权限仍由数据库权限表决定。
- 订单查询令牌只保存 SHA-256 摘要；请求指纹只保存摘要，不保存原始 IP。
- 支付适配器固定为 `manual`，订单保持 `PENDING_PAYMENT`，第四阶段再接真实支付与履约。

## 已知限制

- 当前 Supabase 商业数据为空，商城会显示正式空状态；没有写入演示商品。
- 尚未开发支付回调、拣货发货、退货退款与财务入账，这些属于第四阶段及以后。
- Auth 泄露密码检测必须由项目所有者在 Supabase 控制台启用。
- Netlify/Sites 正式发布需要单独上线授权与域名、环境变量确认。
