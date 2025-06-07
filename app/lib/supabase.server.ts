import { createServerClient } from "@supabase/auth-helpers-remix";

export function getSupabase(request: Request, response: Response) {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { request, response }
  );
}