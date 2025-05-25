import { useEffect, useState } from "react";
import { type MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Pencil, Wind } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Sotto Note" },
    {
      name: "description",
      content: "あなたの思考を整理するためのノートアプリ",
    },
  ];
};

// 気分アイコンの定義
const moodOptions = [
  { emoji: "😊", label: "うれしい" },
  { emoji: "😌", label: "おだやか" },
  { emoji: "🤔", label: "考え中" },
  { emoji: "😓", label: "つかれた" },
  { emoji: "😢", label: "かなしい" },
  { emoji: "😤", label: "イライラ" },
];

export default function Index() {
  const [userName, setUserName] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dailyNote, setDailyNote] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("userName") || "";
    setUserName(storedName);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900">Sotto Note</h1>
              {userName && (
                <span className="text-sm text-gray-600">
                  / {userName}さんの記録
                </span>
              )}
            </div>
            <Link
              to="/settings"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
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
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 今日の気分セクション */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            今日の気分は？
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {moodOptions.map((mood) => (
              <button
                key={mood.emoji}
                onClick={() => setSelectedMood(mood.emoji)}
                className={`flex flex-col items-center rounded-lg p-3 transition-colors ${
                  selectedMood === mood.emoji
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="mt-1 text-xs">{mood.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 今日のひとことセクション */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            今日のひとこと
          </h2>
          <textarea
            value={dailyNote}
            onChange={(e) => setDailyNote(e.target.value)}
            placeholder="今の気持ちを書き出してみましょう..."
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={3}
          />
        </section>

        {/* アクションボタンセクション */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/journal"
            className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-6 py-4 text-white transition-colors hover:bg-indigo-700"
          >
            <Pencil className="h-5 w-5" />
            <span>ジャーナルを書く</span>
          </Link>
          <Link
            to="/breathing"
            className="flex items-center justify-center space-x-2 rounded-lg bg-emerald-600 px-6 py-4 text-white transition-colors hover:bg-emerald-700"
          >
            <Wind className="h-5 w-5" />
            <span>深呼吸する</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
