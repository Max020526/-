"use client";
import { useEffect, useState } from "react";
import { InventoryCenter } from "@/components/shared/inventory-center";
import { getSupabase } from "@/lib/supabase/client";
export default function InventoryPage() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => { void (async () => { const client = getSupabase(); if (!client) return; const { data: auth } = await client.auth.getUser(); if (!auth.user) return; const { data } = await client.from("profiles").select("role").eq("id", auth.user.id).maybeSingle(); setAdmin(data?.role === "admin"); })(); }, []);
  return <InventoryCenter mode={admin ? "admin" : "warehouse"}/>;
}
