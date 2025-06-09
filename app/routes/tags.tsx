import { useCallback, useEffect, useState } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Filter, Hash, Search, X } from "lucide-react";

import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "~/lib/supabase.client";

// ジャーナルエントリー型
type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
  tags?: string;
};

// タグ統計型
type TagStat = {
  tag: string;
  count: number;
  lastUsed: number;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  return json({ serverUser: user });
}

export const meta: MetaFunction = () => {
  return [
    { title: "タグ管理 - そっとノート" },
    {
      name: "description",
      content: "ジャーナルのタグを管理・検索できます",
    },
  ];
};

export default function Tags() {
  const { serverUser } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [tagStats, setTagStats] = useState<TagStat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"count" | "recent" | "alphabetical">(
    "count"
  );

  // ユーザーデータを取得
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // キャッシュをチェック
      const cachedJournals = cache.get<JournalEntry[]>(
        CACHE_KEYS.JOURNAL_ENTRIES(userId)
      );

      if (cachedJournals) {
        setJournalEntries(cachedJournals);
        calculateTagStats(cachedJournals);
        return;
      }

      // ジャーナルを取得
      const { data: journals } = await supabase
        .from("journals")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false });

      if (journals) {
        cache.set(CACHE_KEYS.JOURNAL_ENTRIES(userId), journals, 5 * 60 * 1000);
        setJournalEntries(journals);
        calculateTagStats(journals);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // タグ統計を計算
  const calculateTagStats = (journals: JournalEntry[]) => {
    const tagMap = new Map<string, { count: number; lastUsed: number }>();

    journals.forEach((journal) => {
      if (journal.tags) {
        const tags = journal.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        tags.forEach((tag) => {
          const existing = tagMap.get(tag);
          if (existing) {
            tagMap.set(tag, {
              count: existing.count + 1,
              lastUsed: Math.max(existing.lastUsed, journal.timestamp),
            });
          } else {
            tagMap.set(tag, {
              count: 1,
              lastUsed: journal.timestamp,
            });
          }
        });
      }
    });

    const stats = Array.from(tagMap.entries()).map(([tag, data]) => ({
      tag,
      count: data.count,
      lastUsed: data.lastUsed,
    }));

    setTagStats(stats);
  };

  // 認証チェック
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

  // タグをソート
  const sortedTags = tagStats
    .filter((stat) =>
      stat.tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "count":
          return b.count - a.count;
        case "recent":
          return b.lastUsed - a.lastUsed;
        case "alphabetical":
          return a.tag.localeCompare(b.tag);
        default:
          return 0;
      }
    });

  // 選択されたタグでフィルタされたジャーナル
  const filteredJournals = selectedTag
    ? journalEntries.filter((journal) =>
        journal.tags
          ?.split(",")
          .map((tag) => tag.trim())
          .includes(selectedTag)
      )
    : [];

  // ローディング状態
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-transparent">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-primary">
            タグ管理
          </h1>
          <p className="text-wellness-textLight">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ログインプロンプト
  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center bg-transparent">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-primary">
            タグ管理
          </h1>
          <p className="mb-6 text-wellness-textLight">ログインが必要です</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-wellness-primary px-6 py-3 text-white transition-colors hover:bg-wellness-secondary"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-wellness-primary">
            タグ管理
          </h1>
          <p className="text-sm text-wellness-textLight">
            あなたのジャーナルのタグを管理・検索できます
          </p>
        </div>

        {/* 検索とフィルタ */}
        <div className="mb-6 space-y-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wellness-textLight" />
            <input
              type="text"
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-wellness-primary/20 bg-wellness-surface py-2 pl-10 pr-4 text-sm focus:border-wellness-primary focus:outline-none focus:ring-2 focus:ring-wellness-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wellness-textLight hover:text-wellness-text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ソートオプション */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-wellness-textLight" />
            <span className="text-xs text-wellness-textLight">並び順:</span>
            <div className="flex gap-1">
              {[
                { key: "count", label: "使用回数" },
                { key: "recent", label: "最近使用" },
                { key: "alphabetical", label: "あいうえお順" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key as typeof sortBy)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    sortBy === option.key
                      ? "bg-wellness-primary text-white"
                      : "bg-wellness-surface text-wellness-textLight hover:text-wellness-text"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* タグ一覧 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-medium text-wellness-text">
            タグ一覧 ({sortedTags.length}個)
          </h2>
          {sortedTags.length === 0 ? (
            <p className="text-center text-wellness-textLight">
              {searchQuery
                ? "検索に一致するタグがありません"
                : "まだタグがありません"}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTags.map((stat) => (
                <button
                  key={stat.tag}
                  onClick={() => setSelectedTag(stat.tag)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                    selectedTag === stat.tag
                      ? "border-wellness-primary bg-wellness-primary/5"
                      : "border-wellness-primary/20 bg-wellness-surface hover:border-wellness-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-wellness-secondary" />
                    <span className="font-medium text-wellness-text">
                      {stat.tag}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-wellness-primary">
                      {stat.count}回
                    </div>
                    <div className="text-xs text-wellness-textLight">
                      {new Date(stat.lastUsed).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 選択されたタグのジャーナル */}
        {selectedTag && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-wellness-text">
                「{selectedTag}」のジャーナル ({filteredJournals.length}件)
              </h2>
              <button
                onClick={() => setSelectedTag(null)}
                className="flex items-center gap-1 text-sm text-wellness-textLight hover:text-wellness-text"
              >
                <X size={16} />
                クリア
              </button>
            </div>
            <div className="space-y-2">
              {filteredJournals.map((journal) => (
                <Link
                  key={journal.id}
                  to={`/journal/${journal.id}`}
                  className="block rounded-lg border border-wellness-primary/10 bg-wellness-surface p-4 transition-all hover:border-wellness-primary/20 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-wellness-textLight">
                      {journal.date}
                    </span>
                    <span className="text-xs text-wellness-textLight">
                      {new Date(journal.timestamp).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-wellness-text">
                    {journal.content}
                  </p>
                  {journal.tags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {journal.tags
                        .split(",")
                        .filter((tag: string) => tag.trim())
                        .map((tag: string, index: number) => (
                          <span
                            key={index}
                            className={`rounded-md px-2 py-0.5 text-xs ${
                              tag.trim() === selectedTag
                                ? "bg-wellness-primary text-white"
                                : "bg-wellness-primary/10 text-wellness-primary"
                            }`}
                          >
                            {tag.trim()}
                          </span>
                        ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
