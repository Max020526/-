export type ColorDisplayValue = {
  code?: string | null;
  name?: string | null;
  name_zh?: string | null;
  name_en?: string | null;
};

const STANDARD_COLOR_NAMES: Record<string, string> = {
  BEI: "米色", BUR: "酒红色", DDB: "深牛仔色", LDB: "浅牛仔色", OWH: "米白色",
  BLK: "黑色", WHT: "白色", IVY: "米白", CRM: "奶白", BRN: "棕色", DBR: "深棕", LBR: "浅棕",
  RED: "红色", WIN: "酒红", PNK: "粉色", BLU: "蓝色", NVY: "深蓝", LBL: "浅蓝", GRN: "绿色",
  DGR: "深绿", GRY: "灰色", DGY: "深灰", LGY: "浅灰", KHK: "卡其", BGE: "米色", YLW: "黄色",
  ORG: "橙色", PUR: "紫色", GLD: "金色", SLV: "银色", MUL: "彩色", CHR: "炭灰", SMK: "烟灰",
  OAT: "燕麦色", SND: "沙色", CML: "驼色", CAR: "焦糖色", COF: "咖啡色", MOC: "摩卡色",
  CHO: "巧克力色", NUD: "裸色", APR: "杏色", CHP: "香槟色", RPK: "玫瑰粉", DSR: "豆沙色",
  COR: "珊瑚色", PCH: "桃色", FUS: "玫红", BRK: "砖红", RST: "铁锈红", SKY: "天蓝",
  RYB: "宝蓝", DNM: "牛仔蓝", PCB: "孔雀蓝", TEA: "青色", MNT: "薄荷绿", AVO: "牛油果绿",
  OLV: "橄榄绿", ARM: "军绿色", EMR: "祖母绿", LAV: "薰衣草紫", LIL: "丁香紫", PLM: "梅子色",
  BRZ: "古铜色", CLR: "透明",
};

// Common signatures of UTF-8 text that was decoded as Windows-1252.
const MOJIBAKE_PATTERN = /(?:Ã|Â|â€|é»|è‰|ç™|æ£|æ·|æµ|çº|ç»|å¥|å|é‡|é“|å½|è“)/;

export function hasMojibake(value: string | null | undefined) {
  return Boolean(value && MOJIBAKE_PATTERN.test(value));
}

export function getColorDisplayName(color: ColorDisplayValue) {
  const code = color.code?.trim().toUpperCase() ?? "";
  const standardName = STANDARD_COLOR_NAMES[code];
  if (standardName) return standardName;

  const candidates = [color.name_zh, color.name, color.name_en];
  return candidates.find((value) => value?.trim() && !hasMojibake(value))?.trim() || (code ? `颜色 ${code}` : "未命名颜色");
}
