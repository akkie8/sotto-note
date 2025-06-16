import { useEffect, useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation, Link, useNavigate } from "@remix-run/react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { Loading } from "~/components/Loading";
import { signIn, createUserSession, getOptionalAuth, ensureUserProfile, createSupabaseServerClient } from "~/utils/auth.server";
import { supabase } from "~/lib/supabase.client";

export async function loader({ request }: LoaderFunctionArgs) {
  // 既にログインしている場合はダッシュボードにリダイレクト
  const { user, headers } = await getOptionalAuth(request);
  
  if (user) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        ...(headers || {}),
      },
    });
  }

  return json({}, { 
    headers: headers || {} 
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";

  if (!email || !password) {
    return json(
      { error: "メールアドレスとパスワードを入力してください" },
      { status: 400 }
    );
  }

  try {
    // サインイン処理
    const { user, session, error } = await signIn(email, password);

    if (error) {
      return json({ error }, { status: 401 });
    }

    if (!user || !session) {
      return json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // プロフィール作成/確認
    const supabase = createSupabaseServerClient(session.access_token);
    await ensureUserProfile(supabase, user);

    // セッション作成とリダイレクト
    return await createUserSession(user, session, redirectTo);
  } catch (error) {
    console.error("[Login] Error:", error);
    return json(
      { error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // 認証状態の変更のみを監視（初期チェックはloaderで実施済み）
  useEffect(() => {
    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        // ログイン成功時のみリダイレクト
        if (!loading) {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loading]);

  const handleGoogleLogin = async () => {
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
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("[Login] handleGoogleLogin error:", error);
        toast.error("ログインに失敗しました");
        setLoading(false);
      }
    } catch (e) {
      console.error("[Login] handleGoogleLogin error:", e);
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
          {/* メインログインフォーム */}
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-2xl font-bold text-wellness-primary">
                そっとノート
              </h1>
              <h2 className="mb-2 text-lg font-semibold text-wellness-text">
                ログイン
              </h2>
              <p className="text-sm text-wellness-textLight">
                心の記録を続けましょう
              </p>
            </div>

            {/* Google ログイン */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || isSubmitting}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-wellness-primary px-4 py-3 font-medium text-white transition-all hover:bg-wellness-secondary disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="mb-4 flex items-center">
              <div className="flex-1 border-t border-wellness-primary/20"></div>
              <span className="px-3 text-sm text-wellness-textLight">または</span>
              <div className="flex-1 border-t border-wellness-primary/20"></div>
            </div>

            {/* メール/パスワード ログイン */}
            <Form method="post" className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-wellness-text"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-wellness-primary/20 px-3 py-2 text-wellness-text placeholder-wellness-textLight focus:border-wellness-primary focus:outline-none focus:ring-1 focus:ring-wellness-primary"
                  placeholder="your@email.com"
                  disabled={isSubmitting || loading}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-wellness-text"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full rounded-lg border border-wellness-primary/20 px-3 py-2 text-wellness-text placeholder-wellness-textLight focus:border-wellness-primary focus:outline-none focus:ring-1 focus:ring-wellness-primary"
                  disabled={isSubmitting || loading}
                />
              </div>

              {actionData?.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {actionData.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full rounded-lg bg-wellness-secondary px-4 py-2 text-white transition-colors hover:bg-wellness-tertiary disabled:opacity-50"
              >
                {isSubmitting ? "ログイン中..." : "メールでログイン"}
              </button>
            </Form>

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