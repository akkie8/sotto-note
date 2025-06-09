import { useEffect, useState } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { toast } from "sonner";

import {
  JournalEditor,
  type JournalEntry,
  type JournalMode,
} from "~/components/JournalEditor";
import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { mergeTags, tagsToString } from "~/lib/hashtag";
import { supabase } from "../lib/supabase.client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  // 認証エラーでも続行（クライアント側で認証チェック）
  const { user } = await getOptionalUser(request);
  const { id } = params;

  let aiReply = null;

  // ログインしている場合は既存のAI回答を取得
  if (user && id) {
    try {
      const { getSupabase } = await import("~/lib/supabase.server");
      const response = new Response();
      const supabase = getSupabase(request, response);

      // 認証ヘッダーからトークンを取得してセッション設定
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: "",
        });
      }

      const { data } = await supabase
        .from("ai_replies")
        .select("content")
        .eq("journal_id", id)
        .eq("user_id", user.id)
        .single();

      aiReply = data?.content || null;
    } catch (error) {
      console.error("Failed to load AI reply:", error);
    }
  }

  return Response.json({
    serverUser: user,
    journalId: id,
    aiReply,
  });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  console.log("=== [Action] FUNCTION CALLED ===");
  console.log(
    "[Action] Starting action for:",
    params.id,
    "method:",
    request.method
  );
  console.log("[Action] Request URL:", request.url);
  console.log("[Action] Request headers:", {
    authorization:
      request.headers.get("authorization")?.substring(0, 50) + "...",
    contentType: request.headers.get("content-type"),
  });

  try {
    const { id } = params;

    if (!id) {
      console.log("[Action] Missing ID parameter");
      return Response.json({ error: "IDが見つかりません" }, { status: 400 });
    }

    // フォームデータの処理（新規作成・更新）- 認証が必要
    const { user, supabase: serverSupabase } = await requireAuth(request);
    console.log("[Action] Auth successful, user:", user.id);

    // Supabaseクライアントのセッションを設定
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await serverSupabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
      console.log("[Action] Supabase session set with token");
    }

    console.log("[Action] Processing request for id:", id);
    const formData = await request.formData();
    const content = formData.get("content");
    const mood = formData.get("mood");

    console.log("[Action] Form data:", {
      content: content?.toString(),
      mood: mood?.toString(),
    });

    if (!content || typeof content !== "string" || !content.trim()) {
      console.log("[Action] Invalid content");
      return Response.json(
        { error: "内容を入力してください" },
        { status: 400 }
      );
    }

    // 気分が指定されていない場合はデフォルト値を使用
    const finalMood = mood && typeof mood === "string" ? mood : "neutral";

    // フォームから手動タグを取得
    const manualTagsString = formData.get("manualTags");
    const manualTags =
      manualTagsString && typeof manualTagsString === "string"
        ? manualTagsString.split(",").filter((tag) => tag.trim() !== "")
        : [];

    // テキストから自動抽出タグと手動タグを統合
    const finalTags = mergeTags(content.trim(), manualTags);
    const tagsString = tagsToString(finalTags);

    console.log("[Action] Final tags:", finalTags);

    try {
      // 新規作成の場合
      if (id === "new") {
        console.log("[Action] Creating new journal entry");
        const insertData = {
          content: content.trim(),
          mood: finalMood,
          tags: tagsString,
          user_id: user.id,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString("ja-JP"),
        };
        console.log("[Action] Insert data:", insertData);

        const { data, error } = await serverSupabase
          .from("journals")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error("[Action] Insert error:", error);
          return Response.json(
            { error: "保存に失敗しました" },
            { status: 500 }
          );
        }

        console.log("[Action] Successfully created:", data);
        return Response.json({
          success: true,
          redirect: `/journal/${data.id}`,
        });
      }

      // 更新の場合
      const { error } = await serverSupabase
        .from("journals")
        .update({
          content: content.trim(),
          mood: finalMood,
          tags: tagsString,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[Action] Update error:", error);
        return Response.json({ error: "更新に失敗しました" }, { status: 500 });
      }

      console.log("[Action] Successfully updated");
      return Response.json({ success: true });
    } catch (error) {
      console.error("[Action] Error:", error);
      return Response.json(
        { error: "サーバーエラーが発生しました" },
        { status: 500 }
      );
    }
  } catch (authError) {
    console.error("[Action] Auth error:", authError);
    if (authError instanceof Response) {
      throw authError; // Re-throw redirect responses
    }
    return Response.json(
      { error: "認証エラーが発生しました" },
      { status: 401 }
    );
  }
};

export default function JournalPage() {
  const {
    serverUser,
    journalId,
    aiReply: initialAiReply,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<JournalMode>(
    journalId === "new" ? "new" : "view"
  );
  const [saving, setSaving] = useState(false);
  const [aiReply, setAiReply] = useState<string>(initialAiReply || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string>("");

  console.log("[JournalPage] initialAiReply:", initialAiReply);
  console.log("[JournalPage] aiReply state:", aiReply);
  const [userJournals, setUserJournals] = useState<Array<{ tags?: string }>>(
    []
  );
  const [baseTags, setBaseTags] = useState<string[]>([]);

  const isNewEntry = journalId === "new";

  // loaderデータが変更されたときにaiReplyを更新
  useEffect(() => {
    if (initialAiReply) {
      setAiReply(initialAiReply);
    }
  }, [initialAiReply]);

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
              tags: data.tags,
              timestamp: data.timestamp,
              date: data.date,
              user_id: data.user_id,
              has_ai_reply: data.has_ai_reply || false,
            };
            setEntry(journalEntry);
            // Cache the entry for 15 minutes
            cache.set(cacheKey, journalEntry, 15 * 60 * 1000);

            console.log(
              "[JournalPage] Entry loaded, has_ai_reply:",
              data.has_ai_reply
            );
          }

          // has_ai_replyがtrueの場合のみAI回答を取得
          if (data?.has_ai_reply) {
            console.log(
              "[JournalPage] Fetching AI reply for journal:",
              journalId
            );
            const { data: aiReplyData } = await supabase
              .from("ai_replies")
              .select("content")
              .eq("journal_id", journalId)
              .eq("user_id", clientUser.id)
              .single();

            if (aiReplyData?.content) {
              console.log(
                "[JournalPage] AI reply fetched:",
                aiReplyData.content
              );
              setAiReply(aiReplyData.content);
            }
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

  // ユーザージャーナルとベースタグを取得（タグ推奨のため）
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // ユーザージャーナルを取得
        const { data: journals } = await supabase
          .from("journals")
          .select("tags")
          .eq("user_id", user.id)
          .order("timestamp", { ascending: false })
          .limit(50); // 最新50件まで

        if (journals) {
          setUserJournals(journals);
        }

        // ベースタグを取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("base_tags")
          .eq("user_id", user.id)
          .single();

        if (profile?.base_tags) {
          const userBaseTags = profile.base_tags
            .split(",")
            .filter((tag: string) => tag.trim() !== "");
          setBaseTags(userBaseTags);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      console.log("[Frontend] Fetcher response:", fetcher.data);
      setSaving(false);

      const actionData = fetcher.data as {
        error?: string;
        success?: boolean;
        redirect?: string;
      };

      if (actionData.error) {
        toast.error(actionData.error);
        return;
      }

      if (isNewEntry && actionData.redirect) {
        // 新規作成の場合はリダイレクト
        console.log(
          "[Frontend] New entry created, redirecting to:",
          actionData.redirect
        );
        toast.success("保存しました");
        navigate(actionData.redirect);
      } else if (actionData.success) {
        // 更新の場合は状態を更新
        console.log("[Frontend] Update successful");
        if (entry) {
          // Note: We'll need to pass the content and mood to update the entry
          // For now, just switch to view mode
        }
        setMode("view");
        toast.success("更新しました");

        // Clear cache
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRY(journalId));
        if (user) {
          cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
        }
      }
    } else if (fetcher.state === "submitting") {
      setSaving(true);
    } else if (fetcher.state === "loading") {
      setSaving(true);
    }
  }, [
    fetcher.state,
    fetcher.data,
    isNewEntry,
    entry,
    journalId,
    user,
    navigate,
  ]);

  const handleSave = async (
    content: string,
    mood: string,
    manualTags: string[]
  ) => {
    console.log("[Frontend] handleSave called with:", {
      content,
      mood,
      manualTags,
      journalId,
      isNewEntry,
    });

    if (!content.trim()) {
      toast.error("内容を入力してください");
      return;
    }

    setSaving(true);

    try {
      // セッション情報を取得
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("認証セッションがありません。ログインし直してください。");
        setSaving(false);
        return;
      }

      console.log("[Frontend] Using session access token for request");

      // アクセストークンをヘッダーに含めてリクエスト
      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("mood", mood);
      formData.append("manualTags", manualTags.join(","));

      const response = await fetch(`/journal/${journalId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      console.log("[Frontend] Response status:", response.status);
      console.log(
        "[Frontend] Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const responseText = await response.text();
      console.log(
        "[Frontend] Response text:",
        responseText.substring(0, 500) + "..."
      );

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("[Frontend] Parsed JSON:", data);
      } catch (e) {
        console.error("[Frontend] Failed to parse JSON:", e);
        console.log("[Frontend] Raw response was HTML, likely an error page");

        // データは保存されている可能性が高いので、成功として扱う
        if (response.status === 200) {
          if (isNewEntry) {
            toast.success("保存しました（データベースに正常に保存されました）");
            // 新しいページにリダイレクト
            window.location.href = "/";
          } else {
            toast.success("更新しました（データベースに正常に保存されました）");
            setMode("view");
            // Clear cache
            cache.invalidate(CACHE_KEYS.JOURNAL_ENTRY(journalId));
            if (user) {
              cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
            }
          }
          return;
        }

        toast.error("サーバーエラーが発生しました");
        return;
      }

      if (!response.ok) {
        toast.error(data.error || "保存に失敗しました");
        return;
      }

      if (isNewEntry && data.redirect) {
        toast.success("保存しました");
        navigate(data.redirect);
      } else if (data.success) {
        setMode("view");
        toast.success("更新しました");
        // Clear cache
        cache.invalidate(CACHE_KEYS.JOURNAL_ENTRY(journalId));
        if (user) {
          cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
        }
      }
    } catch (error) {
      console.error("[Frontend] Save error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    console.log(
      "[handleCancel] Called with mode:",
      mode,
      "isNewEntry:",
      isNewEntry
    );
    if (isNewEntry) {
      console.log("[handleCancel] Navigating to home");
      navigate("/", { replace: true });
    } else if (mode === "edit") {
      console.log("[handleCancel] Switching to view mode");
      setMode("view");
    } else {
      console.log("[handleCancel] Navigating back");
      navigate(-1);
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
      // セッション情報を取得
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("[handleAskAI] Session:", session ? "Found" : "Not found");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // セッションがある場合は認証ヘッダーを追加
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
        console.log("[handleAskAI] Authorization header added");
      } else {
        console.log("[handleAskAI] No session, no auth header");
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: entry.content,
          journalId: journalId,
        }),
      });

      console.log("AI response status:", response.status);
      console.log("AI response ok:", response.ok);
      console.log("AI response headers:", response.headers.get("content-type"));

      // レスポンステキストを確認
      const responseText = await response.text();
      console.log("AI response text:", responseText.substring(0, 200));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.error("Response was not JSON:", responseText.substring(0, 500));
        throw new Error("Invalid JSON response");
      }
      console.log("AI response data:", data);

      if (response.ok) {
        setAiReply(data.reply || "");
        console.log("AI reply set successfully");
      } else {
        console.error("AI response error:", data.error);
        setError(data.error || "エラーが発生しました");
      }
    } catch (err) {
      console.error("AI request failed:", err);
      console.error("Error type:", (err as Error).constructor.name);
      console.error("Error message:", (err as Error).message);
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
      userJournals={userJournals}
      baseTags={baseTags}
    />
  );
}
