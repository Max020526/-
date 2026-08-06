# Remote schema drift audit — 2026-08-06

本审计为只读；没有对远程数据库执行 migration、reset 或 seed。

| 项目 | public 表 | migration history | Edge Functions | Storage buckets |
|---|---:|---:|---:|---|
| Production | 65 | 54 | 0 | `product-images`, `receipt-scans` |
| Staging | 64 | 56 | 0 | `product-images`, `receipt-scans` |
| Git checkout | migration 文件 50 | — | 源目录此前缺失 | bucket SQL 已覆盖上述两个 |

已确认的差异：Production 有 `staff_invitations`，Staging 没有；Production 还有四项 staff invitation 相关 migration 未落入当前 Git 文件。Staging 有六项 2026-08-05/06 修复 migration；它们目前只在 Draft PR #11 分支中，且该分支同时修改了一些已执行历史 migration。

因此当前不能宣称可从 GitHub 完整重建任一远程 schema，也不能直接把 Production 或 Staging 向另一边“同步”。处理顺序：

1. 从两个项目分别导出只含 schema 的受控快照并审查，不提交业务数据。
2. 把 Dashboard-only 变更转换为新的、向前追加的 migration；不得修改已执行文件。
3. 拆分/修正 PR #11，只保留新 migration 或证明 fresh database 修复的兼容策略。
4. 在本地空库 replay 全部 migration，再在 Staging 应用并运行 RLS/RPC/业务测试。
5. Staging 验收后，经 Production 备份和人工审批再发布。

这项 drift 是当前生产发布硬阻塞项。
