import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { toast } from "sonner";

import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";
import { moodColors } from "../moodColors";

export type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Just try to get server-side user, but don't enforce it
  const { user } = await getOptionalUser(request);
  return json({ serverUser: user });
}

export const action: ActionFunction = async ({ request }) => {
  console.log("[journal.action] Starting journal action");

  // Use getOptionalUser instead of requireAuth to handle auth consistently
  const { user, headers, supabase } = await getOptionalUser(request);

  if (!user) {
    console.log("[journal.action] No user found, returning error");
    return json(
      { error: "ログインが必要です。ページを再読み込みしてください。" },
      { headers }
    );
  }

  console.log("[journal.action] Auth successful, user:", user.id);

  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  console.log("[journal.action] Form data:", {
    contentLength: typeof content === "string" ? content.length : "not string",
    mood,
    contentPreview:
      typeof content === "string" ? content.substring(0, 50) + "..." : content,
  });

  if (!content || typeof content !== "string" || !content.trim()) {
    console.log("[journal.action] Content validation failed");
    return json({ error: "内容を入力してください" }, { headers });
  }

  if (!mood || typeof mood !== "string") {
    console.log("[journal.action] Mood validation failed");
    return json({ error: "気分を選択してください" }, { headers });
  }

  const now = Date.now();
  const date = new Date(now).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  console.log("[journal.action] Attempting to insert journal entry");
  const { error } = await supabase.from("journals").insert([
    {
      user_id: user.id,
      content: content.trim(),
      mood,
      timestamp: now,
      date,
    },
  ]);

  if (error) {
    console.error("[journal.action] Database insert error:", error);
    return json({ error: "投稿に失敗しました: " + error.message }, { headers });
  }

  console.log("[journal.action] Journal entry created successfully");
  return json({ success: true, content, mood }, { headers });
};

export default function Journal() {
  const { serverUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [content, setContent] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check client-side authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle client-side form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    if (!content.trim()) {
      toast.error("内容を入力してください");
      return;
    }

    try {
      const now = Date.now();
      const date = new Date(now).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const { error } = await supabase.from("journals").insert([
        {
          user_id: user.id,
          content: content.trim(),
          mood: selectedMood,
          timestamp: now,
          date,
        },
      ]);

      if (error) {
        console.error("Database insert error:", error);
        toast.error("投稿に失敗しました: " + error.message);
        return;
      }

      // Success
      setSelectedMood("neutral");
      setContent("");
      toast.success("保存しました");

      // Clear cache to ensure fresh data on home page
      cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));

      navigate("/");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("投稿に失敗しました");
    }
  };

  useEffect(() => {
    if (actionData?.success) {
      const form = document.getElementById("journal-form") as HTMLFormElement;
      form.reset();
      setSelectedMood("neutral");
      setContent("");
      toast.success("保存しました");

      // Clear cache to ensure fresh data on home page
      if (user) {
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
      }

      navigate("/");
    }
  }, [actionData, navigate, user]);

  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">ジャーナル</h1>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">ジャーナル</h1>
          <p className="mb-6 text-gray-600">ログインが必要です</p>
          <Link
            to="/about"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm">
        <div className="px-6 py-2">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {content.length} 文字
              </span>
              <button
                type="submit"
                form="journal-form"
                disabled={!content.trim()}
                className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col px-6">
        <form
          onSubmit={handleSubmit}
          id="journal-form"
          className="flex flex-1 flex-col"
        >
          {/* Mood Selector - Compact */}
          <div className="py-3">
            <div className="mb-2 flex items-center gap-3">
              <span className="whitespace-nowrap text-xs font-medium text-gray-600">
                今の気分
              </span>
              <div className="flex gap-1 overflow-x-auto">
                {Object.entries(moodColors).map(
                  ([mood, { color, hoverColor, label }]) => (
                    <button
                      key={mood}
                      type="button"
                      className={`flex-shrink-0 rounded px-2 py-1 text-xs transition-all ${color} ${
                        selectedMood === mood
                          ? `text-gray-700`
                          : `${hoverColor} text-gray-500`
                      }`}
                      onClick={() => setSelectedMood(mood)}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Writing Area - Main Focus */}
          <div className="flex flex-1 flex-col pb-4">
            <div className="relative flex-1">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-full min-h-[60vh] w-full resize-none bg-transparent p-3 text-sm leading-relaxed text-gray-700 placeholder-gray-400 focus:outline-none"
                placeholder="今日はどんな一日でしたか？&#10;&#10;思ったことや感じたことを、ここに自由に書いてみてください...&#10;&#10;あなたの心の声に耳を傾けて、素直な気持ちを記録しましょう。"
                autoFocus
                spellCheck="false"
                style={{
                  fontFamily:
                    '"Hiragino Sans", "ヒラギノ角ゴシック", "Yu Gothic", "游ゴシック", sans-serif',
                  lineHeight: 1.7,
                }}
              />

              {/* Writing Guidelines */}
              {!content && (
                <div className="absolute bottom-4 left-4 right-4 space-y-1 text-xs text-gray-400">
                  <p>💡 書き方のヒント:</p>
                  <p>• 今日あった出来事や感じたこと</p>
                  <p>• 心に残った瞬間や気づき</p>
                  <p>• 感謝したいことや嬉しかったこと</p>
                  <p>• 悩みや不安、モヤモヤした気持ち</p>
                </div>
              )}
            </div>

            {/* Writing Stats & Tips */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{content.split("\n").length} 行</span>
                <span>{content.replace(/\s/g, "").length} 文字</span>
              </div>
              <div className="text-xs text-gray-400">気持ちを込めて ✨</div>
            </div>
          </div>
        </form>
      </div>

      {/* Floating Action Hints */}
      {content.length > 50 && (
        <div className="fixed bottom-4 right-4 animate-pulse rounded bg-gray-800 px-2 py-1 text-xs text-white">
          いい感じです！✨
        </div>
      )}
    </div>
  );
}
