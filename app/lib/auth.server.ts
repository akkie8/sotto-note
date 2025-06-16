import { redirect } from "@remix-run/node";

import { ensureUserProfile } from "./ensure-profile.server";
import { getSupabase } from "./supabase.server";

export async function requireAuth(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    // まずセッションを取得
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[requireAuth] Session error:", sessionError.message);
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    if (!session) {
      console.error("[requireAuth] Auth session missing!");
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    // セッションからユーザー情報を取得
    const user = session.user;

    if (!user) {
      throw redirect("/login", {
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
    throw redirect("/login", {
      headers: response.headers,
    });
  }
}

export async function getOptionalUser(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    // セッションを取得
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user || null;

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
