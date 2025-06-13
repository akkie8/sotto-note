import { useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { supabase } from "~/lib/supabase.client";
import { Loading } from "~/components/Loading";

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
        // URLのハッシュフラグメントまたはクエリパラメータを処理
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

    // Supabaseが自動的にセッションを処理するまで少し待つ
    const timer = setTimeout(handleAuthCallback, 1000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-wellness-surface/30 flex items-center justify-center">
      <div className="text-center">
        <Loading />
        <p className="mt-4 text-wellness-textLight">
          認証処理中です...
        </p>
      </div>
    </div>
  );
}