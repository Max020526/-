"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export function useSupabaseQuery<T>(query: (client: NonNullable<ReturnType<typeof getSupabase>>) => PromiseLike<{data:T|null;error:unknown}>, initial:T) {
  const [data,setData]=useState<T>(initial); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  const run=useCallback(async()=>{ const client=getSupabase(); if(!client){setLoading(false);return;} setLoading(true); const result=await query(client); if(result.error)setError(result.error instanceof Error?result.error.message:"读取数据失败"); else setData(result.data??initial); setLoading(false); },[query,initial]);
  useEffect(()=>{void run();},[run]); return {data,loading,error,refresh:run};
}
