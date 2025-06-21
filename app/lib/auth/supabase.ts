import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_CONFIG } from "./config";

// 統一されたSupabaseクライアント作成
export function createSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 管理者用Supabaseクライアント
export function createSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_CONFIG.SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin client");
  }

  return createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
