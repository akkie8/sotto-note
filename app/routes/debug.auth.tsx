import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getOptionalAuth } from "~/utils/auth.server";
import { getSessionData } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // セッション情報を取得
    const sessionData = await getSessionData(request);

    // 認証状態を取得
    const { user, session, headers } = await getOptionalAuth(request);

    // Cookie情報を取得
    const cookieHeader = request.headers.get("Cookie");

    return json(
      {
        sessionData,
        user,
        session,
        cookieHeader,
        headers: headers ? Object.fromEntries(Object.entries(headers)) : null,
        timestamp: new Date().toISOString(),
      },
      {
        headers: headers || {},
      }
    );
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

export default function DebugAuth() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          🔍 認証デバッグ情報
        </h1>

        {"error" in data ? (
          <div className="rounded-lg bg-red-50 p-4">
            <h2 className="text-lg font-semibold text-red-800">エラー</h2>
            <p className="text-red-600">{data.error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* セッション情報 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                📄 セッション情報
              </h2>
              <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                {JSON.stringify(data.sessionData, null, 2)}
              </pre>
            </div>

            {/* ユーザー情報 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                👤 ユーザー情報
              </h2>
              <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                {JSON.stringify(data.user, null, 2)}
              </pre>
            </div>

            {/* セッション詳細 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                🔐 セッション詳細
              </h2>
              <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                {JSON.stringify(data.session, null, 2)}
              </pre>
            </div>

            {/* Cookie情報 */}
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                🍪 Cookie情報
              </h2>
              <div className="text-sm text-gray-600">
                {data.cookieHeader ? (
                  <div>
                    <p className="mb-2 font-medium">Cookie Header:</p>
                    <pre className="overflow-x-auto rounded bg-gray-100 p-3">
                      {data.cookieHeader}
                    </pre>
                  </div>
                ) : (
                  <p className="text-red-600">Cookie情報なし</p>
                )}
              </div>
            </div>

            {/* レスポンスヘッダー */}
            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                📤 レスポンスヘッダー
              </h2>
              <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                {JSON.stringify(data.headers, null, 2)}
              </pre>
            </div>

            {/* タイムスタンプ */}
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">
                生成時刻: {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* ナビゲーション */}
        <div className="mt-6 flex gap-3">
          <a
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            ホーム
          </a>
          <a
            href="/login"
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            ログイン
          </a>
          <a
            href="/dashboard"
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            ダッシュボード
          </a>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            リロード
          </button>
        </div>

        {/* クライアントサイド認証チェック */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-yellow-800">
            🔧 クライアントサイド認証チェック
          </h3>
          <button
            onClick={async () => {
              try {
                const { supabase } = await import("~/lib/supabase.client");

                const {
                  data: { user },
                  error,
                } = await supabase.auth.getUser();
                console.log("Client-side user:", user);
                console.log("Client-side error:", error);

                alert(`Client User: ${user ? user.id : "null"}`);
              } catch (error) {
                console.error("Client auth check error:", error);
                alert(`Error: ${error}`);
              }
            }}
            className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
          >
            クライアント認証状態確認
          </button>
        </div>
      </div>
    </div>
  );
}
