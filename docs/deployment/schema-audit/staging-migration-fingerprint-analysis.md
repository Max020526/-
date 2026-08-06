# Staging migration 指纹差异分类

数据来源：2026-08-06 已完成的 Staging 只读 history 审计与 Draft PR #11 的原始修复 commit。当前 Supabase connector 对 Staging ref `iucikdtxpwnvhdcpulqa` 返回无权限，因此本文件没有声称重新读取当前远程状态。

| Migration | Git版本摘要 | Staging实际语义摘要 | 分类 | 最终Schema | 安全 | 业务 | 推荐 |
|---|---|---|---|---|---|---|---|
| `harden_and_complete_core` | 无条件撤销平台函数 | 仅在 `rls_auto_enable()` 存在时撤销 | F | 否 | 降低重放风险 | 否 | 使用幂等 Git 修复 |
| `employee_invitation_rbac_scopes` | 无条件撤销 legacy invitation RPC | 仅在 legacy RPC 存在时撤销 | F | 否 | 保持最小授权 | 否 | 使用幂等 Git 修复 |
| `repair_max_and_manager_invite` | 缺少 MAX 时终止 migration | 缺少 Production fixture 时 NOTICE 并退出 | G | 否 | 否 | 仅影响环境专属修复 | 使用可重放 guard |
| `employee_access_advisor_hardening` | 无条件撤销三项 legacy RPC | 对存在的 RPC 分别撤销 | F | 否 | 保持最小授权 | 否 | 使用幂等 Git 修复 |

结论：4 条差异是环境可重放/可选对象处理，不表示 Staging 应成为 Canonical Schema。当前对象级 Staging 快照仍需在 connector 重新授权后复核。
