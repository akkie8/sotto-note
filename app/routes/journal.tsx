import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigate, useLoaderData, Link } from "@remix-run/react";
import { toast } from "sonner";

import { moodColors } from "../moodColors";
import { requireAuth, getOptionalUser } from "~/lib/auth.server";
import { supabase } from "../lib/supabase.client";

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
  const { user, headers, supabase } = await requireAuth(request);
  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  if (!content || typeof content !== "string" || !content.trim()) {
    return json({ error: "内容を入力してください" }, { headers });
  }

  if (!mood || typeof mood !== "string") {
    return json({ error: "気分を選択してください" }, { headers });
  }

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
      mood,
      timestamp: now,
      date,
    },
  ]);

  if (error) {
    return json({ error: "投稿に失敗しました: " + error.message }, { headers });
  }

  return json({ success: true, content, mood }, { headers });
};

export default function Journal() {
  const { serverUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [content, setContent] = useState("");
  const [user, setUser] = useState<{id: string} | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check client-side authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: clientUser } } = await supabase.auth.getUser();
        setUser(clientUser);
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (actionData?.success) {
      const form = document.getElementById("journal-form") as HTMLFormElement;
      form.reset();
      setSelectedMood("neutral");
      setContent("");
      toast.success("保存しました");
      navigate("/");
    }
  }, [actionData, navigate]);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">ジャーナル</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">ジャーナル</h1>
          <p className="text-gray-600 mb-6">ログインが必要です</p>
          <Link 
            to="/about" 
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="border-b border-gray-200 pb-4 text-center text-2xl font-medium text-gray-900">
        そっとノート
      </h1>
      {/* イラスト */}
      <div className="illustration-space">
        <img
          src="/laying.svg"
          alt="リラックスしているイラスト"
          className="mx-auto h-auto w-full max-w-xs"
        />
      </div>
      {/* 新規エントリーフォーム */}
      <div className="mb-8">
        <Form
          method="post"
          id="journal-form"
          className="flex h-full flex-col"
        >
          <div className="mb-6">
            <label
              htmlFor="mood-selector"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              今の気分
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Object.entries(moodColors).map(
                ([mood, { color, hoverColor, ringColor, label }]) => (
                  <button
                    key={mood}
                    type="button"
                    className={`flex flex-col items-center rounded-md px-2 py-1.5 transition-colors ${color} ${
                      selectedMood === mood
                        ? `ring-1 ${ringColor} text-gray-700`
                        : `${hoverColor} text-gray-600`
                    }`}
                    onClick={() => setSelectedMood(mood)}
                  >
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                )
              )}
            </div>
            <input type="hidden" name="mood" value={selectedMood} />
          </div>

          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="content"
                className="text-sm font-medium text-gray-700"
              >
                今日の記録
              </label>
              <button
                type="submit"
                form="journal-form"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                保存
              </button>
            </div>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="今日はどんな一日でしたか？思ったことや感じたことを自由に書いてみてください..."
            />
          </div>
        </Form>
      </div>
    </div>
  );
}