import { useEffect, useState } from "react";
import { useParams } from "@remix-run/react";

import { moodColors } from "../moodColors";
import type { JournalEntry } from "./journal";

export default function CounselingRoom() {
  const { id } = useParams();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const storedEntries = localStorage.getItem("journalEntries");
    if (storedEntries) {
      const entries: JournalEntry[] = JSON.parse(storedEntries);
      const found = entries.find((e) => e.id === id);
      setEntry(found ?? null);
      if (found) {
        setMessages([
          { role: "user", content: found.content },
          {
            role: "ai",
            content:
              "こんにちは。今日はどんな気持ちですか？何か話したいことがあれば教えてください。",
          },
        ]);
      }
    }
  }, [id]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: "user", content: input }]);
    setInput("");
    // ここでAIの返答をAPI経由で取得し、messagesに追加する処理を後で実装
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { role: "ai", content: "（AIの返答がここに入ります）" },
      ]);
    }, 1000);
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
          <div className="mb-2 text-xs text-gray-500">{entry.date}</div>
          <div className="mb-2 text-xs text-gray-400">
            {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[entry.mood as keyof typeof moodColors]?.color || "bg-slate-100"} ${moodColors[entry.mood as keyof typeof moodColors]?.ringColor ? "ring-1 " + moodColors[entry.mood as keyof typeof moodColors].ringColor : ""} ${moodColors[entry.mood as keyof typeof moodColors]?.label ? "text-gray-700" : "text-gray-600"}`}
          >
            {moodColors[entry.mood as keyof typeof moodColors]?.label ||
              entry.mood}
          </div>
          <div className="mb-2 mt-4 whitespace-pre-wrap border-l-4 border-indigo-200 bg-indigo-50 pl-2 text-xs text-gray-700">
            {entry.content}
          </div>
        </div>
        <div className="mb-4 flex h-64 flex-col gap-2 overflow-y-auto rounded bg-gray-50 p-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === "user" ? "text-right" : "text-left"}
            >
              <span
                className={
                  msg.role === "user"
                    ? "inline-block rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700"
                    : "inline-block rounded bg-gray-200 px-2 py-1 text-xs text-gray-700"
                }
              >
                {msg.content}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIに相談する..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button
            className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
            onClick={handleSend}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
