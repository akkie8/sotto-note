import { useCallback, useEffect, useState } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Bot, Moon, RefreshCw, Sun, Sunrise } from "lucide-react";

import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
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

export async function loader({ request }: LoaderFunctionArgs) {
  // Just try to get server-side user, but don't enforce it
  const { user } = await getOptionalUser(request);

  return json({
    serverUser: user,
  });
}

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
  const { serverUser } = useLoaderData<typeof loader>();
  const [greeting, setGreeting] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "activity">("list");

  // Fetch user data with caching
  const fetchUserData = useCallback(
    async (userId: string, forceRefresh = false) => {
      try {
        // Check cache first
        if (!forceRefresh) {
          const cachedProfile = cache.get(CACHE_KEYS.USER_PROFILE(userId));
          const cachedJournals = cache.get<JournalEntry[]>(
            CACHE_KEYS.JOURNAL_ENTRIES(userId)
          );

          if (cachedProfile && cachedJournals) {
            setUserName(cachedProfile.name || "");
            setJournalEntries(cachedJournals);
            return;
          }
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", userId)
          .single();

        if (profile) {
          cache.set(CACHE_KEYS.USER_PROFILE(userId), profile, 10 * 60 * 1000); // 10 minutes
          setUserName(profile.name || "");
        }

        // Fetch journals
        const { data: journals } = await supabase
          .from("journals")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false });

        if (journals) {
          cache.set(
            CACHE_KEYS.JOURNAL_ENTRIES(userId),
            journals,
            5 * 60 * 1000
          ); // 5 minutes
          setJournalEntries(journals);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    },
    []
  );

  // Check client-side authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        if (clientUser) {
          await fetchUserData(clientUser.id);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [fetchUserData]);

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

  // Calculate activity data for the past 4 weeks
  const getActivityData = useCallback(() => {
    const today = new Date();
    const activityMap = new Map<string, number>();

    // Count entries by date
    journalEntries.forEach((entry) => {
      // Normalize the date format to match the generated format
      let normalizedDate = entry.date;

      // If entry.date is in format like "2025/5/29", convert to "2025-05-29" with zero padding
      if (entry.date.includes("/")) {
        const parts = entry.date.split("/");
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, "0");
          const day = parts[2].padStart(2, "0");
          normalizedDate = `${year}-${month}-${day}`;
        }
      }

      // If entry.date is in format like "2024年5月29日", convert to "2024-05-29"
      if (entry.date.includes("年")) {
        const match = entry.date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (match) {
          const year = match[1];
          const month = match[2].padStart(2, "0");
          const day = match[3].padStart(2, "0");
          normalizedDate = `${year}-${month}-${day}`;
        }
      }

      activityMap.set(
        normalizedDate,
        (activityMap.get(normalizedDate) || 0) + 1
      );
    });

    // Generate 4 weeks of data
    const weeks: { date: Date; count: number }[][] = [];

    // Start from 4 weeks ago Monday to ensure we capture more data
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() - 28 + 1); // Monday 4 weeks ago
    startDate.setHours(0, 0, 0, 0);

    for (let week = 0; week < 4; week++) {
      const weekData: { date: Date; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        const dateString = currentDate
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "-");

        weekData.push({
          date: currentDate,
          count: activityMap.get(dateString) || 0,
        });
      }
      weeks.push(weekData);
    }

    return weeks;
  }, [journalEntries]);

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    if (!user || refreshing) return;

    setRefreshing(true);
    try {
      await fetchUserData(user.id, true); // Force refresh
      // Invalidate cache for this user
      cache.invalidate(CACHE_KEYS.USER_PROFILE(user.id));
      cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, fetchUserData]);

  // Touch event handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || window.scrollY > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      setPullDistance(Math.min(distance, 100)); // Max 100px
    },
    [isPulling, startY]
  );

  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance > 60) {
      handleRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, handleRefresh]);

  // リアルタイム更新のサブスクリプション
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime:journals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journals",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newEntry = payload.new as JournalEntry;
            setJournalEntries((prev) => [newEntry, ...prev]);
            // Update cache
            cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setJournalEntries((prev) => prev.filter((j) => j.id !== deletedId));
            // Update cache
            cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">
              そっとノート
            </h1>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="min-h-full bg-transparent">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">
              そっとノート
            </h1>
            <div className="mb-8">
              <img
                src="/levitate.gif"
                alt="浮遊するアニメーション"
                className="mx-auto h-auto w-full max-w-xs"
              />
            </div>
            <p className="mb-6 text-gray-600">ログインして始めましょう</p>
            <Link
              to="/about"
              className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full bg-transparent"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center bg-indigo-500 text-white transition-all duration-200"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance / 100,
          }}
        >
          <RefreshCw
            size={16}
            className={pullDistance > 60 ? "animate-spin" : ""}
          />
          <span className="ml-2 text-sm">
            {pullDistance > 60 ? "離して更新" : "下に引いて更新"}
          </span>
        </div>
      )}

      {/* Refresh overlay */}
      {refreshing && (
        <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-center bg-indigo-500 py-2 text-white">
          <RefreshCw size={16} className="animate-spin" />
          <span className="ml-2 text-sm">更新中...</span>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-medium text-wellness-primary">
            {greeting}
            {userName && <span className="ml-1">{userName}さん</span>}
          </h1>
        </div>

        {/* 新規エントリーボタン */}
        <div className="mb-4">
          <Link
            to="/journal"
            className="block w-full rounded-md bg-wellness-primary px-3 py-2 text-center text-white transition-all hover:bg-wellness-secondary"
          >
            <span className="text-xs">新しいジャーナルを書く</span>
          </Link>
        </div>

        {/* タブ切り替え */}
        <div className="mb-6 flex gap-2 rounded-lg bg-wellness-primary/10 p-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "bg-wellness-surface text-wellness-primary shadow-sm"
                : "text-wellness-textLight hover:text-wellness-primary"
            }`}
          >
            記事一覧
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "bg-wellness-surface text-wellness-primary shadow-sm"
                : "text-wellness-textLight hover:text-wellness-primary"
            }`}
          >
            アクティビティ
          </button>
        </div>

        {/* コンテンツエリア */}
        {activeTab === "list" ? (
          /* ジャーナルエントリー一覧 */
          <div className="space-y-4">
            {journalEntries.length === 0 ? (
              <div className="text-center text-wellness-textLight">
                <p className="text-sm">まだジャーナルエントリーがありません</p>
                <p className="text-xs">
                  上のボタンから最初のエントリーを作成してみましょう
                </p>
              </div>
            ) : (
              journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-wellness-primary/10 bg-wellness-surface p-3 transition-all hover:border-wellness-primary/20 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-wellness-textLight">
                      <span>{entry.date}</span>
                      {getTimeIcon(entry.timestamp)}
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          moodColors[entry.mood as keyof typeof moodColors]
                            ?.color ||
                          "bg-wellness-primary/10 text-wellness-primary"
                        }`}
                      >
                        {moodColors[entry.mood as keyof typeof moodColors]
                          ?.label || entry.mood}
                      </span>
                      <Link
                        to={`/counseling/${entry.id}`}
                        className="rounded p-1 text-wellness-textLight transition-colors hover:bg-wellness-primary/10 hover:text-wellness-primary"
                        title="AIに相談"
                      >
                        <Bot size={12} />
                      </Link>
                    </div>
                  </div>
                  <Link to={`/journal/view/${entry.id}`} className="block">
                    <p className="line-clamp-3 text-xs leading-relaxed text-wellness-text">
                      {entry.content}
                    </p>
                  </Link>
                </div>
              ))
            )}
          </div>
        ) : (
          /* アクティビティサマリー */
          <div className="space-y-4">
            <div className="rounded-lg border border-wellness-primary/10 bg-wellness-surface p-4 shadow-sm">
              <div className="mb-4 text-center text-sm text-wellness-textLight">
                <p>過去4週間のアクティビティ</p>
              </div>

              {/* 曜日ヘッダー */}
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-wellness-textLight">
                <div>月</div>
                <div>火</div>
                <div>水</div>
                <div>木</div>
                <div>金</div>
                <div>土</div>
                <div>日</div>
              </div>

              {/* アクティビティグリッド */}
              <div className="space-y-2">
                {getActivityData().map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIndex) => {
                      const isToday =
                        day.date.toDateString() === new Date().toDateString();
                      // 0段階のサイズ: 0投稿=0, 1投稿=20%, 2投稿=40%, 3投稿=60%, 4投稿=80%, 5投稿以上=100%
                      const sizePercent = Math.min(day.count * 20, 100);
                      const circleSize =
                        sizePercent > 0
                          ? Math.max(8, Math.floor(48 * (sizePercent / 100)))
                          : 0; // 最小8px、最大48px

                      return (
                        <div
                          key={dayIndex}
                          className="relative flex h-12 items-center justify-center rounded bg-wellness-primary/10"
                          title={`${day.date.toLocaleDateString("ja-JP")} - ${day.count}件`}
                        >
                          {day.count > 0 && (
                            <div
                              className="rounded-full bg-wellness-accent"
                              style={{
                                width: `${circleSize}px`,
                                height: `${circleSize}px`,
                              }}
                            />
                          )}
                          {isToday && (
                            <div className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-wellness-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 統計情報 */}
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-wellness-primary/10 pt-4 text-sm">
                <div>
                  <p className="text-wellness-textLight">合計エントリー数</p>
                  <p className="text-xl font-semibold text-wellness-primary">
                    {journalEntries.length}
                  </p>
                </div>
                <div>
                  <p className="text-wellness-textLight">今週のエントリー数</p>
                  <p className="text-xl font-semibold text-wellness-primary">
                    {getActivityData()[3].reduce(
                      (sum, day) => sum + day.count,
                      0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
