import { useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";

import { Loading } from "~/components/Loading";
import { supabase } from "~/lib/supabase.client";

export async function loader({ request }: LoaderFunctionArgs) {
  // サーバーサイドではURLパラメータをチェックしてエラーがあればauth-errorにリダイレクト
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    throw redirect(`/auth-error?error=${error}`);
  }

  // 正常なコールバックの場合はクライアントサイドで処理
  return null;
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // まず現在のURLから認証情報を取得して処理
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // トークンがある場合はセッションを設定
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[AuthCallback] Session set error:", sessionError);
            navigate("/auth-error?error=" + encodeURIComponent(sessionError.message));
            return;
          }

          if (sessionData.session?.user) {
            console.log("[AuthCallback] Authentication successful");
            // 認証成功時はダッシュボードにリダイレクト
            navigate("/dashboard");
            return;
          }
        }

        // トークンがない場合は既存のセッションを確認
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthCallback] Session error:", error);
          navigate("/auth-error?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data.session?.user) {
          console.log("[AuthCallback] Authentication successful");
          // 認証成功時はダッシュボードにリダイレクト
          navigate("/dashboard");
        } else {
          console.log("[AuthCallback] No session found, redirecting to login");
          navigate("/login");
        }
      } catch (authError) {
        console.error("[AuthCallback] Exception:", authError);
        navigate("/auth-error?error=callback_processing_failed");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-wellness-surface/30">
      <div className="text-center">
        <Loading />
        <p className="mt-4 text-wellness-textLight">認証処理中です...</p>
      </div>
    </div>
  );
}
