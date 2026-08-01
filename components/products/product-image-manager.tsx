/* Upload previews include local object URLs and dynamic storage URLs. */
/* eslint-disable @next/next/no-img-element */
"use client";

import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { compressProductImage } from "@/lib/images/compress";
import { getSupabase } from "@/lib/supabase/client";

type Image = { id: string; file_path: string; public_url: string; is_primary: boolean; sort_order: number };

export function ProductImageManager({ productId, productName, images, onChanged, onMessage }: { productId: string; productName: string; images: Image[]; onChanged: () => void; onMessage: (message: string) => void }) {
  const [working, setWorking] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const client = getSupabase(); const files = [...(event.target.files ?? [])]; if (!client || !files.length) return;
    setWorking(true); onMessage("");
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = await compressProductImage(files[index]);
        const path = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${file.name.split(".").pop()}`;
        const { error } = await client.storage.from("product-images").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: url } = client.storage.from("product-images").getPublicUrl(path);
        const first = images.length === 0 && index === 0;
        const { error: dbError } = await client.from("product_images").insert({ product_id: productId, file_path: path, public_url: url.publicUrl, image_type: first ? "MAIN" : "DETAIL", sort_order: images.length + index, is_primary: first });
        if (dbError) { await client.storage.from("product-images").remove([path]); throw dbError; }
      }
      onMessage(`${files.length} 张图片上传成功`); onChanged();
    } catch (error) { onMessage(error instanceof Error ? error.message : "图片上传失败，请重试。"); }
    finally { setWorking(false); event.target.value = ""; }
  }

  async function manage(imageId: string, action: "set_primary" | "move_up" | "move_down") {
    const client = getSupabase(); if (!client) return; setWorking(true);
    const { error } = await client.rpc("manage_product_image", { p_product_id: productId, p_image_id: imageId, p_action: action });
    onMessage(error?.message ?? "图片设置已更新"); setWorking(false); if (!error) onChanged();
  }

  async function remove(image: Image) {
    if (!confirm("确认删除这张商品图片？删除后无法恢复。")) return;
    const client = getSupabase(); if (!client) return; setWorking(true);
    const { error } = await client.storage.from("product-images").remove([image.file_path]);
    if (!error) await client.from("product_images").delete().eq("id", image.id);
    onMessage(error?.message ?? "图片已删除"); setWorking(false); if (!error) onChanged();
  }

  return <section className="form-card"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><div><strong>商品图片</strong><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>手机可直接拍照；上传前自动压缩，支持 JPG / PNG / WEBP，单张最大 10MB。</div></div><label className="button primary">{working ? <LoaderCircle size={15}/> : <ImagePlus size={15}/>}拍照或上传<input className="sr-only" type="file" multiple capture="environment" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={upload}/></label></div>
    {images.length ? <div className="editor-image-grid">{images.map((image, index) => <div className="editor-image" key={image.id}><img src={image.public_url} alt={productName}/>{image.is_primary && <span>主图</span>}<div style={{ position: "absolute", left: 7, bottom: 7, right: 7, display: "flex", gap: 5 }}><button className="icon-btn" disabled={working || index === 0} title="前移" onClick={() => manage(image.id, "move_up")}><ArrowUp size={13}/></button><button className="icon-btn" disabled={working || index === images.length - 1} title="后移" onClick={() => manage(image.id, "move_down")}><ArrowDown size={13}/></button><button className="icon-btn" disabled={working || image.is_primary} title="设为主图" onClick={() => manage(image.id, "set_primary")}><Star size={13}/></button><button className="icon-btn danger-icon" disabled={working} title="删除" onClick={() => remove(image)}><Trash2 size={13}/></button></div></div>)}</div> : <EmptyState title="还没有商品图片" description="至少上传一张主图和一张详情图后才能上架。"/>}
  </section>;
}
