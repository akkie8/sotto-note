import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@remix-run/react";
import { Moon, Sun, Sunrise } from "lucide-react";

import { supabase } from "../lib/supabase.client";
import { moodColors } from "../moodColors";
import type { JournalEntry } from "./journal";

function getTimeIcon(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12)
    return <Sunrise size={20} className="text-yellow-400" />;
  if (hour >= 12 && hour < 17)
    return <Sun size={20} className="text-yellow-500" />;
  return <Moon size={20} className="text-indigo-400" />;
}

export default function JournalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setEntry(null);
        return;
      }
      const { data, error } = await supabase
        .from("journals")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        setEntry(null);
        return;
      }
      setEntry(data);
    })();
  }, [id]);

  if (!entry) {
    return (
      <div className="p-8 text-center text-gray-500">
        エントリーが見つかりません
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="illustration-space">
        <img
          src="/levitate.svg"
          alt="浮遊するイラスト"
          className="mx-auto h-auto w-full max-w-xs"
        />
      </div>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{entry.date}</span>
            <span className="text-xs text-gray-400">
              {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs">{getTimeIcon(entry.timestamp)}</span>
          </div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${moodColors[entry.mood as keyof typeof moodColors]?.color || "bg-slate-100"} ${moodColors[entry.mood as keyof typeof moodColors]?.ringColor ? "ring-1 " + moodColors[entry.mood as keyof typeof moodColors].ringColor : ""} ${moodColors[entry.mood as keyof typeof moodColors]?.label ? "text-gray-700" : "text-gray-600"} `}
          >
            {moodColors[entry.mood as keyof typeof moodColors]?.label ||
              entry.mood}
          </span>
        </div>
        <div className="mb-6 whitespace-pre-wrap text-base text-gray-800">
          {entry.content}
        </div>
        <button
          className="mt-2 rounded bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
          onClick={() => navigate(-1)}
        >
          戻る
        </button>
      </div>
    </div>
  );
}
