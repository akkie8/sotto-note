import { redirect } from "@remix-run/node";

import { ensureUserProfile } from "./ensure-profile.server";
import { getSupabase } from "./supabase.server";

export async function requireAuth(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    const authHeader = request.headers.get("authorization");

    // Authorizationヘッダーからトークンを抽出
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error) {
          console.error("[requireAuth] Token auth error:", error.message);
          throw redirect("/auth-error", {
            headers: response.headers,
          });
        }

        if (!user) {
          throw redirect("/auth-error", {
            headers: response.headers,
          });
        }

        return { user, headers: response.headers, supabase };
      } catch (tokenError) {
        console.error("[requireAuth] Token processing error:", tokenError);
        if (tokenError instanceof Response) {
          throw tokenError;
        }
        // Continue to cookie-based auth if token fails
      }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("[requireAuth] Auth error:", error.message);
      throw redirect("/auth-error", {
        headers: response.headers,
      });
    }

    if (!user) {
      throw redirect("/auth-error", {
        headers: response.headers,
      });
    }

    // プロフィールの存在を保証
    try {
      await ensureUserProfile(supabase, user);
    } catch (profileError) {
      console.error("[requireAuth] Profile creation error:", profileError);
      // プロフィール作成に失敗してもログインは継続
    }

    return { user, headers: response.headers, supabase };
  } catch (authError) {
    console.error("[requireAuth] Exception:", authError);
    if (authError instanceof Response) {
      throw authError; // Re-throw redirect responses
    }
    throw redirect("/auth-error", {
      headers: response.headers,
    });
  }
}

export async function getOptionalUser(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        // プロフィールの存在を保証
        try {
          await ensureUserProfile(supabase, user);
        } catch (profileError) {
          console.error(
            "[getOptionalUser] Profile creation error:",
            profileError
          );
        }
        return { user, headers: response.headers, supabase };
      }
    }

    // 通常のセッションチェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // プロフィールの存在を保証
      try {
        await ensureUserProfile(supabase, user);
      } catch (profileError) {
        console.error(
          "[getOptionalUser] Profile creation error:",
          profileError
        );
      }
    }

    return { user, headers: response.headers, supabase };
  } catch (error) {
    console.error("[getOptionalUser] Exception:", error);
    return { user: null, headers: response.headers, supabase };
  }
}
