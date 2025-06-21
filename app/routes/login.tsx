import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";

import { auth } from "~/lib/auth";

export async function loader({ request }: LoaderFunctionArgs) {
  // 既にログインしている場合はダッシュボードにリダイレクト
  const { user, headers } = await auth.getOptionalAuth(request);

  if (user) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        ...(headers || {}),
      },
    });
  }

  return json({}, { headers: headers || {} });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email || !password) {
    return json(
      { error: "メールアドレスとパスワードを入力してください" },
      { status: 400 }
    );
  }

  try {
    console.log(`[Login] 認証開始: ${email}`);

    // サインイン処理
    const { user, session, error } = await auth.signIn({ email, password });

    if (error) {
      console.error(`[Login] 認証エラー: ${error}`);

      // Supabaseエラーメッセージを日本語に変換
      let japaneseError = error;
      if (error.includes("Invalid login credentials")) {
        japaneseError = "メールアドレスまたはパスワードが正しくありません";
      } else if (error.includes("User not found")) {
        japaneseError =
          "ユーザーが見つかりません。初回ログインの場合は、正しいメールアドレスとパスワードを入力してください";
      } else if (error.includes("Too many requests")) {
        japaneseError =
          "ログイン試行回数が上限に達しました。しばらく時間をおいてから再度お試しください";
      } else if (error.includes("Email not confirmed")) {
        japaneseError = "メールアドレスが確認されていません";
      } else if (error.includes("Password should be at least")) {
        japaneseError = "パスワードが短すぎます（6文字以上で入力してください）";
      } else if (error.includes("User already registered")) {
        japaneseError = "このメールアドレスは既に登録されています";
      } else if (error.includes("Signup is disabled")) {
        japaneseError = "新規登録が無効になっています";
      } else if (
        error.includes(
          "A user with this email address has already been registered"
        )
      ) {
        japaneseError = "このメールアドレスは既に登録されています";
      }

      return json(
        {
          error: japaneseError,
          originalError: error,
          debugInfo: `認証失敗 - ${email}`,
        },
        { status: 401 }
      );
    }

    if (!user || !session) {
      console.error("[Login] ユーザーまたはセッションが取得できませんでした");
      return json(
        {
          error: "認証に失敗しました（ユーザー情報の取得エラー）",
          debugInfo: `user: ${!!user}, session: ${!!session}`,
        },
        { status: 401 }
      );
    }

    console.log(`[Login] 認証成功: ${user.id}`);

    // プロフィール作成/確認
    try {
      console.log(`[Login] プロフィール確認中: ${user.id}`);
      await auth.ensureUserProfile(user, session.access_token);
      console.log(`[Login] プロフィール確認完了: ${user.id}`);
    } catch (profileError) {
      console.error(`[Login] プロフィールエラー:`, profileError);
      return json(
        {
          error: "プロフィールの作成または確認に失敗しました",
          debugInfo: `Profile error for user ${user.id}`,
        },
        { status: 500 }
      );
    }

    // セッション作成とリダイレクト
    console.log(`[Login] セッション作成中: ${user.id} -> ${redirectTo}`);

    try {
      // SessionManagerを直接使用してCookieを作成
      const { SessionManager } = await import("~/lib/auth/session");
      const sessionCookie = await SessionManager.createSession(session);

      console.log(`[Login] セッション作成完了: ${user.id}`, { sessionCookie });

      // 従来通りのredirectレスポンスを返す
      throw redirect(redirectTo, {
        headers: {
          "Set-Cookie": sessionCookie,
        },
      });
    } catch (sessionError) {
      // redirectの場合はそのまま返す
      if (sessionError instanceof Response && sessionError.status === 302) {
        return sessionError;
      }

      console.error(`[Login] セッション作成エラー:`, sessionError);
      return json(
        {
          error: "セッション作成に失敗しました",
          debugInfo:
            sessionError instanceof Error
              ? sessionError.message
              : "Session creation failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Remixのredirectレスポンスは正常なので、そのまま返す
    if (error instanceof Response && error.status === 302) {
      return error;
    }

    console.error("[Login] 予期しないエラー:", error);
    return json(
      {
        error: "ログイン処理中に予期しないエラーが発生しました",
        debugInfo: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>() as
    | {
        error?: string;
        debugInfo?: string;
        originalError?: string;
      }
    | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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

            {/* Google ログイン - 一時的に無効化 */}
            <div className="mb-4 rounded-xl bg-gray-100 px-4 py-3 text-center text-gray-500">
              <span>Googleログインは準備中です</span>
            </div>

            <div className="mb-4 flex items-center">
              <div className="flex-1 border-t border-wellness-primary/20"></div>
              <span className="px-3 text-sm text-wellness-textLight">
                または
              </span>
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
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-wellness-primary/20 px-3 py-2 text-wellness-text placeholder-wellness-textLight focus:border-wellness-primary focus:outline-none focus:ring-1 focus:ring-wellness-primary"
                  placeholder="your@email.com"
                  disabled={isSubmitting}
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
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full rounded-lg border border-wellness-primary/20 px-3 py-2 text-wellness-text placeholder-wellness-textLight focus:border-wellness-primary focus:outline-none focus:ring-1 focus:ring-wellness-primary"
                  disabled={isSubmitting}
                />
              </div>

              {actionData?.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <div className="font-medium">{actionData.error}</div>
                  {actionData.debugInfo && (
                    <div className="mt-1 font-mono text-xs text-red-500">
                      デバッグ情報: {actionData.debugInfo}
                    </div>
                  )}
                  {actionData.originalError &&
                    actionData.originalError !== actionData.error && (
                      <div className="mt-1 font-mono text-xs text-red-500">
                        元のエラー: {actionData.originalError}
                      </div>
                    )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
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
