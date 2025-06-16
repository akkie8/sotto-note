import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useAuthRefresh } from "~/hooks/useAuthRefresh";
import { getOptionalAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getOptionalAuth(request);

  return json({
    user,
    timestamp: new Date().toISOString(),
  }, {
    headers: headers || {},
  });
}

export default function TestRefresh() {
  const { user, timestamp } = useLoaderData<typeof loader>();
  const [logs, setLogs] = useState<string[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
  };

  const { refreshToken, isRefreshing, lastRefreshError } = useAuthRefresh({
    enabled: !!user,
    checkInterval: 1, // 1分間隔（テスト用）
    onRefreshSuccess: () => {
      setRefreshCount(prev => prev + 1);
      addLog('✅ トークンリフレッシュ成功');
    },
    onRefreshError: () => {
      addLog('❌ トークンリフレッシュ失敗');
    },
  });

  useEffect(() => {
    addLog('🔄 自動リフレッシュテストページ開始');
    if (user) {
      addLog(`👤 ユーザー認証済み: ${user.id}`);
    } else {
      addLog('🚫 ユーザー未認証');
    }
  }, [user]);

  useEffect(() => {
    if (lastRefreshError) {
      addLog(`⚠️ 最新エラー: ${lastRefreshError}`);
    }
  }, [lastRefreshError]);

  const handleManualRefresh = () => {
    addLog('🔄 手動リフレッシュ実行中...');
    refreshToken();
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('🧹 ログクリア');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          🧪 自動リフレッシュ機能テスト
        </h1>

        {/* ステータスカード */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500">認証状態</h3>
            <p className={`text-lg font-semibold ${user ? 'text-green-600' : 'text-red-600'}`}>
              {user ? '✅ 認証済み' : '❌ 未認証'}
            </p>
            {user && <p className="text-sm text-gray-600">ID: {user.id}</p>}
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500">リフレッシュ状態</h3>
            <p className={`text-lg font-semibold ${isRefreshing ? 'text-blue-600' : 'text-gray-600'}`}>
              {isRefreshing ? '🔄 実行中' : '⏸️ 待機中'}
            </p>
            <p className="text-sm text-gray-600">回数: {refreshCount}</p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-medium text-gray-500">最新エラー</h3>
            <p className={`text-lg font-semibold ${lastRefreshError ? 'text-red-600' : 'text-green-600'}`}>
              {lastRefreshError || '✅ エラーなし'}
            </p>
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">コントロール</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || !user}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isRefreshing ? '実行中...' : '手動リフレッシュ'}
            </button>
            
            <button
              onClick={handleClearLogs}
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              ログクリア
            </button>

            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              ページリロード
            </button>

            {!user && (
              <a
                href="/login"
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                ログインページへ
              </a>
            )}
          </div>
        </div>

        {/* ログ表示 */}
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">活動ログ</h3>
            <p className="text-sm text-gray-500">
              ページ読み込み: {new Date(timestamp).toLocaleString()}
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto rounded border bg-gray-50 p-3">
            {logs.length === 0 ? (
              <p className="text-gray-500">ログはまだありません</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-sm font-mono text-gray-700"
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* テスト情報 */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-blue-800">📋 テスト項目</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• 自動リフレッシュが1分間隔で実行されること</li>
            <li>• 手動リフレッシュが正常に動作すること</li>
            <li>• ページフォーカス時にリフレッシュが実行されること</li>
            <li>• エラー時に適切にログが記録されること</li>
            <li>• ネットワーク切断復旧時にリフレッシュが実行されること</li>
          </ul>
        </div>

        {/* 詳細情報 */}
        <div className="mt-4 rounded-lg bg-gray-100 p-4">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">🔧 設定情報</h3>
          <div className="text-sm text-gray-600">
            <p>• リフレッシュ間隔: 1分（テスト用）</p>
            <p>• 自動リフレッシュ: {user ? '有効' : '無効'}</p>
            <p>• 現在時刻: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}