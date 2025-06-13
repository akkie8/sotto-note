import { useEffect, useState } from "react";
import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { Loading } from "~/components/Loading";
import { getOptionalUser } from "~/lib/auth.server";
import { supabase } from "../lib/supabase.client";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);

  // 既にログイン済みならダッシュボードにリダイレクト
  if (user) {
    throw redirect("/dashboard");
  }

  return null;
}

export const meta: MetaFunction = () => {
  return [
    { title: "ログイン - そっとノート" },
    {
      name: "description",
      content: "そっとノートにログインして、心の記録を始めましょう。",
    },
  ];
};

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // 認証状態を監視
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();

        if (clientUser) {
          setUser(clientUser);
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    try {
      console.log(
        "[Login] Redirect URL:",
        window.location.origin + "/auth/callback"
      );
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (error) {
        console.error("[Login] handleLogin error:", error);
        toast.error("ログインに失敗しました");
        setLoading(false);
      }
    } catch (e) {
      console.error("[Login] handleLogin error:", e);
      toast.error("ログインに失敗しました");
      setLoading(false);
    }
  };

  if (user) {
    return <Loading fullScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-wellness-surface/30">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* ログインフォーム */}
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-2xl font-bold text-wellness-primary">
                そっとノート
              </h1>
              <h2 className="mb-2 text-lg font-semibold text-wellness-text">
                ログイン
              </h2>
              <p className="text-sm text-wellness-textLight">
                Googleアカウントでログインできます
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wellness-primary px-4 py-3 font-medium text-white transition-all hover:bg-wellness-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>ログイン中...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Googleでログイン</span>
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs text-wellness-textLight">
                ログインすることで、
                <Link
                  to="/terms"
                  className="text-wellness-primary hover:underline"
                >
                  利用規約
                </Link>
                および
                <Link
                  to="/privacy"
                  className="text-wellness-primary hover:underline"
                >
                  プライバシーポリシー
                </Link>
                に同意したものとみなします。
              </p>
            </div>
          </div>

          {/* 新規登録案内 */}
          <div className="mt-6 rounded-xl bg-wellness-primary/10 p-4 text-center">
            <p className="text-sm text-wellness-primary">
              <strong>初回ログイン時に自動でアカウントが作成されます</strong>
              <br />
              面倒な登録手続きは一切不要です
            </p>
          </div>

          {/* ホームに戻るリンク */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-wellness-textLight transition-colors hover:text-wellness-primary"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
