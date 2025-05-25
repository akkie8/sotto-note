import { Link, useParams } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";

export default function JournalDetail() {
  const { id } = useParams();

  // TODO: 実際のデータ取得ロジックを実装
  const journalEntry = {
    date: new Date(
      Date.now() - Number(id) * 24 * 60 * 60 * 1000
    ).toLocaleDateString("ja-JP"),
    mood: "😌",
    content:
      "今日は穏やかな一日でした。朝早く起きて、深呼吸をしながら一日を始めました。",
    note: "心が落ち着いていて、集中して作業ができました。",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>戻る</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">記録の詳細</h1>
            <div className="w-20" /> {/* スペース調整用 */}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          {/* 日付と気分 */}
          <div className="mb-6 flex items-center justify-between">
            <time className="text-lg font-medium text-gray-900">
              {journalEntry.date}
            </time>
            <span className="text-3xl">{journalEntry.mood}</span>
          </div>

          {/* メインコンテンツ */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              今日の記録
            </h2>
            <p className="whitespace-pre-wrap text-gray-700">
              {journalEntry.content}
            </p>
          </div>

          {/* 一言メモ */}
          <div>
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              今日のひとこと
            </h2>
            <p className="text-gray-700">{journalEntry.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
