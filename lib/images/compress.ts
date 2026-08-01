const MAX_EDGE = 2000;
const TARGET_BYTES = 1_800_000;

export async function compressProductImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("仅支持 JPG、PNG 或 WEBP 图片。");
  if (file.size > 10 * 1024 * 1024) throw new Error("单张图片不能超过 10MB。");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (ratio === 1 && file.size <= TARGET_BYTES) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("当前浏览器无法压缩图片。"); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("图片压缩失败，请更换图片重试。");
  const name = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
  return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
}
