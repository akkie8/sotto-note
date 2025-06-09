import { useEffect, useState } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { toast } from "sonner";

import {
  JournalEditor,
  type JournalEntry,
  type JournalMode,
} from "~/components/JournalEditor";
import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { openai } from "~/lib/openai.server";
import { supabase } from "../lib/supabase.client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await getOptionalUser(request);
  const { id } = params;

  return Response.json({
    serverUser: user,
    journalId: id,
  });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { user, supabase: serverSupabase } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    return Response.json({ error: "IDが見つかりません" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type");

  // AI相談のリクエスト
  if (contentType?.includes("application/json")) {
    try {
      const body = await request.json();
      const { content } = body;
      if (!content || typeof content !== "string") {
        return Response.json({ error: "内容がありません" }, { status: 400 });
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
        completion.choices[0].message?.content ??
        "うまく返答できませんでした。";
      return Response.json({ reply });
    } catch (err: unknown) {
      return Response.json(
        { error: err instanceof Error ? err.message : "サーバーエラー" },
        { status: 500 }
      );
    }
  }

  // フォームデータの処理（新規作成・更新）
  const formData = await request.formData();
  const content = formData.get("content");
  const mood = formData.get("mood");

  if (!content || typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "内容を入力してください" }, { status: 400 });
  }

  if (!mood || typeof mood !== "string") {
    return Response.json({ error: "気分を選択してください" }, { status: 400 });
  }

  try {
    // 新規作成の場合
    if (id === "new") {
      const { data, error } = await serverSupabase
        .from("journals")
        .insert({
          content: content.trim(),
          mood,
          user_id: user.id,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString("ja-JP"),
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        return Response.json({ error: "保存に失敗しました" }, { status: 500 });
      }

      return Response.json({ success: true, redirect: `/journal/${data.id}` });
    }

    // 更新の場合
    const { error } = await serverSupabase
      .from("journals")
      .update({
        content: content.trim(),
        mood,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update error:", error);
      return Response.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Action error:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
};

export default function JournalPage() {
  const { serverUser, journalId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<JournalMode>(
    journalId === "new" ? "new" : "view"
  );
  const [saving, setSaving] = useState(false);
  const [aiReply, setAiReply] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const isNewEntry = journalId === "new";

  useEffect(() => {
    const checkAuthAndFetchEntry = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        // 新規作成の場合はデータ取得をスキップ
        if (isNewEntry) {
          setLoading(false);
          return;
        }

        if (clientUser && journalId) {
          // Check cache first
          const cacheKey = CACHE_KEYS.JOURNAL_ENTRY(journalId);
          const cachedEntry = cache.get(cacheKey);

          if (cachedEntry) {
            setEntry(cachedEntry as JournalEntry);
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
            const journalEntry: JournalEntry = {
              id: data.id,
              content: data.content,
              mood: data.mood,
              timestamp: data.timestamp,
              date: data.date,
              user_id: data.user_id,
            };
            setEntry(journalEntry);
            // Cache the entry for 15 minutes
            cache.set(cacheKey, journalEntry, 15 * 60 * 1000);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchEntry();
  }, [journalId, isNewEntry]);

  const handleSave = async (content: string, mood: string) => {
    if (!content.trim()) {
      toast.error("内容を入力してください");
      return;
    }

    if (!mood) {
      toast.error("気分を選択してください");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("mood", mood);

      const response = await fetch(`/journal/${journalId}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "保存に失敗しました");
        return;
      }

      if (isNewEntry && data.redirect) {
        // 新規作成の場合はリダイレクト
        toast.success("保存しました");
        navigate(data.redirect);
      } else {
        // 更新の場合は状態を更新
        if (entry) {
          const updatedEntry: JournalEntry = {
            ...entry,
            content: content.trim(),
            mood,
          };
          setEntry(updatedEntry);
        }
        setMode("view");
        toast.success("更新しました");

        // Clear cache
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRY(journalId));
        if (user) {
          cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isNewEntry) {
      navigate("/");
    } else {
      setMode("view");
    }
  };

  const handleEdit = () => {
    setMode("edit");
  };

  const handleAskAI = async () => {
    if (!entry?.content) return;

    setAiLoading(true);
    setError("");

    try {
      const response = await fetch(`/journal/${journalId || "new"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: entry.content }),
      });

      const data = await response.json();

      if (response.ok) {
        setAiReply(data.reply || "");
      } else {
        setError(data.error || "エラーが発生しました");
      }
    } catch (err) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setAiLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    navigate("/");
    return null;
  }

  // 新規作成の場合はentryがnullでもOK
  if (!isNewEntry && !entry) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">エントリーが見つかりません</p>
      </div>
    );
  }

  return (
    <JournalEditor
      mode={mode}
      entry={entry || undefined}
      onSave={handleSave}
      onCancel={handleCancel}
      onEdit={handleEdit}
      onAskAI={handleAskAI}
      aiLoading={aiLoading}
      saving={saving}
      aiReply={aiReply}
      error={error}
    />
  );
}
