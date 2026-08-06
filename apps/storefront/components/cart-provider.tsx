"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type BagItem = { variantId: string; slug: string; title: string; image: string | null; color: string; size: string; unitPrice: number; quantity: number };
type CartContextValue = { items: BagItem[]; count: number; subtotal: number; addItem: (item: BagItem) => void; updateQuantity: (variantId: string, quantity: number) => void; removeItem: (variantId: string) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nexora-studio-bag";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [ready, setReady] = useState(false);
  const syncedUser = useRef<string | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved) as BagItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, ready]);
  useEffect(() => {
    if (!ready || syncedUser.current) return;
    const client = getSupabase();
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user || syncedUser.current === data.user.id) return;
      syncedUser.current = data.user.id;
      await client.rpc("rpc_merge_customer_cart", {
        p_items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
        p_request_id: crypto.randomUUID(),
      });
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) syncedUser.current = null;
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [items, ready]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    addItem: (next) => setItems((current) => { const existing = current.find((item) => item.variantId === next.variantId); return existing ? current.map((item) => item.variantId === next.variantId ? { ...item, quantity: Math.min(10, item.quantity + next.quantity) } : item) : [...current, next]; }),
    updateQuantity: (variantId, quantity) => setItems((current) => current.map((item) => item.variantId === variantId ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item)),
    removeItem: (variantId) => setItems((current) => current.filter((item) => item.variantId !== variantId)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used inside CartProvider"); return context; }
