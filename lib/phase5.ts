export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿", approved: "已审批", ordered: "已下达", partially_received: "部分收货", received: "已收齐", cancelled: "已取消",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿", submitted: "待审批", approved: "已审批", paid: "已付款", rejected: "已驳回", cancelled: "已取消",
};

export function businessCommandKey(scope: string) {
  return `${scope}:${Date.now()}:${crypto.randomUUID()}`;
}
export function eur(value: number | string | null | undefined) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "EUR" }).format(Number(value ?? 0));
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const body = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const href = URL.createObjectURL(new Blob(["\ufeff", body], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = href; anchor.download = filename; anchor.click(); URL.revokeObjectURL(href);
}
