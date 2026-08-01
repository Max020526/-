const RULES: Array<[RegExp, string]> = [
  [/duplicate key|23505/i, "相同的款号、SKU 或业务标识已经存在，请检查后重试。"],
  [/row-level security|permission denied|42501/i, "当前账号没有执行此操作的权限。"],
  [/jwt|session|not authenticated/i, "登录状态已失效，请重新登录。"],
  [/network|fetch|failed to fetch/i, "网络连接失败，请检查网络后重试。"],
  [/storage|bucket/i, "图片存储暂时不可用，请稍后重试。"],
];

export function friendlyError(error: unknown, fallback = "操作失败，请稍后重试。") {
  const message = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  return RULES.find(([pattern]) => pattern.test(message))?.[1] ?? fallback;
}
