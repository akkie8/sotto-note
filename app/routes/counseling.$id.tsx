import { useEffect, useState } from "react";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { openai } from "~/lib/openai.server";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAuth(request);

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
    return json(
      { error: err instanceof Error ? err.message : "サーバーエラー" },
      { status: 500 }
    );
  }
};

export default function CounselingRoom() {
  const { serverUser, journalId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any>(null);
  const [aiReply, setAiReply] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<{ id: string } | null>(serverUser);

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

  const handleAskAI = async () => {
    if (!entry) return;
    setAiLoading(true);
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
      setAiLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            AI カウンセリング
          </h1>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            AI カウンセリング
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
      <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-gray-50 to-white px-4 py-8">
        <div className="text-center text-gray-500">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            AI カウンセリング
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
          disabled={aiLoading}
        >
          {aiLoading ? "AIが考え中..." : "AIに聞いてもらう"}
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

        <div className="mt-4">
          <button
            onClick={() => navigate("/")}
            className="w-full rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
