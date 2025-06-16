import { useCallback, useEffect, useState } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { Moon, RefreshCw, Sun, Sunrise, Wind } from "lucide-react";
import { toast } from "sonner";

import { DeleteConfirmModal } from "~/components/DeleteConfirmModal";
import { Loading } from "~/components/Loading";
import { ThreeDotsMenu } from "~/components/ThreeDotsMenu";
import { requireAuth } from "~/utils/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";

// ジャーナルエントリー型
type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
  tags?: string;
  has_ai_reply?: boolean;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireAuth(request);

  return json({
    user,
  }, {
    headers: headers || {},
  });
}

export const meta: MetaFunction = () => {
  return [
    { title: "ダッシュボード - そっとノート" },
    {
      name: "description",
      content: "あなたの心の記録を確認し、新しいエントリーを作成しましょう。",
    },
  ];
};

export default function Dashboard() {
  const { user: serverUser } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(
    serverUser ? { id: serverUser.id } : null
  );
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "activity">("list");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

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
            setUserName((cachedProfile as { name?: string }).name || "");
            setJournalEntries(cachedJournals);
            return;
          }
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", userId)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else if (profile) {
          cache.set(CACHE_KEYS.USER_PROFILE(userId), profile, 10 * 60 * 1000); // 10 minutes
          setUserName((profile as { name?: string }).name || "");
        }

        // Fetch journals
        const { data: journals, error: journalsError } = await supabase
          .from("journals")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false });

        if (journalsError) {
          console.error("Error fetching journals:", journalsError);
        } else if (journals) {
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
          try {
            await fetchUserData(clientUser.id);
          } catch (fetchError) {
            console.error("Error fetching user data:", fetchError);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
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

    // Generate 4 weeks of data with TODAY always in bottom-right position
    const weeks: { date: Date; count: number }[][] = [];

    // Calculate start date so that today lands in position [3][6] (bottom-right)
    // Position 27 in a 28-day grid (0-based indexing)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 27); // 27 days before today
    startDate.setHours(0, 0, 0, 0);

    for (let week = 0; week < 4; week++) {
      const weekData: { date: Date; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        // Try multiple date formats to match entries
        let count = 0;

        // Format 1: YYYY-MM-DD
        const dateString1 = currentDate
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "-");
        count = Math.max(count, activityMap.get(dateString1) || 0);

        // Format 2: YYYY/M/D
        const dateString2 = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
        count = Math.max(count, activityMap.get(dateString2) || 0);

        // Format 3: YYYY年M月D日
        const dateString3 = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
        count = Math.max(count, activityMap.get(dateString3) || 0);

        weekData.push({
          date: currentDate,
          count: count,
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

  // ノート削除機能
  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("journals")
        .delete()
        .eq("id", entryId);

      if (error) {
        console.error("Error deleting entry:", error);
        toast.error("削除に失敗しました");
        return;
      }

      // ローカル状態を更新
      setJournalEntries((prev) => prev.filter((entry) => entry.id !== entryId));

      // キャッシュを無効化
      if (user) {
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
      }

      toast.success("ノートを削除しました");
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("削除に失敗しました");
    }
  };

  const openDeleteModal = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      handleDeleteEntry(entryToDelete);
      setEntryToDelete(null);
    }
  };

  const handleEditEntry = (entryId: string) => {
    navigate(`/journal/${entryId}?mode=edit`);
  };

  // Show loading state
  if (loading) {
    return <Loading fullScreen />;
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
          <h1 className="flex items-center justify-center gap-2 text-lg font-medium text-wellness-primary">
            <span>
              {greeting}
              {userName && <span className="ml-1">{userName}さん</span>}
            </span>
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) {
                return <Sunrise size={20} className="text-wellness-primary" />;
              } else if (hour >= 12 && hour < 17) {
                return <Sun size={20} className="text-wellness-primary" />;
              } else {
                return <Moon size={20} className="text-wellness-primary" />;
              }
            })()}
          </h1>

          {/* 深呼吸への動線 */}
          <div className="mt-3">
            <Link
              to="/breathing"
              className="inline-flex items-center gap-2 rounded-full bg-wellness-secondary/10 px-4 py-2 text-sm text-wellness-secondary transition-colors hover:bg-wellness-secondary/20"
            >
              <Wind size={16} />
              心を整える深呼吸
            </Link>
          </div>
        </div>

        {/* 新規エントリーボタン */}
        <div className="mb-4">
          <Link
            to="/journal/new"
            className="block w-full rounded-md bg-wellness-primary px-3 py-2 text-center text-white transition-all hover:bg-wellness-secondary"
          >
            <span className="text-xs">今の気持ちをノートに書く</span>
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
            リスト
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
          <div className="space-y-2">
            {journalEntries.length === 0 ? (
              <div className="text-center text-wellness-textLight">
                <p className="text-sm">まだノートエントリーがありません</p>
                <p className="text-xs">
                  上のボタンから最初のエントリーを作成してみましょう
                </p>
              </div>
            ) : (
              journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border-b border-wellness-primary/10 pb-2 pt-1 transition-all hover:bg-wellness-surface/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-wellness-textLight">
                      <span>{entry.date}</span>
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {entry.has_ai_reply && (
                        <span className="flex items-center gap-1 rounded-full bg-wellness-secondary/10 px-2 py-0.5 text-xs text-wellness-secondary">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
                          </svg>
                          <span>返信済み</span>
                        </span>
                      )}
                    </div>
                    <ThreeDotsMenu
                      onEdit={() => handleEditEntry(entry.id)}
                      onDelete={() => openDeleteModal(entry.id)}
                    />
                  </div>
                  <Link to={`/journal/${entry.id}`} className="block">
                    <p className="line-clamp-2 text-sm leading-relaxed text-wellness-text">
                      {entry.content}
                    </p>
                    {entry.tags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags
                          .split(",")
                          .filter((tag: string) => tag.trim())
                          .map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="rounded-md bg-wellness-primary/10 px-2 py-0.5 text-xs text-wellness-primary"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                      </div>
                    )}
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

              {/* 曜日ヘッダー - 今日が右下に来る順番 */}
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-wellness-textLight">
                {getActivityData()[0]?.map((day, index) => (
                  <div key={index}>
                    {
                      ["日", "月", "火", "水", "木", "金", "土"][
                        day.date.getDay()
                      ]
                    }
                  </div>
                ))}
              </div>

              {/* アクティビティグリッド */}
              <div className="space-y-2">
                {getActivityData().map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIndex) => {
                      // 改善されたサイズ計算: 1投稿=30%, 2投稿=50%, 3投稿=70%, 4投稿=85%, 5投稿以上=100%
                      let sizePercent;
                      if (day.count === 0) sizePercent = 0;
                      else if (day.count === 1) sizePercent = 30;
                      else if (day.count === 2) sizePercent = 50;
                      else if (day.count === 3) sizePercent = 70;
                      else if (day.count === 4) sizePercent = 85;
                      else sizePercent = 100;

                      const circleSize =
                        sizePercent > 0
                          ? Math.max(12, Math.floor(40 * (sizePercent / 100)))
                          : 0; // 最小12px、最大40px

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

        {/* 削除確認モーダル */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setEntryToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}
