"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";

export function useSupabaseQuery<T>(query: (client: NonNullable<ReturnType<typeof getSupabase>>) => PromiseLike<{data:T|null;error:unknown}>, initial:T) {
  const initialRef = useRef(initial);
  const requestIdRef = useRef(0);
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const client = getSupabase();
    if (!client) {
      if (requestId === requestIdRef.current) {
        setError("请先配置 Supabase 环境变量。");
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await query(client);
      if (requestId !== requestIdRef.current) return;
      if (result.error) setError(friendlyError(result.error, "读取数据失败，请稍后重试。"));
      else setData(result.data ?? initialRef.current);
    } catch (queryError) {
      if (requestId === requestIdRef.current) setError(friendlyError(queryError, "读取数据失败，请稍后重试。"));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void run();
    return () => { requestIdRef.current += 1; };
  }, [run]);

  return { data, loading, error, refresh: run };
}
