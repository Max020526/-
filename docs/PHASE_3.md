# 第3阶段：登录与内部角色系统

- 使用 Supabase SSR Cookie 会话，并通过 Next.js Proxy 刷新和验证访问令牌。
- `/admin`、`/settings`、`/products` 仅允许管理员；仓库、入库和库存入口允许员工与管理员。
- 权限从受 RLS 保护的 `profiles.role` 和 `profiles.is_active` 读取，不信任用户可编辑的 metadata。
- 停用账号登录后立即退出；无权限访问会回到登录入口。
- 登录后按角色进入管理仪表盘或快速入库，顾客账号仍进入顾客网站流程。
- 侧栏显示当前员工姓名、角色并支持安全退出。
