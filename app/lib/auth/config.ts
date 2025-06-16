export const AUTH_CONFIG = {
  SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30日（秒）
  TOKEN_REFRESH_BUFFER: 300, // 5分（秒）
  REFRESH_CHECK_INTERVAL: 30 * 60 * 1000, // 30分（ミリ秒）
  COOKIE_NAME: "__session",
} as const;

export const SUPABASE_CONFIG = {
  URL: process.env.VITE_SUPABASE_URL!,
  ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY!,
  SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
} as const;

if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
  throw new Error("Missing required Supabase environment variables");
}