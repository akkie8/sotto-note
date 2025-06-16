import { redirect } from "@remix-run/node";
import { createSupabaseClient } from "./supabase";
import { SessionManager } from "./session";
import { AUTH_CONFIG } from "./config";
import type { AuthSession, AuthUser, LoginCredentials, AuthResult } from "./types";

export class AuthCore {
  private static instance: AuthCore;

  static getInstance(): AuthCore {
    if (!AuthCore.instance) {
      AuthCore.instance = new AuthCore();
    }
    return AuthCore.instance;
  }

  // JWT期限チェック
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp - AUTH_CONFIG.TOKEN_REFRESH_BUFFER < currentTime;
    } catch {
      return true;
    }
  }

  // トークンリフレッシュ
  private async refreshTokens(refreshToken: string): Promise<AuthSession | null> {
    const supabase = createSupabaseClient();

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        console.error("[Auth] Refresh failed:", error?.message);
        return null;
      }

      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
        user: data.session.user,
      };
    } catch (error) {
      console.error("[Auth] Refresh exception:", error);
      return null;
    }
  }

  // セッション検証とリフレッシュ（設計書に沿った実装）
  async validateAndRefreshSession(request: Request): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    headers: Record<string, string> | null;
    supabase: ReturnType<typeof createSupabaseClient>;
  }> {
    const sessionData = await SessionManager.getSessionData(request);

    if (!sessionData || !sessionData.refresh_token) {
      return {
        user: null,
        session: null,
        headers: null,
        supabase: createSupabaseClient(),
      };
    }

    // 設計書に従い、常にRefresh Tokenを使って新しいAccess Tokenを取得
    console.log("[Auth] Refreshing tokens from session");
    const newSession = await this.refreshTokens(sessionData.refresh_token);

    if (!newSession) {
      // リフレッシュ失敗 - セッションをクリア
      console.log("[Auth] Token refresh failed, clearing session");
      return {
        user: null,
        session: null,
        headers: {
          "Set-Cookie": await SessionManager.destroySession(request),
        },
        supabase: createSupabaseClient(),
      };
    }

    console.log("[Auth] Token refresh successful", {
      hasUser: !!newSession.user,
      userId: newSession.user?.id,
      userEmail: newSession.user?.email
    });

    // 新しいセッション情報で更新
    return {
      user: newSession.user,
      session: newSession,
      headers: {
        "Set-Cookie": await SessionManager.updateSession(request, newSession),
      },
      supabase: createSupabaseClient(newSession.access_token),
    };
  }

  // 認証が必要なページ用
  async requireAuth(request: Request) {
    try {
      const result = await this.validateAndRefreshSession(request);

      if (!result.user) {
        throw redirect("/login", {
          headers: result.headers || {},
        });
      }

      return {
        user: result.user,
        session: result.session!,
        supabase: result.supabase,
        headers: result.headers,
      };
    } catch (error) {
      console.error("[Auth] requireAuth error:", error);
      if (error instanceof Response) {
        throw error;
      }
      throw redirect("/login");
    }
  }

  // 認証が任意のページ用
  async getOptionalAuth(request: Request) {
    return await this.validateAndRefreshSession(request);
  }

  // ログイン処理（新規登録も含む）
  async signIn(credentials: LoginCredentials): Promise<AuthResult> {
    console.log(`[AuthCore] ログイン試行開始: ${credentials.email}`);
    const supabase = createSupabaseClient();

    try {
      // まずログインを試行
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      // ログイン成功の場合
      if (!signInError && signInData.user && signInData.session) {
        console.log(`[AuthCore] ログイン成功:`, {
          userId: signInData.user.id,
          email: signInData.user.email,
        });

        const authSession: AuthSession = {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at || 0,
          user: signInData.user,
        };

        return { user: signInData.user, session: authSession, error: null };
      }

      // ログイン失敗の場合、新規登録を試行
      if (signInError?.message === "Invalid login credentials") {
        console.log(`[AuthCore] ログイン失敗、新規登録を試行: ${credentials.email}`);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            emailRedirectTo: undefined, // メール確認を無効化
          }
        });

        if (signUpError) {
          console.error(`[AuthCore] 新規登録エラー:`, {
            message: signUpError.message,
            status: signUpError.status,
            name: signUpError.name,
            email: credentials.email
          });
          return { user: null, session: null, error: signUpError.message };
        }

        if (!signUpData.user || !signUpData.session) {
          console.error(`[AuthCore] 新規登録データ不整合:`, {
            hasUser: !!signUpData.user,
            hasSession: !!signUpData.session,
            email: credentials.email
          });
          return { user: null, session: null, error: "新規登録に失敗しました" };
        }

        console.log(`[AuthCore] 新規登録成功:`, {
          userId: signUpData.user.id,
          email: signUpData.user.email,
          hasAccessToken: !!signUpData.session.access_token,
          hasRefreshToken: !!signUpData.session.refresh_token
        });

        const authSession: AuthSession = {
          access_token: signUpData.session.access_token,
          refresh_token: signUpData.session.refresh_token,
          expires_at: signUpData.session.expires_at || 0,
          user: signUpData.user,
        };

        return { user: signUpData.user, session: authSession, error: null };
      }

      // その他のログインエラー
      console.error(`[AuthCore] Supabase認証エラー:`, {
        message: signInError?.message,
        status: signInError?.status,
        name: signInError?.name,
        email: credentials.email
      });
      return { user: null, session: null, error: signInError?.message || "認証に失敗しました" };

    } catch (exception) {
      console.error(`[AuthCore] 認証処理で例外発生:`, {
        error: exception,
        message: exception instanceof Error ? exception.message : "Unknown exception",
        email: credentials.email
      });
      return { user: null, session: null, error: "認証処理中に例外が発生しました" };
    }
  }

  // ログアウト処理
  async signOut(request: Request): Promise<never> {
    const sessionData = await SessionManager.getSessionData(request);

    // Supabaseからもサインアウト
    if (sessionData?.access_token) {
      const supabase = createSupabaseClient(sessionData.access_token);
      await supabase.auth.signOut();
    }

    throw redirect("/login", {
      headers: {
        "Set-Cookie": await SessionManager.destroySession(request),
      },
    });
  }

  // プロフィール作成/更新
  async ensureUserProfile(user: AuthUser, accessToken: string): Promise<void> {
    const supabase = createSupabaseClient(accessToken);

    try {
      const { error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        // プロフィールが存在しない場合は作成
        const profileData = {
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "",
          role: "free", // デフォルトロール
        };
        
        console.log(`[Auth] Creating profile:`, profileData);
        
        const { error: insertError } = await supabase.from("profiles").insert(profileData);

        if (insertError) {
          console.error("[Auth] Profile creation error:", insertError);
          throw new Error("プロフィール作成に失敗しました");
        }
      } else if (fetchError) {
        console.error("[Auth] Profile fetch error:", fetchError);
        throw new Error("プロフィール取得に失敗しました");
      }
    } catch (error) {
      console.error("[Auth] Profile check error:", error);
      throw error;
    }
  }

  // セッション作成とリダイレクト
  async createUserSession(
    authSession: AuthSession,
    redirectTo: string = "/dashboard"
  ): Promise<never> {
    const cookie = await SessionManager.createSession(authSession);

    throw redirect(redirectTo, {
      headers: {
        "Set-Cookie": cookie,
      },
    });
  }
}

// シングルトンインスタンスをエクスポート
export const auth = AuthCore.getInstance();