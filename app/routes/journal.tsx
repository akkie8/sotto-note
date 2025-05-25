import { json, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ジャーナル</h1>

        {/* 新規エントリーフォーム */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <Form method="post" className="space-y-6">
            <div>
              <label
                htmlFor="mood-selector"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                今日の気分
              </label>
              <div id="mood-selector" className="flex space-x-4">
                {Object.entries(moodEmojis).map(([mood, emoji]) => (
                  <button
                    key={mood}
                    type="button"
                    className={`p-2 rounded-full ${
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                今日の記録
              </label>
              <textarea
                id="content"
                name="content"
                rows={4}
                className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
                placeholder="今日はどんな一日でしたか？"
              />
            </div>

            {actionData?.error && (
              <p className="text-red-500 text-sm">{actionData.error}</p>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <time className="text-sm text-gray-500">{entry.date}</time>
                <span className="text-2xl">
                  {moodEmojis[entry.mood as keyof typeof moodEmojis]}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
