/* Signed Storage URLs are tenant-specific and expire automatically. */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export function SecureProductImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const client = getSupabase();
    if (!client || !path) return;
    let active = true;
    void client.storage.from("product-images").createSignedUrl(path, 3600)
      .then(({ data }) => { if (active) setUrl(data?.signedUrl ?? ""); });
    return () => { active = false; };
  }, [path]);

  if (!url) return <div className="empty-icon" style={{ width: 42, height: 42, margin: 0 }}>—</div>;
  return <img src={url} alt={alt} style={{ width: 42, height: 52, objectFit: "cover", borderRadius: 7 }}/>
}
