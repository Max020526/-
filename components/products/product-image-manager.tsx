/* Upload previews include local object URLs and dynamic storage URLs. */
/* eslint-disable @next/next/no-img-element */
"use client";

import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { friendlyError } from "@/lib/errors/friendly-error";
import { compressProductImage } from "@/lib/images/compress";
import { getSupabase } from "@/lib/supabase/client";

type Image = { id: string; file_path: string; public_url?: string; is_primary: boolean; sort_order: number; image_type?: string; deleted_at?: string | null };

export function ProductImageManager({ productId, productName, images, onChanged, onMessage }: { productId: string; productName: string; images: Image[]; onChanged: () => void; onMessage: (message: string) => void }) {
  const [working, setWorking] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const client = getSupabase();
    if (!client || !images.length) { setSignedUrls({}); return; }
    let active = true;
    void Promise.all(images.map(async (image) => {
      const { data } = await client.storage.from("product-images").createSignedUrl(image.file_path, 3600);
      return [image.id, data?.signedUrl ?? ""] as const;
    })).then((entries) => { if (active) setSignedUrls(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [images]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const client = getSupabase(); const files = [...(event.target.files ?? [])]; if (!client || !files.length) return;
    setWorking(true); onMessage("");
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = await compressProductImage(files[index]);
        const { data: authorization, error: authorizationError } = await client.rpc("get_my_authorization");
        const organizationId = authorization && typeof authorization === "object" && !Array.isArray(authorization)
          ? String((authorization as Record<string, unknown>).organization_id ?? "")
          : "";
        if (authorizationError || !organizationId) throw new Error("无法确认当前组织，请重新登录后再试。");
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
        const path = `${organizationId}/products/${productId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage.from("product-images").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const first = images.length === 0 && index === 0;
        const { error: dbError } = await client.rpc("rpc_register_product_media", {
          p_product_id: productId,
          p_variant_id: null,
          p_storage_path: path,
          p_mime_type: file.type,
          p_file_size: file.size,
          p_media_type: first ? "MAIN" : "DETAIL",
          p_alt_text_zh: productName,
          p_is_primary: first,
        });
        if (dbError) { await client.storage.from("product-images").remove([path]); throw dbError; }
      }
      onMessage(`${files.length} 张图片上传成功`); onChanged();
    } catch (error) { onMessage(friendlyError(error, "图片上传失败，请重试。")); }
    finally { setWorking(false); event.target.value = ""; }
  }

  async function manage(imageId: string, action: "set_primary" | "move_up" | "move_down") {
    const client = getSupabase(); if (!client) return; setWorking(true);
    const { error } = await client.rpc("manage_product_image", { p_product_id: productId, p_image_id: imageId, p_action: action });
    onMessage(error ? friendlyError(error, "图片设置失败，请重试。") : "图片设置已更新"); setWorking(false); if (!error) onChanged();
  }

  async function remove(image: Image) {
    if (!confirm("确认移除这张商品图片？系统会保留审计记录。")) return;
    const client = getSupabase(); if (!client) return; setWorking(true);
    const { data: storedPath, error: databaseError } = await client.rpc("rpc_soft_delete_product_media", {
      p_product_id: productId,
      p_media_id: image.id,
    });
    if (databaseError) {
      onMessage(friendlyError(databaseError, "图片删除失败，请重试。"));
      setWorking(false);
      return;
    }
    const { error: storageError } = await client.storage.from("product-images").remove([storedPath || image.file_path]);
    onMessage(storageError ? "图片已从商品中移除，存储文件将进入清理队列。" : "图片已安全移除");
    setWorking(false);
    onChanged();
  }

  return <section className="form-card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><div><strong>商品图片</strong><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>手机可直接拍照；上传前自动压缩，支持 JPG / PNG / WEBP，单张最大 10MB。</div></div><label className="button primary">{working ? <LoaderCircle size={15}/> : <ImagePlus size={15}/>}拍照或上传<input className="sr-only" type="file" multiple capture="environment" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={upload}/></label></div>
    {images.length ? <div className="editor-image-grid">{images.map((image, index) => <div className="editor-image" key={image.id}>{signedUrls[image.id] ? <img src={signedUrls[image.id]} alt={productName}/> : <div className="muted" style={{ padding: 16 }}>正在加载预览…</div>}{image.is_primary && <span>主图</span>}<div style={{ position: "absolute", left: 7, bottom: 7, right: 7, display: "flex", gap: 5 }}><button className="icon-btn" disabled={working || index === 0} title="前移" onClick={() => manage(image.id, "move_up")}><ArrowUp size={13}/></button><button className="icon-btn" disabled={working || index === images.length - 1} title="后移" onClick={() => manage(image.id, "move_down")}><ArrowDown size={13}/></button><button className="icon-btn" disabled={working || image.is_primary} title="设为主图" onClick={() => manage(image.id, "set_primary")}><Star size={13}/></button><button className="icon-btn danger-icon" disabled={working} title="删除" onClick={() => remove(image)}><Trash2 size={13}/></button></div></div>)}</div> : <EmptyState title="还没有商品图片" description="至少上传一张主图和一张详情图后才能上架。"/>}
  </section>;
}
