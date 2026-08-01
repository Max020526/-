import assert from "node:assert/strict";
import test from "node:test";
import { getPublicSupabaseConfig } from "../lib/supabase/config.ts";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test.afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

test("accepts hosted and local Supabase endpoints", () => {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  assert.deepEqual(getPublicSupabaseConfig(), {
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  assert.equal(getPublicSupabaseConfig()?.url, "http://127.0.0.1:54321");
});

test("rejects missing or insecure public Supabase configuration", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  assert.equal(getPublicSupabaseConfig(), null);

  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.com";
  assert.equal(getPublicSupabaseConfig(), null);
});
