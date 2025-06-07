import { useEffect, useState } from "react";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Moon, Save, Sun, Sunrise } from "lucide-react";
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

function getTimeIcon(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12)
    return <Sunrise size={20} className="text-yellow-400" />;
  if (hour >= 12 && hour < 17)
    return <Sun size={20} className="text-yellow-500" />;
  return <Moon size={20} className="text-indigo-400" />;
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            ジャーナル詳細
          </h1>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            ジャーナル詳細
          </h1>
          <p className="mb-6 text-gray-600">ログインが必要です</p>
          <button
            onClick={() => navigate("/")}
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center text-gray-500">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            ジャーナル詳細
          </h1>
          <p>エントリーが見つかりません</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <div className="mb-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">{entry.date}</span>
            {getTimeIcon(entry.timestamp)}
            <span className="text-xs text-gray-400">
              {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {!isEditing ? (
              <span
                className={`text-xs font-medium ${
                  moodColors[entry.mood as keyof typeof moodColors]?.color ||
                  "bg-slate-100"
                } ${
                  moodColors[entry.mood as keyof typeof moodColors]?.ringColor
                    ? "ring-1 " +
                      moodColors[entry.mood as keyof typeof moodColors]
                        .ringColor
                    : ""
                } ${
                  moodColors[entry.mood as keyof typeof moodColors]?.label
                    ? "text-gray-700"
                    : "text-gray-600"
                }`}
              >
                {moodColors[entry.mood as keyof typeof moodColors]?.label ||
                  entry.mood}
              </span>
            ) : (
              <div className="flex gap-1">
                {Object.entries(moodColors).map(([mood, { color, label }]) => (
                  <button
                    key={mood}
                    type="button"
                    className={`rounded px-1.5 py-0.5 text-xs transition-all ${color} ${
                      editMood === mood
                        ? "ring-2 ring-wellness-primary"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => setEditMood(mood)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isEditing ? (
            <div className="whitespace-pre-wrap text-sm text-gray-800">
              {entry.content}
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[200px] w-full resize-none rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-wellness-primary"
              placeholder="内容を編集してください..."
            />
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => navigate("/")}
                className="flex-1 rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
              >
                戻る
              </button>
              <button
                onClick={handleEdit}
                className="rounded bg-wellness-primary px-4 py-2 text-sm text-white hover:bg-wellness-secondary"
              >
                編集
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex-1 rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 rounded bg-wellness-primary px-4 py-2 text-sm text-white hover:bg-wellness-secondary disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "保存中..." : "保存"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* イラスト */}
      <div className="illustration-space mt-8">
        <img
          src="/levitate.gif"
          alt="浮遊するアニメーション"
          className="mx-auto h-auto w-full max-w-xs"
        />
      </div>
    </div>
  );
}
