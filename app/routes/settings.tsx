import { json, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, Link } from "@remix-run/react";
import { useState } from "react";

type ActionData = {
  success?: boolean;
  error?: string;
  action?: "reset" | "feedback";
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const feedback = formData.get("feedback");

  switch (action) {
    case "reset":
      try {
        // TODO: データベースのリセット処理を実装
        return json<ActionData>({ success: true, action: "reset" });
      } catch (error) {
        return json<ActionData>({ error: "データの初期化に失敗しました" });
      }

    case "feedback":
      if (!feedback) {
        return json<ActionData>({ error: "フィードバックを入力してください" });
      }
      try {
        // TODO: フィードバック送信処理を実装
        return json<ActionData>({ success: true, action: "feedback" });
      } catch (error) {
        return json<ActionData>({
          error: "フィードバックの送信に失敗しました",
        });
      }

    default:
      return json<ActionData>({ error: "不正なアクションです" });
  }
};

export default function Settings() {
  const actionData = useActionData<ActionData>();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div>
      {/* ヘッダーナビゲーション */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Sotto Note
            </Link>
            <div className="text-gray-900 flex items-center space-x-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.432l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.432l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.248a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
                />
              </svg>
              <span>設定</span>
            </div>
          </div>
        </div>
      </header>

      <div className="py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">設定</h1>

        <div className="space-y-8">
          {/* データ初期化セクション */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              データの初期化
            </h2>
            <p className="text-gray-600 mb-4">
              すべてのジャーナルデータを削除します。この操作は取り消せません。
            </p>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                データを初期化
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-red-600 font-medium">
                  本当にすべてのデータを削除しますか？
                </p>
                <div className="space-x-4">
                  <Form method="post" className="inline">
                    <input type="hidden" name="action" value="reset" />
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      はい、削除します
                    </button>
                  </Form>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
            {actionData?.action === "reset" && actionData?.success && (
              <p className="mt-4 text-green-600">
                データの初期化が完了しました。
              </p>
            )}
          </section>

          {/* 投げ銭セクション */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              開発者を支援
            </h2>
            <p className="text-gray-600 mb-4">
              アプリの開発・維持をサポートしていただける方は、以下のリンクからご支援いただけます。
            </p>
            <div className="space-y-4">
              <a
                href="https://buy.stripe.com/dummy_link" // TODO: 実際の決済リンクに変更
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                ☕️ コーヒーをご馳走する
              </a>
            </div>
          </section>

          {/* フィードバックセクション */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              フィードバック
            </h2>
            <p className="text-gray-600 mb-4">
              アプリの改善にご協力ください。ご要望や気になる点をお聞かせください。
            </p>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="action" value="feedback" />
              <div>
                <label
                  htmlFor="feedback"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  フィードバック内容
                </label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="アプリへのご意見・ご要望をお聞かせください"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                送信する
              </button>
            </Form>
            {actionData?.action === "feedback" && actionData?.success && (
              <p className="mt-4 text-green-600">
                フィードバックを送信しました。ありがとうございます。
              </p>
            )}
          </section>

          {/* エラーメッセージ */}
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">エラー</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {actionData.error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
