/* OCR previews use local object URLs captured on the device. */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  FileImage,
  LoaderCircle,
  ScanLine,
  Trash2,
} from "lucide-react";
import { parseLabelOcr, type LabelOcrResult } from "@/lib/ocr/label-parser";

export type ReceiptOcrScan = { file: File; result: LabelOcrResult };
type ScanEntry = {
  id: string;
  file: File;
  preview: string;
  result: LabelOcrResult | null;
  error: string;
};

async function enhanceForOcr(file: File): Promise<Blob | File> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  if (
    !bitmap.width ||
    !bitmap.height ||
    bitmap.width * bitmap.height > 40_000_000
  ) {
    bitmap.close();
    throw new Error("图片尺寸过大或无效，请缩小后重试");
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale =
    longest > 2400 ? 2400 / longest : longest < 1400 ? 1400 / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray =
      pixels.data[index] * 0.299 +
      pixels.data[index + 1] * 0.587 +
      pixels.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.32 + 128));
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9),
  );
}

async function detectBarcode(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(url);
    return result.getText();
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function OcrScanner({
  onApply,
}: {
  onApply: (scans: ReceiptOcrScan[]) => void;
}) {
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("等待选择照片");
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
    },
    [],
  );

  function addFiles(list: FileList | null) {
    const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
    const files = [...(list ?? [])]
      .filter((file) => supported.has(file.type))
      .slice(0, Math.max(0, 8 - entries.length));
    const accepted = files.filter((file) => file.size <= 12 * 1024 * 1024);
    const next = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      urls.current.push(preview);
      return {
        id: crypto.randomUUID(),
        file,
        preview,
        result: null,
        error: "",
      };
    });
    setEntries((current) => [...current, ...next]);
    setStatus(
      accepted.length < files.length
        ? "部分照片超过 12MB，已跳过"
        : `已选择 ${entries.length + next.length} 张照片`,
    );
  }

  function remove(id: string) {
    setEntries((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
        urls.current = urls.current.filter((url) => url !== target.preview);
      }
      return current.filter((entry) => entry.id !== id);
    });
  }

  function update(
    id: string,
    field: keyof LabelOcrResult,
    value: string | number,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id && entry.result
          ? { ...entry, result: { ...entry.result, [field]: value } }
          : entry,
      ),
    );
  }

  async function scan() {
    if (!entries.length) {
      setStatus("请先拍照或选择商品标签照片");
      return;
    }
    setScanning(true);
    setProgress(0);
    setStatus("正在加载本地识别引擎，首次使用需要下载语言模型…");
    let worker: Awaited<
      ReturnType<(typeof import("tesseract.js"))["createWorker"]>
    > | null = null;
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker(["eng", "ita", "chi_sim"], 1, {
        logger: (event) => {
          if (typeof event.progress === "number")
            setProgress(Math.round(event.progress * 100));
          if (event.status)
            setStatus(
              event.status === "recognizing text"
                ? "正在识别标签文字…"
                : "正在准备识别模型…",
            );
        },
      });
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        setStatus(`正在识别第 ${index + 1} / ${entries.length} 张照片…`);
        try {
          const [barcode, enhanced] = await Promise.all([
            detectBarcode(entry.file),
            enhanceForOcr(entry.file),
          ]);
          const recognized = await worker.recognize(enhanced, {
            rotateAuto: true,
          });
          const result = parseLabelOcr(
            recognized.data.text,
            barcode,
            recognized.data.confidence,
          );
          setEntries((current) =>
            current.map((item) =>
              item.id === entry.id ? { ...item, result, error: "" } : item,
            ),
          );
        } catch (error) {
          setEntries((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    error: error instanceof Error ? error.message : "识别失败",
                  }
                : item,
            ),
          );
        }
      }
      setStatus("识别完成，请检查并补充结果");
      setProgress(100);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `识别引擎加载失败：${error.message}`
          : "识别引擎加载失败",
      );
    } finally {
      if (worker) await worker.terminate();
      setScanning(false);
    }
  }

  const recognized = entries.filter(
    (entry): entry is ScanEntry & { result: LabelOcrResult } =>
      Boolean(entry.result),
  );
  return (
    <div className="ocr-scanner">
      <div className="ocr-toolbar">
        <label className="button primary">
          <Camera size={16} />
          拍摄商品标签
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label className="button">
          <FileImage size={16} />
          选择多张照片
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <span className="muted" style={{ fontSize: 11 }}>
          最多 8 张，每张不超过 12MB
        </span>
      </div>
      {entries.length > 0 && (
        <>
          <div className="ocr-grid">
            {entries.map((entry) => (
              <article className="ocr-card" key={entry.id}>
                <div className="ocr-preview">
                  <img src={entry.preview} alt={entry.file.name} />
                  <button
                    className="icon-btn"
                    aria-label="删除照片"
                    onClick={() => remove(entry.id)}
                    disabled={scanning}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="ocr-card-body">
                  <strong title={entry.file.name}>{entry.file.name}</strong>
                  {entry.error && (
                    <span className="muted" style={{ color: "var(--danger)" }}>
                      {entry.error}
                    </span>
                  )}
                  {entry.result ? (
                    <div className="ocr-fields">
                      <div className="field">
                        <label>款号 *</label>
                        <input
                          value={entry.result.styleNo}
                          onChange={(event) =>
                            update(
                              entry.id,
                              "styleNo",
                              event.target.value.toUpperCase(),
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>条码</label>
                        <input
                          value={entry.result.barcode}
                          onChange={(event) =>
                            update(entry.id, "barcode", event.target.value)
                          }
                        />
                      </div>
                      <div className="field">
                        <label>颜色 *</label>
                        <input
                          value={entry.result.color}
                          onChange={(event) =>
                            update(entry.id, "color", event.target.value)
                          }
                        />
                      </div>
                      <div className="field">
                        <label>尺码</label>
                        <input
                          value={entry.result.size}
                          onChange={(event) =>
                            update(
                              entry.id,
                              "size",
                              event.target.value.toUpperCase(),
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>数量</label>
                        <input
                          type="number"
                          min="1"
                          value={entry.result.quantity}
                          onChange={(event) =>
                            update(
                              entry.id,
                              "quantity",
                              Math.max(1, Number(event.target.value)),
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>品牌</label>
                        <input
                          value={entry.result.brand}
                          onChange={(event) =>
                            update(entry.id, "brand", event.target.value)
                          }
                        />
                      </div>
                      <div className="field full">
                        <label>商品名称</label>
                        <input
                          value={entry.result.productName}
                          onChange={(event) =>
                            update(entry.id, "productName", event.target.value)
                          }
                        />
                      </div>
                      <div className="field full">
                        <label>材质</label>
                        <input
                          value={entry.result.material}
                          onChange={(event) =>
                            update(entry.id, "material", event.target.value)
                          }
                        />
                      </div>
                      <div className="field full">
                        <label>识别原文 · {entry.result.confidence}%</label>
                        <textarea
                          value={entry.result.rawText}
                          onChange={(event) =>
                            update(entry.id, "rawText", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="muted">等待识别</span>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="ocr-progress">
            <span
              style={{
                width: `${scanning ? progress : recognized.length ? 100 : 0}%`,
              }}
            />
          </div>
          <div className="form-actions">
            <span
              className="muted"
              style={{ marginRight: "auto", fontSize: 11 }}
            >
              {status}
            </span>
            <button
              className="button"
              disabled={scanning}
              onClick={() => void scan()}
            >
              {scanning ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <ScanLine size={15} />
              )}{" "}
              {scanning
                ? "识别中…"
                : recognized.length
                  ? "重新识别"
                  : "开始识别"}
            </button>
            <button
              className="button primary"
              disabled={scanning || !recognized.length}
              onClick={() =>
                onApply(
                  recognized.map((entry) => ({
                    file: entry.file,
                    result: entry.result,
                  })),
                )
              }
            >
              <Check size={15} />
              加入入库明细
            </button>
          </div>
        </>
      )}
      {!entries.length && (
        <div className="empty">
          <div>
            <div className="empty-icon">
              <Camera />
            </div>
            <b>拍摄吊牌、洗水标或包装标签</b>
            <span>
              尽量让标签铺平、文字占满画面并避免反光；支持识别款号、条码、颜色、尺码、数量、品牌和材质。
            </span>
          </div>
        </div>
      )}
      <div className="notice" style={{ marginTop: 14 }}>
        照片在当前设备上完成文字识别。识别结果必须人工确认，确认入库前不会改变实际库存。
      </div>
    </div>
  );
}
