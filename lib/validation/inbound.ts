export type InboundDraftRow = {
  key: string;
  modelNumber: string;
  colorId: string;
  quantity: string;
};

export type ConfirmInboundItem = {
  model_number: string;
  color_id: string;
  quantity: number;
};

export function normalizeModelNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function validateInboundRow(row: InboundDraftRow) {
  const model = normalizeModelNumber(row.modelNumber);
  const quantity = Number(row.quantity);
  if (!/^[A-Z0-9_-]{2,50}$/.test(model)) return "款号需为2至50位字母、数字、短横线或下划线";
  if (!row.colorId) return "请选择颜色";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999) return "数量需为1至99999的正整数";
  return null;
}

export function mergeInboundRows(rows: InboundDraftRow[]): ConfirmInboundItem[] {
  const merged = new Map<string, ConfirmInboundItem>();
  for (const row of rows) {
    const error = validateInboundRow(row);
    if (error) throw new Error(error);
    const model_number = normalizeModelNumber(row.modelNumber);
    const key = `${model_number}:${row.colorId}`;
    const existing = merged.get(key);
    const quantity = Number(row.quantity);
    if (existing) existing.quantity += quantity;
    else merged.set(key, { model_number, color_id: row.colorId, quantity });
  }
  for (const item of merged.values()) {
    if (item.quantity > 99999) throw new Error("相同款号和颜色合并后的数量不能超过99999");
  }
  return [...merged.values()];
}
