import { useEffect, useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useParams } from "@remix-run/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { openai } from "~/lib/openai.server";
import { moodColors } from "../moodColors";
import type { JournalEntry } from "./journal";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = await request.json();
    const { content } = body;
    if (!content || typeof content !== "string") {
      return json({ error: "内容がありません" }, { status: 400 });
    }
    const openaiMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "あなたは共感的なセラピストです。ユーザーの気持ちをやさしく受け止めてください。",
      },
      {
        role: "user",
        content,
      },
    ];
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: openaiMessages,
    });
    const reply =
      completion.choices[0].message?.content ?? "うまく返答できませんでした。";
    return json({ reply });
  } catch (err: unknown) {
    // ここで必ずJSONで返す
    return json(
      { error: err instanceof Error ? err.message : "サーバーエラー" },
      { status: 500 }
    );
  }
};

export default function CounselingRoom() {
  const { id } = useParams();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [aiReply, setAiReply] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const storedEntries = localStorage.getItem("journalEntries");
    if (storedEntries) {
      const entries: JournalEntry[] = JSON.parse(storedEntries);
      const found = entries.find((e) => e.id === id);
      setEntry(found ?? null);
    }
  }, [id]);

  const handleAskAI = async () => {
    if (!entry) return;
    setLoading(true);
    setError("");
    setAiReply("");
    try {
      const res = await fetch(window.location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: entry.content }),
      });
      const data = await res.json();
      if (data.reply) {
        setAiReply(data.reply);
      } else {
        setError("AIからの返答がありませんでした。");
      }
    } catch (e) {
      setError(
        "AIとの通信に失敗しました。" +
          (e instanceof Error ? `\n${e.message}` : "")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!entry) {
    return (
      <div className="p-8 text-center text-gray-500">
        エントリーが見つかりません
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <div className="mb-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">{entry.date}</span>
            <span className="text-xs text-gray-400">
              {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className={`text-xs font-medium ${moodColors[entry.mood as keyof typeof moodColors]?.color || "bg-slate-100"} ${moodColors[entry.mood as keyof typeof moodColors]?.ringColor ? "ring-1 " + moodColors[entry.mood as keyof typeof moodColors].ringColor : ""} ${moodColors[entry.mood as keyof typeof moodColors]?.label ? "text-gray-700" : "text-gray-600"}`}
            >
              {moodColors[entry.mood as keyof typeof moodColors]?.label ||
                entry.mood}
            </span>
          </div>
          <div className="mb-4 mt-2 whitespace-pre-wrap text-sm text-gray-800">
            {entry.content}
          </div>
        </div>
        <button
          className="w-full rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleAskAI}
          disabled={loading}
        >
          {loading ? "AIが考え中..." : "AIに聞いてもらう"}
        </button>
        {aiReply && (
          <div className="mt-6 whitespace-pre-wrap rounded border bg-gray-100 p-4 text-gray-800">
            <p className="mb-1 text-xs font-bold text-indigo-700">
              AIからの返答
            </p>
            <p>{aiReply}</p>
          </div>
        )}
        {error && <div className="mt-4 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
