import { normalizeSize, normalizeStyleNo, type ParsedReceiptItem } from "./receipt-parser.ts";

type Cell = string | number | boolean | Date | null | undefined;

const HEADER_ALIASES = {
  style: ["款号", "货号", "style_no", "style", "sku"],
  color: ["颜色", "色号", "color_name", "color"],
  size: ["尺码", "尺寸", "size_name", "size"],
  quantity: ["数量", "件数", "quantity", "qty"],
  supplier: ["供应商", "supplier"],
  cost: ["成本价", "进货价", "cost_price", "cost"],
  remark: ["备注", "说明", "remark", "notes"],
} as const;

function text(value: Cell) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value).trim();
}

function normalizeHeader(value: Cell) {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function findColumn(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function markDuplicates(items: ParsedReceiptItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = `${item.normalizedStyleNo}|${item.normalizedColor}|${item.normalizedSize}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return items.map((item) => {
    const key = `${item.normalizedStyleNo}|${item.normalizedColor}|${item.normalizedSize}`;
    if ((counts.get(key) ?? 0) < 2) return item;
    return {
      ...item,
      status: item.status === "ERROR" ? "ERROR" as const : "WARNING" as const,
      error: item.error ?? "同款同色同码重复，请确认是否合并",
      duplicateKey: key,
    };
  });
}

export function spreadsheetRowsToReceiptItems(rows: Cell[][]): ParsedReceiptItem[] {
  const nonEmpty = rows.filter((row) => row.some((cell) => text(cell)));
  if (!nonEmpty.length) throw new Error("文件中没有可导入的数据。");

  const headers = nonEmpty[0].map(normalizeHeader);
  const styleIndex = findColumn(headers, HEADER_ALIASES.style);
  const colorIndex = findColumn(headers, HEADER_ALIASES.color);
  const sizeIndex = findColumn(headers, HEADER_ALIASES.size);
  const quantityIndex = findColumn(headers, HEADER_ALIASES.quantity);
  const missing = [
    styleIndex < 0 && "款号",
    colorIndex < 0 && "颜色",
    quantityIndex < 0 && "数量",
  ].filter(Boolean);
  if (missing.length) throw new Error(`缺少必填列：${missing.join("、")}。`);

  const items = nonEmpty.slice(1).map((row, offset) => {
    const rawStyleNo = text(row[styleIndex]);
    const rawColor = text(row[colorIndex]);
    const rawSize = sizeIndex >= 0 ? text(row[sizeIndex]) || "UNI" : "UNI";
    const quantityText = text(row[quantityIndex]);
    const quantity = Number(quantityText);
    const errors = [
      !rawStyleNo && "款号为空",
      !rawColor && "颜色为空",
      (!Number.isInteger(quantity) || quantity <= 0) && "数量必须是大于 0 的整数",
    ].filter(Boolean) as string[];
    return {
      lineNumber: offset + 2,
      rawText: row.map(text).join(" | "),
      rawStyleNo,
      normalizedStyleNo: normalizeStyleNo(rawStyleNo),
      rawColor,
      normalizedColor: rawColor,
      rawSize,
      normalizedSize: normalizeSize(rawSize),
      quantity: errors.length ? null : quantity,
      status: errors.length ? "ERROR" as const : "VALID" as const,
      error: errors.length ? errors.join("；") : null,
      duplicateKey: null,
    };
  });

  if (!items.length) throw new Error("文件只有表头，没有商品明细。");
  return markDuplicates(items);
}

export function parseCsv(textValue: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < textValue.length; index += 1) {
    const char = textValue[index];
    if (char === '"') {
      if (quoted && textValue[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && textValue[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedReceiptItem[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xls") throw new Error("旧版 .xls 暂不支持，请在 Excel 中另存为 .xlsx 后再导入。");
  if (extension === "csv") {
    const csv = await file.text();
    return spreadsheetRowsToReceiptItems(parseCsv(csv.replace(/^\uFEFF/, "")));
  }
  if (extension !== "xlsx") throw new Error("请选择 .xlsx 或 .csv 文件。");
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);
  return spreadsheetRowsToReceiptItems(rows as unknown as Cell[][]);
}
