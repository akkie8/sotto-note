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
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dailyNote, setDailyNote] = useState("");

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return "おはようございます";
      } else if (hour >= 12 && hour < 17) {
        return "こんにちは";
      } else {
        return "こんばんは";
      }
    };

    setGreeting(getGreeting());
    // 1分ごとに更新（時間が変わったときに挨拶を更新するため）
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName") || "";
    setUserName(storedName);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-lg text-gray-800">
          {greeting}、{userName}さん
        </div>
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
