import { useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import { createSupabaseClient } from "~/lib/auth/supabase";

export async function loader() {
  // 環境変数の確認
  const config = {
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.VITE_SUPABASE_URL,
  };

  return json({ config });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const action = formData.get("action") as string;

  const supabase = createSupabaseClient();
  const debugInfo: {
    action: string;
    email: string;
    timestamp: string;
    result?: {
      success: boolean;
      error?: string;
      errorCode?: string;
      errorStatus?: number;
      hasUser: boolean;
      hasSession: boolean;
      userId?: string;
      userEmail?: string;
      userConfirmedAt?: string;
    };
    profile?: {
      exists: boolean;
      error?: string;
      errorCode?: string;
      data?: unknown;
    };
    exception?: {
      message: string;
      stack?: string;
    };
  } = {
    action,
    email,
    timestamp: new Date().toISOString(),
  };

  try {
    if (action === "signup") {
      // 新規登録
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      debugInfo.result = {
        success: !error,
        error: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        userConfirmedAt: data?.user?.confirmed_at,
      };
    } else if (action === "signin") {
      // ログイン
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      debugInfo.result = {
        success: !error,
        error: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
      };
    } else if (action === "check") {
      // ユーザーチェック
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      debugInfo.result = {
        success: !error,
        error: error?.message,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
      };
    }

    // プロフィール確認
    if (debugInfo.result?.userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", debugInfo.result.userId)
        .single();

      debugInfo.profile = {
        exists: !profileError || profileError.code !== "PGRST116",
        error: profileError?.message,
        errorCode: profileError?.code,
        data: profile,
      };
    }
  } catch (exception) {
    debugInfo.exception = {
      message: exception instanceof Error ? exception.message : "Unknown error",
      stack: exception instanceof Error ? exception.stack : undefined,
    };
  }

  return json({ debugInfo });
}

export default function TestAuthDebug() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Supabase認証デバッグ</h1>

        {/* 設定状態 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">環境変数の状態</h2>
          <div className="space-y-1 text-sm">
            <p>
              URL: {config.hasUrl ? "✅" : "❌"} {config.url}
            </p>
            <p>ANON_KEY: {config.hasAnonKey ? "✅" : "❌"}</p>
            <p>SERVICE_KEY: {config.hasServiceKey ? "✅" : "❌"}</p>
          </div>
        </div>

        {/* テストフォーム */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">認証テスト</h2>
          <Form method="post" className="space-y-4">
            <div>
              <label className="block text-sm font-medium">
                メールアドレス
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                  required
                />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium">
                パスワード
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
                  required
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                name="action"
                value="signup"
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                新規登録テスト
              </button>
              <button
                type="submit"
                name="action"
                value="signin"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                ログインテスト
              </button>
              <button
                type="submit"
                name="action"
                value="check"
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                ユーザー確認
              </button>
            </div>
          </Form>
        </div>

        {/* 結果表示 */}
        {actionData?.debugInfo && (
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">実行結果</h2>
            <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
              {JSON.stringify(actionData.debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* クライアントサイドテスト */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            クライアントサイドテスト
          </h3>
          <button
            onClick={async () => {
              try {
                const { supabase } = await import("~/lib/supabase.client");

                // 現在のセッション確認
                const {
                  data: { session },
                  error: sessionError,
                } = await supabase.auth.getSession();
                console.log("Current session:", session);
                console.log("Session error:", sessionError);

                // ユーザー確認
                const {
                  data: { user },
                  error: userError,
                } = await supabase.auth.getUser();
                console.log("Current user:", user);
                console.log("User error:", userError);

                alert(
                  `セッション: ${session ? "あり" : "なし"}\nユーザー: ${user ? user.email : "なし"}`
                );
              } catch (error) {
                console.error("Client test error:", error);
                alert(`エラー: ${error}`);
              }
            }}
            className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
          >
            クライアント認証確認
          </button>
        </div>

        {/* ナビゲーション */}
        <div className="mt-6 flex gap-3">
          <a href="/" className="text-blue-600 hover:underline">
            ホーム
          </a>
          <a href="/login" className="text-blue-600 hover:underline">
            ログイン
          </a>
          <a href="/debug.auth" className="text-blue-600 hover:underline">
            認証デバッグ
          </a>
        </div>
      </div>
    </div>
  );
}
