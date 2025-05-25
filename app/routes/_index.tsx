import { useEffect, useState } from "react";
import { type MetaFunction } from "@remix-run/node";

// ジャーナルエントリー型
type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
};

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
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // 時間帯による挨拶の更新
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
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const storedName = localStorage.getItem("userName") || "";
    const today = new Date().toLocaleDateString();
    const storedData = localStorage.getItem(`dailyData_${today}`);

    if (storedData) {
      const { mood, note } = JSON.parse(storedData);
      setSelectedMood(mood);
      setDailyNote(note);
    }

    setUserName(storedName);
  }, []);

  // 気分が変更されたときにローカルストレージに保存
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    localStorage.setItem(
      `dailyData_${today}`,
      JSON.stringify({
        mood: selectedMood,
        note: dailyNote,
      })
    );
  }, [selectedMood, dailyNote]);

  // ジャーナルエントリー一覧をローカルストレージから取得
  useEffect(() => {
    const storedEntries = localStorage.getItem("journalEntries");
    if (storedEntries) {
      setJournalEntries(JSON.parse(storedEntries));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 挨拶セクション */}
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
        {/* 過去のエントリー一覧 */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            過去のジャーナル
          </h2>
          {journalEntries.length === 0 ? (
            <p className="text-gray-500">まだ記録がありません。</p>
          ) : (
            <div className="space-y-4">
              {journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {entry.date}
                      </span>
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {entry.mood}
                      </span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-700">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
