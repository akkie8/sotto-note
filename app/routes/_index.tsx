import { useCallback, useEffect, useState } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import {
  ArrowRight,
  BookHeart,
  Bot,
  Instagram,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Twitter,
  Wind,
} from "lucide-react";

import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { getOAuthRedirectUrl } from "~/lib/config";
import { supabase } from "../lib/supabase.client";

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
  const navigate = useNavigate();
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
            setUserName((cachedProfile as { name?: string }).name || "");
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
          setUserName((profile as { name?: string }).name || "");
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

  // Show login prompt if no user - full landing page
  if (!user) {
    const handleLogin = async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) {
          console.error("[Index] handleLogin error:", error);
        }
      } catch (e) {
        console.error("[Index] handleLogin error:", e);
      }
    };

    const handleJournalClick = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          navigate("/journal/new");
        } else {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: window.location.origin,
            },
          });

          if (error) {
            console.error("[Index] handleJournalClick error:", error);
          }
        }
      } catch (e) {
        console.error("[Index] handleJournalClick error:", e);
      }
    };

    return (
      <div className="min-h-screen bg-white">
        {/* ヒーローセクション */}
        <section className="relative py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-wellness-text sm:mb-6 sm:text-4xl lg:text-5xl xl:text-6xl">
                その気持ち、
                <span className="block text-wellness-secondary">
                  そっとさんに
                </span>
                聞かせて。
              </h1>
              {/* イラスト */}
              <div className="mb-6 flex justify-center sm:mb-8">
                <img
                  src="/laying.svg"
                  alt="リラックスしている人のイラスト"
                  className="h-auto w-full max-w-[200px] sm:max-w-[250px] lg:max-w-[300px]"
                />
              </div>
              <p className="mb-6 text-base leading-relaxed text-wellness-textLight sm:mb-8 sm:text-lg lg:text-xl">
                書くだけで、心が少し軽くなる。
                <br />
                感情を否定しない、あなた専用の心のノート。
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button
                  onClick={handleJournalClick}
                  className="inline-flex items-center justify-center rounded-2xl bg-wellness-primary px-6 py-3 text-base font-semibold text-white shadow-soft transition-all hover:scale-105 hover:bg-wellness-secondary hover:shadow-gentle"
                >
                  今すぐ書いてみる
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <a
                  href="#about"
                  className="inline-flex items-center justify-center rounded-2xl border-2 border-wellness-primary/20 bg-white px-6 py-3 text-base font-semibold text-wellness-primary transition-all hover:bg-wellness-surface hover:shadow-soft"
                >
                  サービスについて知る
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* サービス概要 */}
        <section
          id="about"
          className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20"
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
              感情の&ldquo;置き場所&rdquo;、ちゃんと持ってる？
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg lg:text-xl">
              そっとノートは、日々のモヤモヤやイライラをやさしく受け止めてくれる、書くセラピー体験。
            </p>
            <div className="grid gap-4 text-left sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  ジャーナル（感情ログ）
                </h3>
                <p className="text-sm text-wellness-textLight">
                  日々の気持ちを記録し、心の動きを可視化
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  深呼吸ガイド
                </h3>
                <p className="text-sm text-wellness-textLight">
                  心を落ち着かせる呼吸法をサポート
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  AI返信（そっとさん）
                </h3>
                <p className="text-sm text-wellness-textLight">
                  あなたの気持ちに寄り添う優しい返信
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  感情可視化
                </h3>
                <p className="text-sm text-wellness-textLight">
                  気分の変化を色と形で表現
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  週次・月次レター
                </h3>
                <p className="text-sm text-wellness-textLight">
                  そっとさんからの定期的なお手紙
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  そっとポイントシステム
                </h3>
                <p className="text-sm text-wellness-textLight">
                  継続を優しく後押しする仕組み
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* そっとさんの特徴・差別化 */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
                絶対的に肯定してくれるAI「そっとさん」
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg">
                そっとさんは、あなたの気持ちをそのまま受け止めて、やさしく寄り添います。
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl bg-wellness-surface/50 p-6 sm:p-8">
                <h3 className="mb-4 text-lg font-semibold text-wellness-primary">
                  ChatGPTとの違い
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium text-wellness-text">
                        汎用AIではなく&ldquo;あなたの味方&rdquo;として設計
                      </h4>
                      <p className="text-sm text-wellness-textLight">
                        そっとさんは、あなたの感情に寄り添うことに特化したAIです
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium text-wellness-text">
                        共感・承認・やさしい言葉だけ
                      </h4>
                      <p className="text-sm text-wellness-textLight">
                        批判や否定はせず、あなたの気持ちを受け止めます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium text-wellness-text">
                        感情ログと連動したパーソナライズ
                      </h4>
                      <p className="text-sm text-wellness-textLight">
                        あなたの日々の記録を理解して、より深い共感を示します
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium text-wellness-text">
                        人格・世界観・トーンガイドあり
                      </h4>
                      <p className="text-sm text-wellness-textLight">
                        そっとさんには、一貫性のある優しい人格があります
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-wellness-primary/10 p-4">
                  <p className="text-center text-sm italic text-wellness-primary">
                    &ldquo;そっとさんに聞いてもらう&rdquo;体験
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                あなたの心に寄り添う3つの機能
              </h2>
              <p className="text-base text-wellness-textLight sm:text-lg lg:text-xl">
                書く、呼吸する、対話する。心を整えるための優しいツールたち。
              </p>
            </div>
            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              {/* ジャーナル */}
              <div className="card-soft group transition-all duration-300 hover:scale-105">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-wellness-primary/10 text-wellness-primary transition-all group-hover:bg-wellness-primary group-hover:text-white">
                  <BookHeart className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-lg font-semibold text-wellness-text sm:text-xl lg:text-2xl">
                  ジャーナル
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  書くことで、心が整う。日々の思いを言葉にすることで、自分自身をより深く理解できます。
                </p>
              </div>

              {/* 瞑想ガイド */}
              <div className="card-soft group transition-all duration-300 hover:scale-105">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-wellness-secondary/10 text-wellness-secondary transition-all group-hover:bg-wellness-secondary group-hover:text-white">
                  <Wind className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-lg font-semibold text-wellness-text sm:text-xl lg:text-2xl">
                  瞑想ガイド
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  呼吸で今に戻る。ガイド付きの呼吸法で、心を落ち着かせ、現在の瞬間に集中します。
                </p>
              </div>

              {/* AIフィードバック */}
              <div className="card-soft group transition-all duration-300 hover:scale-105">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-wellness-tertiary/10 text-wellness-tertiary transition-all group-hover:bg-wellness-tertiary group-hover:text-white">
                  <Bot className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-lg font-semibold text-wellness-text sm:text-xl lg:text-2xl">
                  AIフィードバック
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  あなたの気持ちに、そっと反応。AIがあなたの言葉に寄り添い、新しい視点を提供します。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* プロダクト体験（画面イメージ） */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                実際の体験
              </h2>
              <p className="text-base text-wellness-textLight sm:text-lg lg:text-xl">
                そっとノートでできること
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {/* 書く */}
              <div className="rounded-2xl bg-wellness-surface/30 p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/svg/book-writer.svg"
                    alt="書くイラスト"
                    className="h-12 w-12"
                  />
                  <h3 className="text-lg font-semibold text-wellness-text">
                    書く（ジャーナルUI）
                  </h3>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="mb-2 text-sm text-wellness-textLight">
                    今日の気分：もやもや
                  </p>
                  <p className="text-base text-wellness-text">
                    今日は仕事でミスをしてしまった。みんなに迷惑をかけてしまって申し訳ない気持ちでいっぱい...
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-wellness-primary/10 px-3 py-1 text-xs text-wellness-primary">
                      そっとさんに聞いてもらう
                    </span>
                    <span className="rounded-full bg-wellness-secondary/10 px-3 py-1 text-xs text-wellness-secondary">
                      保存する
                    </span>
                  </div>
                </div>
              </div>

              {/* 呼吸する */}
              <div className="rounded-2xl bg-wellness-surface/30 p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/meditating.svg"
                    alt="瞑想イラスト"
                    className="h-12 w-12"
                  />
                  <h3 className="text-lg font-semibold text-wellness-text">
                    呼吸する（呼吸アニメーション）
                  </h3>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-wellness-secondary/20">
                    <Wind className="h-12 w-12 text-wellness-secondary" />
                  </div>
                  <p className="mb-2 text-base font-medium text-wellness-text">
                    4秒吸って、7秒止めて、8秒吐く
                  </p>
                  <p className="text-sm text-wellness-textLight">
                    心を落ち着かせる478呼吸法
                  </p>
                </div>
              </div>

              {/* そっとさんと対話 */}
              <div className="rounded-2xl bg-wellness-surface/30 p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <Bot className="h-12 w-12 text-wellness-primary" />
                  <h3 className="text-lg font-semibold text-wellness-text">
                    そっとさんと対話（返信例）
                  </h3>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="mb-3 rounded-lg bg-wellness-primary/10 p-3">
                    <p className="text-sm text-wellness-text">
                      ミスをしてしまったんですね。申し訳ない気持ちになるのは、あなたが責任感のある優しい人だからです。誰でもミスはありますし、きっと周りの人もそれを理解してくれていますよ。
                    </p>
                  </div>
                  <p className="text-right text-xs text-wellness-textLight">
                    - そっとさん
                  </p>
                </div>
              </div>

              {/* 自慢モード */}
              <div className="rounded-2xl bg-wellness-surface/30 p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/levitate.svg"
                    alt="喜びのイラスト"
                    className="h-12 w-12"
                  />
                  <h3 className="text-lg font-semibold text-wellness-text">
                    自慢モード（ポジティブも安心して出せる）
                  </h3>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="mb-2 text-sm text-wellness-textLight">
                    今日の気分：うれしい！
                  </p>
                  <p className="text-base text-wellness-text">
                    プレゼンが大成功！みんなから褒められて嬉しかった！
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-wellness-tertiary/10 px-3 py-1 text-xs text-wellness-tertiary">
                      自慢モード ON
                    </span>
                    <span className="text-xs text-wellness-textLight">
                      SNSシェアOK
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ユーザーの声セクション */}
        <section className="bg-wellness-surface/50 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                ユーザーの声（想定）
              </h2>
              <p className="text-base text-wellness-textLight sm:text-lg lg:text-xl">
                そっとノートを使って、心の変化を感じた方々の声
              </p>
            </div>
            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              <div className="card-soft border-l-4 border-wellness-primary">
                <p className="mb-6 text-sm italic leading-relaxed text-wellness-textLight sm:text-base">
                  「そっとさんに&ldquo;怒っていいよ&rdquo;って言われて涙が出た。」
                </p>
                <p className="text-xs text-wellness-textLight/70">
                  #そっとノート
                </p>
              </div>
              <div className="card-soft border-l-4 border-wellness-secondary">
                <p className="mb-6 text-sm italic leading-relaxed text-wellness-textLight sm:text-base">
                  「毎晩そっとノートに気持ちを吐き出してる。何も変わってないのに、心がふっと軽くなる。」
                </p>
                <p className="text-xs text-wellness-textLight/70">
                  #そっとノート
                </p>
              </div>
              <div className="card-soft border-l-4 border-wellness-tertiary">
                <p className="mb-6 text-sm italic leading-relaxed text-wellness-textLight sm:text-base">
                  「誰にも言えなかったことを、そっとさんが聞いてくれる。」
                </p>
                <p className="text-xs text-wellness-textLight/70">
                  #そっとノート
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 開発者の想い */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-8 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                開発者の想い
              </h2>
              <div className="mx-auto max-w-3xl space-y-4 text-left">
                <p className="text-base leading-relaxed text-wellness-textLight sm:text-lg">
                  誰かに気持ちを話して&ldquo;それでいいんだよ&rdquo;って言われただけで救われたことがあります。
                </p>
                <p className="text-base leading-relaxed text-wellness-textLight sm:text-lg">
                  だから私は、誰の心にも寄り添える&ldquo;そっとさん&rdquo;をつくりました。
                </p>
                <p className="text-base font-medium leading-relaxed text-wellness-primary sm:text-lg">
                  あなたの毎日に、そっと寄り添えますように。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* プラン紹介 */}
        <section className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                プラン紹介
              </h2>
              <p className="text-base text-wellness-textLight sm:text-lg lg:text-xl">
                あなたのペースで、心のケアを始められます
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {/* 無料プラン */}
              <div className="rounded-2xl bg-white p-6 shadow-soft sm:p-8">
                <div className="mb-4 text-center">
                  <h3 className="mb-2 text-xl font-bold text-wellness-text sm:text-2xl">
                    無料プラン
                  </h3>
                  <p className="text-3xl font-bold text-wellness-primary">
                    ¥0<span className="text-base font-normal">/月</span>
                  </p>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      ジャーナル無制限
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      呼吸ガイド
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      そっとさんからの返信（ライト：月5回まで）
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      月次レポート（簡易版）
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      自慢モード（返信なし・SNS共有OK）
                    </span>
                  </li>
                </ul>
                <button
                  onClick={handleJournalClick}
                  className="w-full rounded-xl bg-wellness-primary/10 py-3 text-center font-medium text-wellness-primary transition-all hover:bg-wellness-primary/20"
                >
                  今すぐ始める
                </button>
              </div>

              {/* プレミアムプラン */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-wellness-primary to-wellness-secondary p-6 text-white shadow-soft sm:p-8">
                <div className="absolute right-0 top-0 rounded-bl-xl bg-wellness-tertiary px-3 py-1 text-xs font-medium">
                  おすすめ
                </div>
                <div className="mb-4 text-center">
                  <h3 className="mb-2 text-xl font-bold sm:text-2xl">
                    プレミアム
                  </h3>
                  <p className="text-3xl font-bold">
                    ¥480<span className="text-base font-normal">/月</span>
                  </p>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">
                      そっとさんの返事：無制限＋パーソナライズ
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">詳細な感情分析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">週次・月次レター（フル）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">データエクスポート</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">癒し音声</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-white/20 p-1">
                      <div className="h-full w-full rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm">
                      ポイントでプレミア体験も可能
                    </span>
                  </li>
                </ul>
                <button className="w-full rounded-xl bg-white py-3 text-center font-medium text-wellness-primary transition-all hover:bg-white/90">
                  プレミアムを試す
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* そっとポイントシステム */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
                そっとポイントシステム
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg">
                継続を優しく後押しする仕組み
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-wellness-surface/50 p-6">
                  <h3 className="mb-4 font-semibold text-wellness-primary">
                    ポイントが貯まる行動
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-primary/10 px-2 py-0.5 text-xs font-medium text-wellness-primary">
                        +10pt
                      </span>
                      毎日投稿
                    </li>
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-primary/10 px-2 py-0.5 text-xs font-medium text-wellness-primary">
                        +5pt
                      </span>
                      深呼吸エクササイズ
                    </li>
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-primary/10 px-2 py-0.5 text-xs font-medium text-wellness-primary">
                        +20pt
                      </span>
                      SNS投稿
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl bg-wellness-surface/50 p-6">
                  <h3 className="mb-4 font-semibold text-wellness-secondary">
                    ポイントで体験できること
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-secondary/10 px-2 py-0.5 text-xs font-medium text-wellness-secondary">
                        50pt
                      </span>
                      そっとさんからの追加返信
                    </li>
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-secondary/10 px-2 py-0.5 text-xs font-medium text-wellness-secondary">
                        100pt
                      </span>
                      週次レポートの詳細版
                    </li>
                    <li className="flex items-center gap-2 text-sm text-wellness-textLight">
                      <span className="rounded-full bg-wellness-secondary/10 px-2 py-0.5 text-xs font-medium text-wellness-secondary">
                        200pt
                      </span>
                      プレミアム機能1日体験
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-wellness-primary/10 p-4 text-center">
                <p className="text-sm text-wellness-primary">
                  継続・拡散・習慣化をやさしく後押し
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 週次・月次レター */}
        <section className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
                週次・月次レター
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg">
                そっとさんからの&ldquo;今週のあなた&rdquo;手紙
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl bg-white p-6 shadow-soft sm:p-8">
                <div className="mb-6 rounded-lg bg-wellness-surface p-4">
                  <p className="mb-2 text-sm font-medium text-wellness-primary">
                    そっとさんからのお手紙
                  </p>
                  <p className="text-sm leading-relaxed text-wellness-textLight">
                    今週もお疲れさまでした。今週は5回も気持ちを書いてくれましたね。
                    特に水曜日の「もやもや」な気持ち、よく言葉にしてくれました。
                    あなたがよく使った言葉は「疲れた」「でも」「頑張る」でした。
                    来週も、無理せずあなたのペースで過ごしてくださいね。
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="mb-1 text-xs text-wellness-textLight">
                      感情傾向
                    </p>
                    <p className="font-medium text-wellness-primary">
                      穏やか寄り
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-xs text-wellness-textLight">
                      よく使った言葉
                    </p>
                    <p className="font-medium text-wellness-secondary">
                      「ありがとう」
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-xs text-wellness-textLight">
                      曜日別アドバイス
                    </p>
                    <p className="font-medium text-wellness-tertiary">
                      月曜は優しく
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-wellness-textLight">
                  継続率UP・自己肯定感UP・SNSでの拡散導線
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* プライバシーセクション */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
                プライバシー・安心設計
              </h2>
              <p className="mb-8 text-base text-wellness-textLight sm:mb-12 sm:text-lg lg:text-xl">
                あなたの大切な思いを、安全に守ります
              </p>
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="rounded-2xl bg-wellness-surface p-6 shadow-soft">
                  <p className="text-center text-base font-medium text-wellness-text">
                    そっとノートは、投稿内容を勝手に公開・販売・AI学習に利用しません
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4 shadow-soft">
                    <h3 className="mb-2 font-medium text-wellness-primary">
                      データの扱い
                    </h3>
                    <p className="text-sm text-wellness-textLight">
                      AI返信に使われる文章は第三者に共有されません
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-soft">
                    <h3 className="mb-2 font-medium text-wellness-primary">
                      免責事項
                    </h3>
                    <p className="text-sm text-wellness-textLight">
                      医療行為ではなく、診断・治療は行いません
                    </p>
                  </div>
                </div>
                <p className="text-center text-sm text-wellness-textLight">
                  年齢制限・利用規約・免責事項を明記
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SNS・シェア導線 */}
        <section className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
              みんなとつながる
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg">
              今日もそっとさんに全肯定された。心がちょっと軽くなった。
            </p>
            <div className="flex flex-col items-center gap-4">
              <p className="text-xl font-medium text-wellness-primary">
                #そっとノート
              </p>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com/intent/tweet?text=今日もそっとさんに全肯定された。心がちょっと軽くなった。%0A%23そっとノート&url="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-wellness-primary text-white transition-all hover:scale-110 hover:bg-wellness-secondary"
                >
                  <Twitter size={20} />
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-wellness-primary text-white transition-all hover:scale-110 hover:bg-wellness-secondary"
                >
                  <Instagram size={20} />
                </a>
              </div>
              <button
                onClick={handleJournalClick}
                className="inline-flex items-center justify-center rounded-2xl bg-wellness-primary px-6 py-3 text-base font-semibold text-white shadow-soft transition-all hover:scale-105 hover:bg-wellness-secondary hover:shadow-gentle"
              >
                今すぐ書いてみる
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 最後のCTAセクション */}
        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold text-wellness-text sm:mb-6 sm:text-4xl lg:text-5xl">
              そっと、始めてみませんか？
            </h2>
            <p className="mb-8 text-base text-wellness-textLight sm:mb-12 sm:text-lg lg:text-xl">
              あなたの心の声に耳を傾ける時間を作りましょう
            </p>
            <button
              onClick={handleLogin}
              className="btn-wellness rounded-2xl px-8 py-3 text-base sm:px-12 sm:py-4 sm:text-lg"
            >
              Googleアカウントで始める
            </button>
            <p className="mt-6 text-sm text-wellness-textLight/70">
              無料でご利用いただけます
            </p>
          </div>
        </section>
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
          <div className="space-y-2">
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
                  className="border-b border-wellness-primary/10 pb-2 pt-1 transition-all hover:bg-wellness-surface/50"
                >
                  <div className="mb-1 flex items-center justify-between">
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
                  </div>
                  <Link to={`/journal/${entry.id}`} className="block">
                    <p className="line-clamp-2 text-sm leading-relaxed text-wellness-text">
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
