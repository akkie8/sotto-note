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
  Moon,
  PenTool,
  RefreshCw,
  Smile,
  Sun,
  Sunrise,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { DeleteConfirmModal } from "~/components/DeleteConfirmModal";
import { Loading } from "~/components/Loading";
import { ThreeDotsMenu } from "~/components/ThreeDotsMenu";
import { getOptionalUser } from "~/lib/auth.server";
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
  // Just try to get server-side user, but don't enforce it
  const { user } = await getOptionalUser(request);

  return json({
    serverUser: user,
  });
}

export const meta: MetaFunction = () => {
  return [
    { title: "そっとノート - メンタルヘルス対応ジャーナリングアプリ" },
    {
      name: "description",
      content: "心の記録と整理ができるメンタルヘルス対応のジャーナリングアプリ。そっとさんAIが感情に寄り添い、深呼吸ガイドで心を整えます。無料でご利用いただけます。",
    },
    {
      name: "keywords",
      content: "ジャーナリング,メンタルヘルス,心の整理,AI,深呼吸,ストレス軽減,感情記録,無料,そっとノート",
    },
    {
      name: "robots",
      content: "index,follow",
    },
    {
      name: "author",
      content: "そっとノート",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0",
    },
    {
      property: "og:title",
      content: "そっとノート - メンタルヘルス対応ジャーナリングアプリ",
    },
    {
      property: "og:description",
      content: "心の記録と整理ができるメンタルヘルス対応のジャーナリングアプリ。そっとさんAIが感情に寄り添い、深呼吸ガイドで心を整えます。",
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:url",
      content: "https://www.sottonote.com",
    },
    {
      property: "og:image",
      content: "https://www.sottonote.com/og-image.jpg",
    },
    {
      property: "og:site_name",
      content: "そっとノート",
    },
    {
      property: "og:locale",
      content: "ja_JP",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: "そっとノート - メンタルヘルス対応ジャーナリングアプリ",
    },
    {
      name: "twitter:description",
      content: "心の記録と整理ができるメンタルヘルス対応のジャーナリングアプリ。そっとさんAIが感情に寄り添い、深呼吸ガイドで心を整えます。",
    },
    {
      name: "twitter:image",
      content: "https://www.sottonote.com/og-image.jpg",
    },
    {
      rel: "canonical",
      href: "https://www.sottonote.com",
    },
    {
      name: "google-site-verification",
      content: "YOUR_GOOGLE_VERIFICATION_CODE_HERE",
    },
    {
      name: "msvalidate.01",
      content: "YOUR_BING_VERIFICATION_CODE_HERE",
    },
  ];
};

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
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        setUser(clientUser);

        if (clientUser) {
          // ログイン済みユーザーはダッシュボードにリダイレクト
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

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

  // リアルタイム更新のサブスクリプション（ログイン済みユーザーのみ）
  useEffect(() => {
    // LPページではリアルタイム購読しない（ダッシュボードでのみ使用）
    if (!user || window.location.pathname === "/") return;

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

  // Show login prompt if no user - full landing page
  if (!user) {
    const handleJournalClick = () => {
      navigate("/login");
    };

    return (
      <div className="min-h-screen bg-white">
        {/* ヒーローセクション */}
        <header>
          <section className="relative flex min-h-screen items-center py-12 sm:py-16 lg:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* サービス名 */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-lg font-medium text-wellness-primary sm:text-xl lg:text-2xl">
                  そっとノート
                </h2>
                <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-wellness-primary/30"></div>
              </div>

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
        </header>

        {/* サービス概要 */}
        <main>
        <section
          id="about"
          className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20"
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
              感情の&ldquo;置き場所&rdquo;、
              <br />
              ちゃんと持ってる？
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-wellness-textLight sm:mb-12 sm:text-lg lg:text-xl">
              そっとノートは、日々のモヤモヤやイライラをやさしく受け止めてくれる、書くセラピー体験。
            </p>
            <div className="grid gap-4 text-left sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  ジャーナリング
                </h3>
                <p className="text-sm text-wellness-textLight">
                  日々の気持ちを自由に記録し、心の動きを可視化
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  深呼吸ガイド
                </h3>
                <p className="text-sm text-wellness-textLight">
                  カスタマイズ可能な呼吸法でストレス軽減をサポート
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  そっとさん（AI）
                </h3>
                <p className="text-sm text-wellness-textLight">
                  あなたの気持ちに寄り添う優しいAI返信（月5回）
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  タグ管理
                </h3>
                <p className="text-sm text-wellness-textLight">
                  エントリーの分類と感情パターンの整理
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  アクティビティ表示
                </h3>
                <p className="text-sm text-wellness-textLight">
                  4週間の記録継続状況を視覚的に確認
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <h3 className="mb-2 font-semibold text-wellness-primary">
                  シェア機能
                </h3>
                <p className="text-sm text-wellness-textLight">
                  そっとさんの返信を美しい画像でSNSシェア
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
                絶対的に肯定してくれる
                <br />
                AI「そっとさん」
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
                あなたの心に寄り添う
                <br />
                3つの機能
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
                  ジャーナリング
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  1500文字以内で自由に書く。タグ機能で感情パターンを整理し、記録の継続状況を視覚的に確認できます。
                </p>
              </div>

              {/* 深呼吸ガイド */}
              <div className="card-soft group transition-all duration-300 hover:scale-105">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-wellness-secondary/10 text-wellness-secondary transition-all group-hover:bg-wellness-secondary group-hover:text-white">
                  <Wind className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-lg font-semibold text-wellness-text sm:text-xl lg:text-2xl">
                  深呼吸ガイド
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  呼吸時間やサイクル数をカスタマイズ。視覚的なアニメーションで心を落ち着かせる呼吸法をサポートします。
                </p>
              </div>

              {/* そっとさん */}
              <div className="card-soft group transition-all duration-300 hover:scale-105">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-wellness-tertiary/10 text-wellness-tertiary transition-all group-hover:bg-wellness-tertiary group-hover:text-white">
                  <Bot className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-lg font-semibold text-wellness-text sm:text-xl lg:text-2xl">
                  そっとさん
                </h3>
                <p className="text-sm leading-relaxed text-wellness-textLight sm:text-base">
                  月5回まで利用可能なAI相談相手。あなたの名前を覚えて、感情に寄り添う優しい返信をしてくれます。
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wellness-primary/10">
                    <PenTool className="h-6 w-6 text-wellness-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-wellness-text">
                    書く（ジャーナル）
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wellness-secondary/10">
                    <Wind className="h-6 w-6 text-wellness-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-wellness-text">
                    呼吸する（深呼吸ガイド）
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wellness-tertiary/10">
                    <Bot className="h-6 w-6 text-wellness-tertiary" />
                  </div>
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

              {/* シェア機能 */}
              <div className="rounded-2xl bg-wellness-surface/30 p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wellness-accent/10">
                    <Smile className="h-6 w-6 text-wellness-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-wellness-text">
                    シェア機能（メッセージを画像で共有）
                  </h3>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="mb-3 rounded-lg bg-wellness-primary/10 p-3">
                    <p className="text-sm text-wellness-text">
                      あなたの努力が実を結んだのですね。素晴らしいです。
                    </p>
                    <p className="mt-2 text-right text-xs text-wellness-textLight">
                      - そっとさん
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-wellness-accent/10 px-3 py-1 text-xs text-wellness-accent">
                      画像でシェア
                    </span>
                    <span className="text-xs text-wellness-textLight">
                      Twitter・Instagram対応
                    </span>
                  </div>
                </div>
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
                  忙しい毎日の中で、自分の気持ちと向き合う時間を作るのは簡単ではありません。
                </p>
                <p className="text-base leading-relaxed text-wellness-textLight sm:text-lg">
                  そっとノートは、そんなあなたの心に静かに寄り添うためのツールです。
                </p>
                <p className="text-base font-medium leading-relaxed text-wellness-primary sm:text-lg">
                  あなたの毎日に、そっと寄り添えますように。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 機能紹介 */}
        <section className="bg-wellness-surface/30 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:text-3xl lg:text-4xl">
                v1.0.0の主な機能
              </h2>
              <p className="text-base text-wellness-textLight sm:text-lg lg:text-xl">
                すべて無料でご利用いただけます
              </p>
            </div>
            <div className="mx-auto max-w-2xl">
              {/* 現在利用可能な機能 */}
              <div className="rounded-2xl bg-white p-6 shadow-soft sm:p-8">
                <div className="mb-4 text-center">
                  <h3 className="mb-2 text-xl font-bold text-wellness-text sm:text-2xl">
                    そっとノート v1.0.0
                  </h3>
                  <p className="text-3xl font-bold text-wellness-primary">
                    ¥0<span className="text-base font-normal"> 完全無料</span>
                  </p>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      ジャーナル無制限作成・編集・削除
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      タグ管理とエントリー検索
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      カスタマイズ可能な深呼吸ガイド
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      そっとさんAI相談（月5回）
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      4週間アクティビティ表示
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-5 w-5 rounded-full bg-wellness-primary/20 p-1">
                      <div className="h-full w-full rounded-full bg-wellness-primary"></div>
                    </div>
                    <span className="text-sm text-wellness-textLight">
                      メッセージシェア機能
                    </span>
                  </li>
                </ul>
                <button
                  onClick={handleJournalClick}
                  className="w-full rounded-xl bg-wellness-primary py-3 text-center font-medium text-white transition-all hover:bg-wellness-secondary"
                >
                  今すぐ始める
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* プライバシーセクション */}
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-wellness-text sm:mb-6 sm:text-3xl lg:text-4xl">
                プライバシー・<br />安心設計
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

        {/* 最後のCTAセクション */}
        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold text-wellness-text sm:mb-6 sm:text-4xl lg:text-5xl">
              そっと、
              <br />
              始めてみませんか？
            </h2>
            <p className="mb-8 text-base text-wellness-textLight sm:mb-12 sm:text-lg lg:text-xl">
              あなたの心の声に耳を傾ける時間を作りましょう
            </p>
            <Link
              to="/login"
              className="btn-wellness rounded-2xl px-8 py-3 text-base sm:px-12 sm:py-4 sm:text-lg inline-block"
            >
              無料で始める
            </Link>
            <p className="mt-6 text-sm text-wellness-textLight/70">
              無料でご利用いただけます
            </p>
          </div>
        </section>
        </main>

        <footer className="bg-wellness-surface/30 py-8 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-wellness-textLight">
              © 2025 そっとノート. All rights reserved.
            </p>
          </div>
        </footer>
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
