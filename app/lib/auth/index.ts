// 統一された認証API
export { auth } from "./core";
export { createSupabaseClient, createSupabaseAdmin } from "./supabase";
export { SessionManager } from "./session";
export type { AuthUser, AuthSession, LoginCredentials, AuthResult, SessionData } from "./types";

// 便利な関数のエクスポート（auth をインポートしてから使用）
import { auth } from "./core";

export const requireAuth = auth.requireAuth.bind(auth);
export const getOptionalAuth = auth.getOptionalAuth.bind(auth);
export const signIn = auth.signIn.bind(auth);
export const signOut = auth.signOut.bind(auth);
export const validateAndRefreshSession = auth.validateAndRefreshSession.bind(auth);
export const ensureUserProfile = auth.ensureUserProfile.bind(auth);
export const createUserSession = auth.createUserSession.bind(auth);