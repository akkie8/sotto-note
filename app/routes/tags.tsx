import { useCallback, useEffect, useState } from "react";
import {
  json,
  type ActionFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useActionData, useLoaderData } from "@remix-run/react";
import { Filter, Hash, Plus, Search, Settings, X } from "lucide-react";
import { toast } from "sonner";

import { Loading } from "~/components/Loading";
import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "~/lib/supabase.client";

// デフォルトのベースタグ
const DEFAULT_BASE_TAGS = [
  "仕事",
  "疲れ",
  "嬉しい",
  "ストレス",
  "感謝",
  "不安",
  "楽しい",
  "悲しい",
  "怒り",
  "リラックス",
  "成長",
  "家族",
  "友達",
  "健康",
  "趣味",
];

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

// アクションデータ型
type ActionData = {
  success?: boolean;
  error?: string;
  action?: "update-base-tags";
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  return json({ serverUser: user });
}

export const action: ActionFunction = async ({ request }) => {
  const { user, headers, supabase } = await getOptionalUser(request);

  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const baseTags = formData.get("baseTags");

  switch (action) {
    case "update-base-tags":
      if (!baseTags || typeof baseTags !== "string") {
        return Response.json({ error: "タグが無効です" }, { headers });
      }

      try {
        const tagsArray = baseTags
          .split(",")
          .filter((tag: string) => tag.trim() !== "");

        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({ base_tags: tagsArray.join(",") })
          .eq("user_id", user.id)
          .select();

        if (updateError && updateError.code !== "PGRST116") {
          return Response.json(
            { error: "タグの更新に失敗しました: " + updateError.message },
            { headers }
          );
        }

        if (!updateData || updateData.length === 0) {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              base_tags: tagsArray.join(","),
            });

          if (insertError) {
            return Response.json(
              { error: "タグの保存に失敗しました: " + insertError.message },
              { headers }
            );
          }
        }

        return Response.json(
          { success: true, action: "update-base-tags" },
          { headers }
        );
      } catch (error) {
        return Response.json(
          { error: "タグの更新に失敗しました" },
          { headers }
        );
      }

    default:
      return Response.json({ error: "不正なアクションです" }, { headers });
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "タグ管理 - そっとノート" },
    {
      name: "description",
      content: "ノートのタグを管理・検索できます",
    },
  ];
};

export default function Tags() {
  const { serverUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [tagStats, setTagStats] = useState<TagStat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"count" | "recent" | "alphabetical">(
    "count"
  );
  const [activeTab, setActiveTab] = useState<"browse" | "manage">("browse");
  const [baseTags, setBaseTags] = useState<string[]>(DEFAULT_BASE_TAGS);
  const [newTag, setNewTag] = useState("");
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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

      // ベースタグを取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("base_tags")
        .eq("user_id", userId)
        .single();

      if (profile?.base_tags) {
        const userBaseTags = profile.base_tags
          .split(",")
          .filter((tag: string) => tag.trim() !== "");
        const tags = userBaseTags.length > 0 ? userBaseTags : DEFAULT_BASE_TAGS;
        setBaseTags(tags);
        setHasChanges(false);
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

  // アクション結果の処理
  useEffect(() => {
    if (actionData?.success) {
      if (actionData.action === "update-base-tags") {
        toast.success("タグを更新しました");
      }
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const addTag = () => {
    if (newTag.trim() && !baseTags.includes(newTag.trim())) {
      const newTags = [...baseTags, newTag.trim()];
      setBaseTags(newTags);
      setNewTag("");
      setHasChanges(true);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = baseTags.filter((tag) => tag !== tagToRemove);
    setBaseTags(newTags);
    setHasChanges(true);
  };

  const saveBaseTags = async () => {
    console.log("Save button clicked", { user: !!user, baseTags, hasChanges });

    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    try {
      console.log("Attempting to save tags:", baseTags.join(","));

      // まず既存のプロフィールを更新
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ base_tags: baseTags.join(",") })
        .eq("user_id", user.id)
        .select();

      if (updateError && updateError.code !== "PGRST116") {
        console.error("Base tags update error:", updateError);
        toast.error("タグの更新に失敗しました: " + updateError.message);
        return;
      }

      // 更新されたレコードがない場合は新規作成
      if (!updateData || updateData.length === 0) {
        console.log("No existing profile found, creating new one");
        const { error: insertError } = await supabase.from("profiles").insert({
          user_id: user.id,
          base_tags: baseTags.join(","),
        });

        if (insertError) {
          console.error("Base tags insert error:", insertError);
          toast.error("タグの保存に失敗しました: " + insertError.message);
          return;
        }
      }

      console.log("Tags saved successfully");
      setHasChanges(false);
      toast.success("タグを更新しました");
    } catch (error) {
      console.error("Base tags save failed:", error);
      toast.error("タグの保存に失敗しました");
    }
  };

  // ドラッグアンドドロップのハンドラー
  const handleDragStart = (e: React.DragEvent, tag: string) => {
    setDraggedTag(tag);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", tag);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    if (!draggedTag) return;

    const draggedIndex = baseTags.indexOf(draggedTag);
    if (draggedIndex === -1) return;

    const newTags = [...baseTags];
    newTags.splice(draggedIndex, 1);
    newTags.splice(targetIndex, 0, draggedTag);

    setBaseTags(newTags);
    setDraggedTag(null);
    setDragOverIndex(null);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedTag(null);
    setDragOverIndex(null);
  };

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
    return <Loading fullScreen />;
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
            あなたのノートのタグを管理・検索できます
          </p>
        </div>

        {/* タブ切り替え */}
        <div className="mb-6 flex gap-2 rounded-lg bg-wellness-primary/10 p-1">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "bg-wellness-surface text-wellness-primary shadow-sm"
                : "text-wellness-textLight hover:text-wellness-primary"
            }`}
          >
            <Hash size={16} />
            タグ一覧
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "manage"
                ? "bg-wellness-surface text-wellness-primary shadow-sm"
                : "text-wellness-textLight hover:text-wellness-primary"
            }`}
          >
            <Settings size={16} />
            タグ設定
          </button>
        </div>

        {/* コンテンツエリア */}
        {activeTab === "browse" ? (
          <>
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
                    「{selectedTag}」のノート ({filteredJournals.length}件)
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
                          {new Date(journal.timestamp).toLocaleTimeString(
                            "ja-JP",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
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
          </>
        ) : (
          /* タグ設定タブ */
          <div className="space-y-6">
            <div className="rounded-md bg-wellness-surface p-6">
              <h2 className="mb-4 text-lg font-medium text-wellness-text">
                タグ設定
              </h2>
              <p className="mb-6 text-sm text-wellness-textLight">
                ノート作成時に選択できるタグを設定できます
              </p>

              {/* 現在のタグ一覧 */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-wellness-text">
                  現在の設定タグ
                </h3>
                <p className="mb-3 text-xs text-wellness-textLight">
                  ドラッグ&ドロップで並び順を変更できます
                </p>
                <div className="flex flex-wrap gap-2">
                  {baseTags.map((tag, index) => (
                    <div
                      key={tag}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, tag)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex cursor-move items-center gap-1 rounded-full px-3 py-1 text-sm transition-all ${
                        draggedTag === tag
                          ? "scale-95 opacity-50"
                          : dragOverIndex === index
                            ? "scale-105 bg-wellness-primary/20"
                            : "bg-wellness-primary/10"
                      } hover:bg-wellness-primary/15`}
                    >
                      <span className="select-none text-wellness-primary">
                        {tag}
                      </span>
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-wellness-textLight hover:text-red-500"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* タグ追加 */}
              <div className="mb-6 flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                  placeholder="新しいタグを追加"
                  className="flex-1 rounded bg-wellness-bg px-3 py-2 text-sm text-wellness-text transition-all focus:bg-wellness-surface focus:outline-none focus:ring-2 focus:ring-wellness-primary/20"
                />
                <button
                  onClick={addTag}
                  className="flex items-center gap-1 rounded bg-wellness-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-wellness-secondary"
                >
                  <Plus size={14} />
                  追加
                </button>
              </div>

              {/* 保存ボタン */}
              <button
                onClick={saveBaseTags}
                disabled={!hasChanges}
                className={`w-full rounded px-4 py-3 text-sm font-medium transition-all ${
                  hasChanges
                    ? "bg-wellness-primary text-white hover:bg-wellness-secondary"
                    : "cursor-not-allowed bg-wellness-primary/20 text-wellness-textLight"
                }`}
              >
                {hasChanges ? "変更を保存" : "保存済み"}
              </button>
              {hasChanges && (
                <p className="mt-2 text-center text-xs text-orange-600">
                  ※ 未保存の変更があります
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
