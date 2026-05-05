import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** 브라우저용 Supabase 클라이언트(익명 읽기 전제). */
export const createSupabaseBrowserClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
};
