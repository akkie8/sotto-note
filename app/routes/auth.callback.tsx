import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";

import { Loading } from "~/components/Loading";
import { auth, createSupabaseClient } from "~/lib/auth";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    throw redirect(`/auth-error?error=${error}`);
  }

  // コードパラメータがある場合（サーバーサイドで処理）
  const code = url.searchParams.get("code");

  if (code) {
    try {
      const supabase = createSupabaseClient();

      // 認証コードをセッションに交換
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[AuthCallback] Code exchange error:", exchangeError);
        throw redirect(
          `/auth-error?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      if (data.session && data.user) {
        const authSession = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
          user: data.user,
        };

        // プロフィール作成/確認
        await auth.ensureUserProfile(data.user, data.session.access_token);

        // セッション作成とリダイレクト
        const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";
        return await auth.createUserSession(authSession, redirectTo);
      }
    } catch (error) {
      console.error("[AuthCallback] Server processing error:", error);
      throw redirect("/auth-error?error=callback_processing_failed");
    }
  }

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const accessToken = formData.get("access_token") as string;
  const refreshToken = formData.get("refresh_token") as string;
  const action = formData.get("action") as string;

  if (action === "create_session" && accessToken && refreshToken) {
    try {
      const supabase = createSupabaseClient(accessToken);

      // ユーザー情報を取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        return json(
          { success: false, error: "Failed to get user" },
          { status: 401 }
        );
      }

      const authSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: 0, // クライアントサイドコールバックでは不明
        user,
      };

      // プロフィール作成/確認
      await auth.ensureUserProfile(user, accessToken);

      // セッション作成
      const url = new URL(request.url);
      const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";
      return await auth.createUserSession(authSession, redirectTo);
    } catch (error) {
      console.error("[AuthCallback] Action error:", error);
      return json(
        { success: false, error: "Session creation failed" },
        { status: 500 }
      );
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLハッシュからアクセストークンを取得（クライアントサイド認証用）
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          console.log("[AuthCallback] Processing tokens from hash...");

          // サーバーサイドでセッション作成
          fetcher.submit(
            {
              access_token: accessToken,
              refresh_token: refreshToken,
              action: "create_session",
            },
            {
              method: "POST",
              action: "/auth/callback",
            }
          );
          return;
        }

        // トークンがない場合は認証失敗
        console.log("[AuthCallback] No tokens found, redirecting to login");
        navigate("/login");
      } catch (error) {
        console.error("[AuthCallback] Exception:", error);
        navigate("/auth-error?error=callback_processing_failed");
      }
    };

    handleAuthCallback();
  }, [navigate, fetcher]);

  // フェッチャーの結果を監視
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as { success?: boolean; error?: string };
      if (data.success) {
        navigate("/dashboard");
      } else {
        navigate(
          `/auth-error?error=${encodeURIComponent(data.error || "unknown_error")}`
        );
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-wellness-surface/30">
      <div className="text-center">
        <Loading />
        <p className="mt-4 text-wellness-textLight">認証処理中です...</p>
      </div>
    </div>
  );
}
