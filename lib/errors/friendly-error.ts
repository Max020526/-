const RULES: Array<[RegExp, string]> = [
  [/duplicate key|23505/i, "相同的款号、SKU 或业务标识已经存在，请检查后重试。"],
  [/row-level security|permission denied|42501/i, "当前账号没有执行此操作的权限。"],
  [/jwt|session|not authenticated|auth session missing|invalid token/i, "登录状态已失效，请重新登录。"],
  [/invalid input syntax.*uuid|22p02/i, "提交的数据格式无效，请刷新页面后重试。"],
  [/check constraint|23514|must be positive|negative stock/i, "提交的数据不符合业务规则，请检查数量和状态。"],
  [/foreign key|23503/i, "关联资料不存在或已停用，请刷新基础资料后重试。"],
  [/lock timeout|deadlock|40p01|55p03/i, "系统正忙于处理同一业务，请稍后重试。"],
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
