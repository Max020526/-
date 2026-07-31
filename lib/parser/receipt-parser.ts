export type ParsedReceiptItem = {
  lineNumber: number;
  rawText: string;
  rawStyleNo: string;
  normalizedStyleNo: string;
  rawColor: string;
  normalizedColor: string;
  rawSize: string;
  normalizedSize: string;
  quantity: number | null;
  status: "VALID" | "WARNING" | "ERROR";
  error: string | null;
  duplicateKey: string | null;
};

const COLOR_MAP: Record<string, string> = {
  "浅牛仔色":"浅牛仔色", "深牛仔色":"深牛仔色", "米白色":"米白色", "浅棕色":"浅棕色", "酒红色":"酒红色",
  "浅牛":"浅牛仔色", "深牛":"深牛仔色", "米白":"米白色", "浅棕":"浅棕色", "酒红":"酒红色",
  "黑色":"黑色", "白色":"白色", "红色":"红色", "绿色":"绿色", "蓝色":"蓝色", "棕色":"棕色", "灰色":"灰色", "米色":"米色",
  "黑":"黑色", "白":"白色", "红":"红色", "绿":"绿色", "蓝":"蓝色", "棕":"棕色", "灰":"灰色", "米":"米色",
};
const COLORS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
const SIZES = ["ONE SIZE", "XXXL", "XXL", "XL", "XS", "SM", "ML", "UNI", "均码", "S", "M", "L"];
const colorSource = COLORS.map(escapeRegex).join("|");
const sizeSource = SIZES.map(escapeRegex).join("|");

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function normalizeStyleNo(value: string) { return value.trim().replace(/\s+/g, " ").toUpperCase(); }
export function normalizeSize(value?: string) { const size = (value || "UNI").trim().toUpperCase(); return size === "均码" || size === "ONE SIZE" ? "UNI" : size; }

function baseItem(lineNumber: number, rawText: string, style: string): ParsedReceiptItem {
  return { lineNumber, rawText, rawStyleNo: style, normalizedStyleNo: normalizeStyleNo(style), rawColor: "", normalizedColor: "", rawSize: "", normalizedSize: "UNI", quantity: null, status: "ERROR", error: "未识别到颜色和数量", duplicateKey: null };
}

function parseSegments(rest: string) {
  const matches = [...rest.matchAll(new RegExp(colorSource, "g"))];
  const quantityBeforeColor = new RegExp(`^\\s*\\d+\\s*(?:${colorSource})`).test(rest);
  const segments: Array<{ color: string; body: string }> = [];
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const next = matches[index + 1]?.index ?? rest.length;
    const previousEnd = index ? (matches[index - 1].index ?? 0) + matches[index - 1][0].length : 0;
    segments.push({ color: match[0], body: (quantityBeforeColor ? rest.slice(previousEnd, start) : rest.slice(end, next)).trim() });
  });
  return segments;
}

export function parseReceiptText(text: string): ParsedReceiptItem[] {
  const output: ParsedReceiptItem[] = [];
  text.split(/\r?\n/).forEach((source, index) => {
    const rawText = source.trim(); if (!rawText) return;
    const cleaned = rawText.replace(/^\s*\d+[.、)）]\s*/, "");
    const firstSpace = cleaned.search(/\s/);
    if (firstSpace < 0) { output.push(baseItem(index + 1, rawText, cleaned)); return; }
    const style = cleaned.slice(0, firstSpace); const rest = cleaned.slice(firstSpace).trim();
    const segments = parseSegments(rest);
    if (!segments.length) { output.push(baseItem(index + 1, rawText, style)); return; }
    for (const segment of segments) {
      const rawColor = segment.color; const normalizedColor = COLOR_MAP[rawColor] ?? rawColor;
      const combined = segment.body.replace(/\s+/g, "");
      const sized = [...combined.matchAll(new RegExp(`(\\d+)(${sizeSource})`, "gi"))];
      if (sized.length) {
        for (const match of sized) output.push({ lineNumber:index+1, rawText, rawStyleNo:style, normalizedStyleNo:normalizeStyleNo(style), rawColor, normalizedColor, rawSize:match[2], normalizedSize:normalizeSize(match[2]), quantity:Number(match[1]), status:"WARNING", error:"紧凑尺码格式已自动解析，请确认", duplicateKey:null });
        continue;
      }
      const quantityMatch = combined.match(/\d+/);
      const quantity = quantityMatch ? Number(quantityMatch[0]) : null;
      output.push({ lineNumber:index+1, rawText, rawStyleNo:style, normalizedStyleNo:normalizeStyleNo(style), rawColor, normalizedColor, rawSize:"UNI", normalizedSize:"UNI", quantity, status:quantity && quantity > 0 ? "VALID" : "ERROR", error:quantity && quantity > 0 ? null : "数量缺失或无效", duplicateKey:null });
    }
  });
  const counts = new Map<string, number>();
  for (const row of output) { const key = `${row.normalizedStyleNo}|${row.normalizedColor}|${row.normalizedSize}`; counts.set(key, (counts.get(key) ?? 0) + 1); }
  return output.map(row => { const key = `${row.normalizedStyleNo}|${row.normalizedColor}|${row.normalizedSize}`; return counts.get(key)! > 1 ? { ...row, status:row.status === "ERROR" ? "ERROR" : "WARNING", error:row.error ?? "同款同色同码重复，请确认是否合并", duplicateKey:key } : row; });
}

export function mergeDuplicateItems(items: ParsedReceiptItem[]) {
  const merged = new Map<string, ParsedReceiptItem>();
  for (const item of items) {
    const key = `${item.normalizedStyleNo}|${item.normalizedColor}|${item.normalizedSize}`;
    const current = merged.get(key);
    if (!current) merged.set(key, { ...item, duplicateKey:null, status:item.quantity ? "VALID" : "ERROR", error:item.quantity ? null : item.error });
    else merged.set(key, { ...current, quantity:(current.quantity ?? 0) + (item.quantity ?? 0), rawText:`${current.rawText} / ${item.rawText}`, duplicateKey:null, status:"VALID", error:null });
  }
  return [...merged.values()];
}
