# NEXORA STUDIO 顾客零售网站

这是 NEXORA Fashion Commerce Platform V1.0 的独立 Retail Storefront，GitHub 规范位置为 `apps/storefront`。同一生命周期内它与内部管理端共用对应 Supabase 商品、SKU、库存、顾客和订单模型；Staging 与 Production 绝不共用项目。

## 已完成

- 首页、分类、搜索、筛选、商品详情、购物袋、顾客账户和地址簿
- 访客与登录顾客结账、配送/自提、服务端金额重算、库存预占和幂等下单
- 订单总体状态、付款状态和履约状态分别展示
- 顾客订单公开时间线和售后记录
- 登录顾客可取消未付款订单；取消通过 RPC 释放库存预占
- 已完成订单可申请退货；仓库质检与退款由内部端继续处理

支付仍使用明确的 `manual` 适配器边界，没有接入真实支付服务，也不会保存银行卡信息或伪造付款结果。

## 本地运行

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev:netlify
```

不得把 secret/service role key 放入 `NEXT_PUBLIC_*`。数据库必须先应用主项目全部 Phase 1–4 migrations。

## 质量检查

```powershell
npm run lint
npm run typecheck
npm test
npm run build:netlify
```

当前没有执行正式部署。上线前需要核对 Supabase URL、publishable key、站点 URL、媒体 API URL、域名和 Auth Redirect URLs。

非生产构建会显示环境横幅并返回 `noindex,nofollow`。Netlify Storefront 站点应把 Base directory 设置为 `apps/storefront`，Production 绑定 `main`，Staging 绑定 `develop`；Deploy Preview 只能使用 Staging 或 Preview Supabase。
