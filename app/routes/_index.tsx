import { useEffect, useState } from "react";
import { LoaderFunction, redirect, type MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Bot, Moon, Sun, Sunrise } from "lucide-react";

import { getSupabase } from "~/lib/supabase.server";
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

export const loader: LoaderFunction = async ({ request }) => {
  const response = new Response();
  const supabase = getSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[loader] user:", user);

  if (!user) return redirect("/about");
  return null;
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

  // ユーザー名をSupabaseから取得
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (!error && data?.name) {
        setUserName(data.name);
      }
    })();
  }, []);

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
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 挨拶セクション */}
        <div className="fade-in mb-8 text-xl font-semibold text-wellness-text">
          {greeting}、{userName}さん
        </div>
        {/* イラスト */}
        <div className="illustration-space">
          <img
            src="/rolling.svg"
            alt="リラックスするイラスト"
            className="mx-auto h-auto w-full max-w-xs"
          />
        </div>
        {/* 過去のエントリー一覧 */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-wellness-accent">
            過去のジャーナル
          </h2>
          {loading ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : journalEntries.length === 0 ? (
            <div className="card-soft text-center text-gray-400">
              まだ記録がありません。
            </div>
          ) : (
            <div className="space-y-4">
              {journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="card-soft fade-in group relative"
                >
                  <Link
                    to={`/journal/${entry.id}`}
                    className="block rounded-2xl border border-wellness-accent/30 bg-white/80 p-4 shadow-gentle transition-colors hover:bg-wellness-accent/10"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {entry.date}
                        </span>
                        <span className="text-xs text-gray-300">
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
                          className={`inline-block rounded-full bg-wellness-accent/40 px-2 py-0.5 text-xs font-medium text-wellness-text`}
                        >
                          {moodColors[entry.mood as keyof typeof moodColors]
                            ?.label || entry.mood}
                        </span>
                        <Link
                          to={`/counseling/${entry.id}`}
                          className="flex items-center rounded-full border border-wellness-accent bg-wellness-accent/30 p-1 text-wellness-accent hover:bg-wellness-accent/60"
                        >
                          <Bot size={14} />
                        </Link>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-wellness-text">
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
