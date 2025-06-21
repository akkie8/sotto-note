import { supabase } from "~/lib/supabase.client";

/**
 * Supabaseクライアントを提供するフック
 * 将来的にコンテキストやプロバイダーに移行する場合の拡張性を考慮
 */
export function useSupabase() {
  return { supabase };
}
