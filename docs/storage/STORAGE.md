# Supabase Storage

远程只读检查显示 Production 与 Staging 当前都只有两个私有 Bucket：`product-images` 和 `receipt-scans`。它们必须保留在各自项目，测试文件不得复制到 Production。

规划但尚未创建：`product-videos`、`finance-documents`、`return-images`、`user-avatars`。在业务代码、MIME/大小限制和 RLS 策略完成前，不在本架构 PR 中自动创建。后续必须用新 migration 同时定义 Bucket 与 `storage.objects` policy，先部署 Staging。

推荐路径：

- `products/{product_id}/{variant_id}/{filename}`
- `returns/{return_id}/{filename}`
- `finance/{year}/{month}/{document_id}/{filename}`
- `avatars/{user_id}/{filename}`

上传组件必须限制文件类型与大小，图片压缩逻辑保存在代码中。正式上传文件不提交 GitHub；GitHub 只保存小型测试占位图、初始化 SQL、policy、压缩和上传代码。
