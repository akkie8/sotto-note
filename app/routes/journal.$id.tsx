import { useEffect, useState } from "react";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { ArrowLeft, Bot, Calendar, Clock, Edit, Save } from "lucide-react";
import { toast } from "sonner";

import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";
import { moodColors } from "../moodColors";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  const { id } = params;

  return json({
    serverUser: user,
    journalId: id,
  });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { user } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    return json({ error: "IDが見つかりません" }, { status: 400 });
  }

  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  if (!content || typeof content !== "string" || !content.trim()) {
    return json({ error: "内容を入力してください" }, { status: 400 });
  }

  if (!mood || typeof mood !== "string") {
    return json({ error: "気分を選択してください" }, { status: 400 });
  }

  try {
    const { error } = await user.supabase
      .from("journals")
      .update({
        content: content.trim(),
        mood,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update error:", error);
      return json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Action error:", error);
    return json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
};

// 時間帯に応じた背景グラデーション
function getTimeGradient(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) {
    return "from-yellow-50 to-orange-50"; // 朝
  } else if (hour >= 12 && hour < 17) {
    return "from-blue-50 to-cyan-50"; // 昼
  } else {
    return "from-purple-50 to-pink-50"; // 夜
  }
}

export default function JournalDetail() {
  const { serverUser, journalId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any>(null);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchEntry = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        if (clientUser && journalId) {
          // Check cache first
          const cacheKey = CACHE_KEYS.JOURNAL_ENTRY(journalId);
          const cachedEntry = cache.get(cacheKey);

          if (cachedEntry) {
            setEntry(cachedEntry);
            setLoading(false);
            return;
          }

          // Fetch from database if not cached
          const { data, error } = await supabase
            .from("journals")
            .select("*")
            .eq("id", journalId)
            .eq("user_id", clientUser.id)
            .single();

          if (!error && data) {
            setEntry(data);
            setEditContent(data.content);
            setEditMood(data.mood);
            // Cache the entry for 15 minutes
            cache.set(cacheKey, data, 15 * 60 * 1000);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchEntry();
  }, [journalId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error("内容を入力してください");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("journals")
        .update({
          content: editContent.trim(),
          mood: editMood,
        })
        .eq("id", journalId)
        .eq("user_id", user!.id);

      if (error) {
        toast.error("更新に失敗しました");
        return;
      }

      // Update local state
      setEntry({ ...entry, content: editContent.trim(), mood: editMood });
      setIsEditing(false);
      toast.success("更新しました");

      // Clear cache
      cache.invalidate(CACHE_KEYS.JOURNAL_ENTRY(journalId));
      if (user) {
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setIsEditing(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    navigate("/");
    return null;
  }

  if (!entry) {
    return null;
  }

  const timeGradient = getTimeGradient(entry.timestamp);
  const mood = moodColors[entry.mood as keyof typeof moodColors];

  return (
    <div className="min-h-screen bg-transparent">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">戻る</span>
          </button>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Link
                to={`/journal/view/${entry.id}`}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                title="閲覧モード"
              >
                <Bot size={18} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div
          className={`rounded-2xl bg-gradient-to-br ${timeGradient} p-6 shadow-sm`}
        >
          {/* 日付と時間 */}
          <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{entry.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>
                {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* 気分 */}
          <div className="mb-6">
            {!isEditing ? (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
                  mood?.color || "bg-gray-100 text-gray-600"
                }`}
              >
                {mood?.label || entry.mood}
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(moodColors).map(([moodKey, { color, label }]) => (
                  <button
                    key={moodKey}
                    type="button"
                    className={`rounded-full px-3 py-1 text-sm transition-all ${color} ${
                      editMood === moodKey
                        ? "ring-2 ring-offset-2 ring-wellness-primary"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setEditMood(moodKey)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 内容 */}
          <div className="prose prose-gray max-w-none">
            {!isEditing ? (
              <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
                {entry.content}
              </p>
            ) : (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] w-full resize-none rounded-lg border border-gray-200 bg-white/80 p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-wellness-primary"
                placeholder="内容を編集してください..."
              />
            )}
          </div>
        </div>

        {/* アクションエリア */}
        <div className="mt-8 space-y-3">
          {!isEditing ? (
            <>
              <button
                onClick={handleEdit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-white transition-colors hover:bg-gray-700"
              >
                <Edit size={18} />
                <span>編集する</span>
              </button>
              <Link
                to={`/journal/view/${entry.id}`}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Bot size={18} />
                <span>AIに相談する</span>
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                <Save size={18} />
                <span>{saving ? "保存中..." : "保存する"}</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
              >
                <span>キャンセル</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
