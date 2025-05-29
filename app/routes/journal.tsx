import { useEffect, useState } from "react";
import { json, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import { toast } from "sonner";

import { supabase } from "../lib/supabase.client";
import { moodColors } from "../moodColors";

export type JournalEntry = {
  id: string;
  content: string;
  mood: string;
  timestamp: number;
  date: string;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  if (!content) {
    return json({ error: "内容を入力してください" });
  }

  return json({ success: true, content, mood });
};

export default function Journal() {
  const actionData = useActionData<typeof action>();
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [content, setContent] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      const form = document.getElementById("journal-form") as HTMLFormElement;
      form.reset();
      setSelectedMood("neutral");
      toast.success("保存しました");
      navigate("/");
    }
  }, [actionData, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = formData.get("content") as string;
    const mood = formData.get("mood") as string;

    // ログインユーザー取得
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("ログインしてください");
      return;
    }

    // SupabaseにINSERT
    const { error } = await supabase.from("journals").insert([
      {
        user_id: user.id,
        content,
        mood,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString("ja-JP"),
      },
    ]);
    if (error) {
      alert("投稿に失敗しました: " + error.message);
      return;
    }

    // 投稿後の処理（例：トップページへ遷移）
    toast.success("保存しました");
    navigate("/");
  };

  return (
    <div className="min-h-full px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="border-b border-gray-200 pb-4 text-center text-2xl font-medium text-gray-900">
        そっとノート
      </h1>

      {/* 新規エントリーフォーム */}
      <div className="mb-8">
        <Form
          method="post"
          id="journal-form"
          className="flex h-full flex-col"
          onSubmit={handleSubmit}
        >
          <div className="mb-6">
            <label
              htmlFor="mood-selector"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              今日の気分
            </label>
            <div id="mood-selector" className="grid grid-cols-6 gap-2">
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
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                disabled={!content.trim()}
              >
                保存する
              </button>
            </div>
            <textarea
              id="content"
              name="content"
              className="h-[calc(100vh-16rem)] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-base leading-relaxed text-gray-900 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              placeholder="今日はどんな一日でしたか？&#13;&#10;思ったことや感じたことを自由に書いてみましょう。"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {actionData?.error && (
            <div className="mt-2">
              <p className="text-sm text-red-500">{actionData.error}</p>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
}
