# Database backup

Production 和 Staging 是独立 Supabase 项目。Supabase 托管备份保护运行数据，GitHub migrations 保护可重建结构；两者不能互相替代。

生产 migration 前：确认 Pro 项目备份/PITR 状态和最近恢复点，记录 migration 版本，导出不可重建的关键业务数据，并验证旧前端与扩展阶段 schema 兼容。不要把数据库 dump、顾客数据或密码提交到 GitHub。

Staging 定期从基础 seed 和匿名化测试数据重建。禁止将 Production Auth 用户、顾客隐私、订单或财务数据复制到 Staging。备份保留周期、负责人和恢复演练日期应记录在私有运维台账中。
