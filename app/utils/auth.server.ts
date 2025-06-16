import { redirect } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

import { commitSession, destroySession, getSession } from "./session.server";

// Supabaseクライアント（サーバーサイド用）
function createSupabaseServerClient(accessToken?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// サービスロール用Supabaseクライアント
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// JWT期限チェック
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    // 5分のバッファを持たせて期限チェック
    return payload.exp - 300 < currentTime;
  } catch {
    return true;
  }
}

// トークンリフレッシュ
async function refreshTokens(refreshToken: string) {
  const supabase = createSupabaseServerClient();

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("[Auth] Refresh token error:", error.message);
      return null;
    }

    return data.session;
  } catch (error) {
    console.error("[Auth] Refresh token exception:", error);
    return null;
  }
}

// セッション検証とリフレッシュ
export async function validateAndRefreshSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);

  const accessToken = session.get("access_token");
  const refreshToken = session.get("refresh_token");
  const userId = session.get("user_id");

  // セッションが存在しない場合
  if (!accessToken || !refreshToken || !userId) {
    return {
      user: null,
      session: null,
      headers: null,
      supabase: createSupabaseServerClient(),
    };
  }

  // トークンが期限切れかチェック
  if (isTokenExpired(accessToken)) {
    console.log("[Auth] Token expired, attempting refresh...");

    // リフレッシュトークンで新しいセッションを取得
    const newSession = await refreshTokens(refreshToken);

    if (!newSession) {
      // リフレッシュ失敗 - セッションをクリア
      console.log("[Auth] Refresh failed, clearing session");
      return {
        user: null,
        session: null,
        headers: {
          "Set-Cookie": await destroySession(session),
        },
        supabase: createSupabaseServerClient(),
      };
    }

    // 新しいセッション情報で更新
    session.set("access_token", newSession.access_token);
    session.set("refresh_token", newSession.refresh_token);
    session.set("user_id", newSession.user.id);
    session.set("user_email", newSession.user.email);

    console.log("[Auth] Token refreshed successfully");

    return {
      user: newSession.user,
      session: newSession,
      headers: {
        "Set-Cookie": await commitSession(session),
      },
      supabase: createSupabaseServerClient(newSession.access_token),
    };
  }

  // トークンが有効な場合
  const supabase = createSupabaseServerClient(accessToken);

  // ユーザー情報を再構築
  const user = {
    id: userId,
    email: session.get("user_email"),
  };

  return {
    user,
    session: { access_token: accessToken, refresh_token: refreshToken },
    headers: null,
    supabase,
  };
}

// 認証が必要なページ用
export async function requireAuth(request: Request) {
  const result = await validateAndRefreshSession(request);

  if (!result.user) {
    throw redirect("/login", {
      headers: result.headers || {},
    });
  }

  return {
    user: result.user,
    session: result.session,
    supabase: result.supabase,
    headers: result.headers,
  };
}

// 認証が任意のページ用
export async function getOptionalAuth(request: Request) {
  const result = await validateAndRefreshSession(request);

  return {
    user: result.user,
    session: result.session,
    supabase: result.supabase,
    headers: result.headers,
  };
}

// ログイン処理
export async function signIn(email: string, password: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return { user: data.user, session: data.session, error: null };
}

// セッション作成
export async function createUserSession(
  user: any,
  session: any,
  redirectTo: string = "/dashboard"
) {
  const cookieSession = await getSession();

  cookieSession.set("access_token", session.access_token);
  cookieSession.set("refresh_token", session.refresh_token);
  cookieSession.set("user_id", user.id);
  cookieSession.set("user_email", user.email);

  throw redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(cookieSession),
    },
  });
}

// ログアウト処理
export async function signOut(request: Request) {
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);

  // Supabaseからもサインアウト
  const accessToken = session.get("access_token");
  if (accessToken) {
    const supabase = createSupabaseServerClient(accessToken);
    await supabase.auth.signOut();
  }

  throw redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

// プロフィール作成/更新
export async function ensureUserProfile(supabase: any, user: any) {
  try {
    // プロフィールの存在確認
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      // プロフィールが存在しない場合は作成
      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("[Auth] Profile creation error:", insertError);
        throw new Error("Failed to create user profile");
      }

      console.log("[Auth] User profile created successfully");
      return;
    }

    if (fetchError) {
      console.error("[Auth] Profile fetch error:", fetchError);
      throw new Error("Failed to fetch user profile");
    }

    // プロフィールが存在する場合は何もしない
    console.log("[Auth] User profile exists");
  } catch (error) {
    console.error("[Auth] Profile check error:", error);
    throw error;
  }
}