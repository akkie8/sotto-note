import { useState } from "react";
import { json, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

type JournalEntry = {
  id: string;
  date: string;
  content: string;
  mood: string;
};

// 仮のデータ（実際の実装ではデータベースを使用）
const DUMMY_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    date: "2024-03-20",
    content: "今日は新しいプロジェクトを始めました。とてもワクワクしています。",
    mood: "excited",
  },
  {
    id: "2",
    date: "2024-03-19",
    content: "静かな朝を過ごしました。瞑想をして、心が落ち着きました。",
    mood: "peaceful",
  },
];

export const loader = async () => {
  return json({ entries: DUMMY_ENTRIES });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  if (!content) {
    return json({ error: "内容を入力してください" });
  }

  // ここでデータベースに保存する処理を実装（現在は仮実装）
  console.log("Saving entry with mood:", mood);
  return json({ success: true });
};

export default function Journal() {
  const { entries } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedMood, setSelectedMood] = useState("neutral");

  const moodEmojis = {
    happy: "😊",
    peaceful: "😌",
    neutral: "😐",
    sad: "😢",
    excited: "🤩",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">ジャーナル</h1>

        {/* 新規エントリーフォーム */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <Form method="post" className="space-y-6">
            <div>
              <label
                htmlFor="mood-selector"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                今日の気分
              </label>
              <div id="mood-selector" className="flex space-x-4">
                {Object.entries(moodEmojis).map(([mood, emoji]) => (
                  <button
                    key={mood}
                    type="button"
                    className={`rounded-full p-2 ${
                      selectedMood === mood
                        ? "bg-indigo-100 ring-2 ring-indigo-500"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedMood(mood)}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="mood" value={selectedMood} />
            </div>

            <div>
              <label
                htmlFor="content"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                今日の記録
              </label>
              <textarea
                id="content"
                name="content"
                rows={4}
                className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="今日はどんな一日でしたか？"
              />
            </div>

            {actionData?.error && (
              <p className="text-sm text-red-500">{actionData.error}</p>
            )}

            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              記録を保存
            </button>
          </Form>
        </div>

        {/* 過去のエントリー一覧 */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">過去の記録</h2>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <time className="text-sm text-gray-500">{entry.date}</time>
                <span className="text-2xl">
                  {moodEmojis[entry.mood as keyof typeof moodEmojis]}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-gray-700">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
