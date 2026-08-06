# Code backup

GitHub `Max020526/WholesaleSystem` 是代码主远程来源。源码、migration、RLS/RPC、Edge Function、基础 seed、类型、CI、Netlify 配置、锁文件和文档都必须进入受审查分支并推送。

每日结束前执行 `git status`、`git branch -vv` 和 `git log origin/<branch>..HEAD`。输出非空表示仍有本地独有 commit。正式发布创建带注释版本标签，并由发布 PR 记录 commit 与 migration 清单。

缓存、构建产物、真实 `.env`、用户上传媒体和业务导出不得作为代码备份提交。定期验证仓库可在一台干净电脑用 `npm ci` 重建。
