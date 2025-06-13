import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { supabase } from "~/lib/supabase.client";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  return Response.json({ error });
}

export const meta: MetaFunction = () => {
  return [
    { title: "認証エラー - そっとノート" },
    {
      name: "description",
      content: "認証に問題が発生しました。再度ログインしてください。",
    },
    {
      name: "robots",
      content: "noindex,nofollow",
    },
  ];
};

export default function AuthError() {
  const { error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const isAccessDenied = error === "access_denied";

  // 認証エラーの場合、自動的にログアウト処理を実行
  useEffect(() => {
    const handleLogout = async () => {
      try {
        // 現在のセッション状態を確認
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
          console.log("Logged out due to authentication error");
        }
      } catch (logoutError) {
        console.error("Error during logout:", logoutError);
      }
    };
    
    // アクセス拒否以外の場合のみログアウト
    if (!isAccessDenied) {
      handleLogout();
    }
  }, [isAccessDenied]);

  const handleReturnHome = async () => {
    // 確実にログアウトしてからホームに戻る
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      console.error("Error during logout:", logoutError);
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-wellness-surface/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-soft text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-text">
            {isAccessDenied ? "ログインがキャンセルされました" : "認証エラー"}
          </h1>
          
          <div className="mb-6">
            {isAccessDenied ? (
              <>
                <p className="mb-4 text-wellness-textLight">
                  ログインがキャンセルされました。
                </p>
                <p className="text-wellness-textLight">
                  ログインして頂くとサービスをご利用いただけます。
                </p>
              </>
            ) : (
              <>
                <p className="mb-4 text-wellness-textLight">
                  セッションの有効期限が切れているか、認証に問題が発生しました。
                </p>
                <p className="text-wellness-textLight">
                  自動的にログアウトしました。再度ログインしてください。
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReturnHome}
              className="w-full rounded-xl bg-wellness-primary px-6 py-3 font-medium text-white transition-all hover:bg-wellness-secondary"
            >
              ホームに戻る
            </button>
            
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl border border-wellness-primary bg-white px-6 py-3 font-medium text-wellness-primary transition-all hover:bg-wellness-surface"
            >
              ログインページへ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}