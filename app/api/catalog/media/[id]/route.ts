import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StoredMedia = { id: string; product_id: string; file_path: string; deleted_at?: string | null };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  try {
    const client = createSupabaseAdminClient();
    const { data: rawMedia, error: mediaError } = await client.from("product_images").select("*").eq("id", id).maybeSingle();
    const media = rawMedia as unknown as StoredMedia | null;
    if (mediaError || !media || media.deleted_at) return new NextResponse("Not found", { status: 404 });

    const { data: publication } = await client.from("product_publications")
      .select("channel_id").eq("product_id", media.product_id).eq("status", "published").limit(1).maybeSingle();
    if (!publication) return new NextResponse("Not found", { status: 404 });
    const { data: channel } = await client.from("channels")
      .select("id").eq("id", publication.channel_id).eq("is_active", true).maybeSingle();
    if (!channel) return new NextResponse("Not found", { status: 404 });

    const { data: signed, error: signedError } = await client.storage.from("product-images").createSignedUrl(media.file_path, 300);
    if (signedError || !signed?.signedUrl) return new NextResponse("Media unavailable", { status: 503 });
    const response = NextResponse.redirect(signed.signedUrl, 302);
    response.headers.set("Cache-Control", "public, max-age=240, stale-while-revalidate=60");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch {
    return new NextResponse("Media unavailable", { status: 503 });
  }
}
