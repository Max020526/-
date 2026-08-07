# Multi-computer workflow

- `origin/develop` 是所有日常开发的共同起点，`origin/main` 只保存已验收生产代码。
- 一项功能只使用一个短期分支。另一台电脑继续同一工作时，先 fetch，再 checkout 该远程分支。
- 未完成工作也应提交为清楚标记的安全 commit 并推送到远程 Draft PR；不要用网盘同步 Git 工作目录。
- 数据结构用新 migration 同步，数据库类型从 Staging 重新生成，业务文件保存在对应 Supabase Storage。
- 真实 Secret 只保存在密码管理器、本机 `.env.local`、GitHub Environment、Netlify 或 Supabase Secrets。

开始：

```bash
git fetch --prune origin
git switch develop
git pull --ff-only origin develop
git switch -c fix/<issue>
```

继续已有分支：

```bash
git fetch origin
git switch --track origin/fix/<issue>
```

结束：运行质量检查，提交明确文件，推送并更新 Draft PR。发生冲突时先停止、阅读差异并正常合并或 rebase；不得用强推覆盖其他电脑的工作。
