// 新しい認証システムを使用
import { auth, createSupabaseAdmin, createSupabaseClient } from "~/lib/auth";

// 後方互換性のためのエクスポート
export const requireAuth = async (request: Request) => {
  return await auth.requireAuth(request);
};

export const getOptionalAuth = async (request: Request) => {
  return await auth.getOptionalAuth(request);
};

export const signIn = async (credentials: {
  email: string;
  password: string;
}) => {
  return await auth.signIn(credentials);
};

export const signOut = async (request: Request) => {
  return await auth.signOut(request);
};

export const validateAndRefreshSession = async (request: Request) => {
  return await auth.validateAndRefreshSession(request);
};

export const ensureUserProfile = async (
  user: { id: string; email?: string; user_metadata?: { name?: string } },
  accessToken: string
) => {
  return await auth.ensureUserProfile(user, accessToken);
};

export const createUserSession = async (
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: { id: string; email?: string };
  },
  redirectTo?: string
) => {
  return await auth.createUserSession(session, redirectTo);
};

// 古い関数名との互換性を保持
export const createSupabaseServerClient = createSupabaseClient;
export { createSupabaseAdmin };
