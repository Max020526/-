import { normalizeSize, normalizeStyleNo, type ParsedReceiptItem } from "../parser/receipt-parser.ts";

export type LabelOcrResult = {
  styleNo: string;
  barcode: string;
  brand: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  material: string;
  confidence: number;
  rawText: string;
};

const clean = (value?: string | null) => (value ?? "").replace(/^[\s:：#№.-]+|[\s,;，；]+$/g, "").trim();
const valueAfter = (text: string, labels: string, valuePattern: string) => {
  const match = text.match(new RegExp(`(?:${labels})\\s*[:：#№.-]?\\s*(${valuePattern})`, "i"));
  return clean(match?.[1]);
};

function genericStyleCandidate(lines: string[]) {
  const ignored = /^(MADE|SIZE|COLOR|COLOUR|COLORE|TAGLIA|QTY|QUANTITY|PRICE|EUR|EURO|ART|ITEM|MODEL|STYLE|COMPOSITION)/i;
  for (const line of lines) {
    if (ignored.test(line)) continue;
    const candidates = line.toUpperCase().match(/\b[A-Z]{1,8}[-/]?[A-Z0-9]{2,16}\b/g) ?? [];
    const candidate = candidates.find((value) => /[A-Z]/.test(value) && /\d/.test(value) && value.length >= 4 && value.length <= 20);
    if (candidate) return candidate;
  }
  return "";
}

function detectBrand(lines: string[]) {
  return clean(lines.find((line) => {
    const normalized = line.replace(/[^A-Za-zÀ-ÿ0-9&' -]/g, "").trim();
    return normalized.length >= 2 && normalized.length <= 32 && !/\d{3,}/.test(normalized) && !/(SIZE|COLOR|COLORE|MADE|ART|STYLE|MODEL|ITEM|COMPOSITION|POLYESTER|COTTON|VISCOSE|ELASTANE)/i.test(normalized);
  }));
}

export function parseLabelOcr(rawText: string, barcode = "", confidence = 0): LabelOcrResult {
  const normalizedText = rawText.replace(/[|]/g, "I").replace(/[ \t]+/g, " ");
  const lines = normalizedText.split(/\r?\n/).map(clean).filter(Boolean);
  const styleNo = valueAfter(normalizedText, "STYLE(?:\\s*NO)?|MODEL(?:LO)?|MOD(?:ELLO)?|ITEM(?:\\s*NO)?|ART(?:ICOLO)?|REF(?:ERENCE)?|款号|货号|型号", "[A-Z0-9][A-Z0-9._/-]{2,24}") || genericStyleCandidate(lines) || barcode;
  const size = valueAfter(normalizedText, "SIZE|TAGLIA|TAILLE|TALLA|尺码|尺寸", "(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|[2-9]XL|ONE\\s*SIZE|UNI|UNICA|\\d{1,3}(?:[./-]\\d{1,3})?)") || "UNI";
  const color = valueAfter(normalizedText, "COLOU?R|COLORE|COL(?:OR)?|颜色|色号", "[A-ZÀ-ÿ\u4e00-\u9fff][A-ZÀ-ÿ0-9\u4e00-\u9fff /_-]{1,28}");
  const quantityText = valueAfter(normalizedText, "QTY|QUANTITY|QUANTIT[AÀ]|PCS|PIECES|数量|件数", "\\d{1,4}");
  const materialMatches = [...normalizedText.matchAll(/(\d{1,3})\s*%\s*([A-ZÀ-ÿ\u4e00-\u9fff]{2,20})/gi)];
  const material = materialMatches.map((match) => `${match[1]}% ${match[2].toUpperCase()}`).join(" / ");
  const productName = valueAfter(normalizedText, "PRODUCT|DESCRIPTION|DESCRIZIONE|NAME|品名|商品名称", "[^\\n\\r]{2,60}");
  return {
    styleNo: normalizeStyleNo(styleNo), barcode: clean(barcode), brand: detectBrand(lines), productName,
    color: clean(color), size: normalizeSize(size), quantity: Math.max(1, Number(quantityText) || 1),
    material, confidence: Math.max(0, Math.min(100, Math.round(confidence))), rawText: rawText.trim(),
  };
}

export function labelResultToReceiptItem(result: LabelOcrResult, lineNumber: number): ParsedReceiptItem {
  const errors = [!result.styleNo && "未识别到款号", !result.color && "未识别到颜色"].filter(Boolean) as string[];
  return {
    lineNumber, rawText: result.rawText, rawStyleNo: result.styleNo,
    normalizedStyleNo: result.styleNo, rawColor: result.color, normalizedColor: result.color,
    rawSize: result.size, normalizedSize: result.size, quantity: result.quantity,
    status: errors.length ? "ERROR" : result.confidence < 65 ? "WARNING" : "VALID",
    error: errors.length ? `${errors.join("；")}，请人工补充` : result.confidence < 65 ? "识别置信度较低，请人工确认" : null,
    duplicateKey: null,
  };
}
