import { useEffect, useState } from "react";
import { type MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Bot, Moon, Sun, Sunrise } from "lucide-react";

import { supabase } from "../lib/supabase.client";
import { moodColors } from "../moodColors";

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
    { title: "そっとノート" },
    {
      name: "description",
      content: "あなたの思考を整理するためのノートアプリ",
    },
  ];
};

// 時間帯アイコンを返す関数を追加
function getTimeIcon(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12)
    return <Sunrise size={16} className="text-yellow-400" />; // 朝
  if (hour >= 12 && hour < 17)
    return <Sun size={16} className="text-yellow-500" />; // 昼
  return <Moon size={16} className="text-indigo-400" />; // 夜
}

export default function Index() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dailyNote, setDailyNote] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

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

  // ジャーナルエントリー一覧をSupabaseから取得
  useEffect(() => {
    setLoading(true);
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setJournalEntries([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("journals")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false });
      if (error) {
        setJournalEntries([]);
        setLoading(false);
        return;
      }
      setJournalEntries(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 挨拶セクション */}
        <div className="mb-6 text-lg text-gray-800">
          {greeting}、{userName}さん
        </div>
        {/* 過去のエントリー一覧 */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            過去のジャーナル
          </h2>
          {loading ? (
            <p className="text-xs text-gray-500">読み込み中...</p>
          ) : journalEntries.length === 0 ? (
            <p className="text-xs text-gray-500">まだ記録がありません。</p>
          ) : (
            <div className="space-y-2">
              {journalEntries.map((entry) => (
                <div key={entry.id} className="group relative">
                  <Link
                    to={`/journal/${entry.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {entry.date}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleTimeString(
                            "ja-JP",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                        <span className="text-xs">
                          {getTimeIcon(entry.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[entry.mood as keyof typeof moodColors]?.color || "bg-slate-100"} ${moodColors[entry.mood as keyof typeof moodColors]?.ringColor ? "ring-1 " + moodColors[entry.mood as keyof typeof moodColors].ringColor : ""} ${moodColors[entry.mood as keyof typeof moodColors]?.label ? "text-gray-700" : "text-gray-600"} `}
                        >
                          {moodColors[entry.mood as keyof typeof moodColors]
                            ?.label || entry.mood}
                        </span>
                        <Link
                          to={`/counseling/${entry.id}`}
                          className="flex items-center rounded border border-indigo-200 bg-indigo-100 p-1 text-indigo-700 hover:bg-indigo-200"
                        >
                          <Bot size={14} />
                        </Link>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-gray-700">
                      {entry.content}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
