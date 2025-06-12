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
import { Loading } from "~/components/Loading";
import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { mergeTags, tagsToString } from "~/lib/hashtag";
import { supabase } from "../lib/supabase.client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Get user (any role) - client will handle role check
  const { user } = await getOptionalUser(request);
  const { id } = params;

  let aiReply = null;
  const aiUsageInfo = {
    remainingCount: null as number | null,
    monthlyLimit: null as number | null,
    isAdmin: false,
  };

  // ログインしている場合
  if (user) {
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

      // 既存のジャーナルの場合はAI回答を取得
      if (id && id !== "new") {
        const { data } = await supabase
          .from("ai_replies")
          .select("content")
          .eq("journal_id", id)
          .eq("user_id", user.id)
          .single();

        aiReply = data?.content || null;
      }

      // ユーザーのロールと使用状況を取得（新規・既存どちらでも）
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const userRole = profile?.role || "free";
      aiUsageInfo.isAdmin = userRole === "admin";

      // adminユーザー以外は使用回数を計算
      if (userRole !== "admin") {
        aiUsageInfo.monthlyLimit = 5;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from("ai_replies")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        const currentCount = count || 0;
        aiUsageInfo.remainingCount = Math.max(0, aiUsageInfo.monthlyLimit - currentCount);
      }
    } catch (error) {
      // Failed to load AI reply or usage info
      console.error("Error in loader:", error);
    }
  }

  return Response.json({
    serverUser: user,
    journalId: id,
    aiReply,
    aiUsageInfo,
  });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { id } = params;

    if (!id) {
      return Response.json({ error: "IDが見つかりません" }, { status: 400 });
    }

    // フォームデータの処理（新規作成・更新）- 認証が必要
    const { user, supabase: serverSupabase } = await getOptionalUser(request);

    if (!user) {
      return Response.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Supabaseクライアントのセッションを設定
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await serverSupabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }

    const formData = await request.formData();
    const content = formData.get("content");
    const mood = formData.get("mood");

    if (!content || typeof content !== "string" || !content.trim()) {
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

    try {
      // 新規作成の場合
      if (id === "new") {
        const insertData = {
          content: content.trim(),
          mood: finalMood,
          tags: tagsString,
          user_id: user.id,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString("ja-JP"),
        };

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
    aiUsageInfo,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);

  // URLパラメータから編集モードを判定（クライアントサイドのみ）
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setEditMode(searchParams.get("mode") === "edit");
    }
  }, []);

  const [mode, setMode] = useState<JournalMode>(
    journalId === "new" ? "new" : "view"
  );

  // editModeが変更されたときにmodeを更新
  useEffect(() => {
    if (journalId !== "new") {
      setMode(editMode ? "edit" : "view");
    }
  }, [editMode, journalId]);
  const [saving, setSaving] = useState(false);
  const [aiReply, setAiReply] = useState<string>(initialAiReply || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [userJournals, setUserJournals] = useState<Array<{ tags?: string }>>(
    []
  );
  const [baseTags, setBaseTags] = useState<string[]>([]);
  const [clientAiUsageInfo, setClientAiUsageInfo] = useState(aiUsageInfo);

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

        // ユーザーがいない場合はホームにリダイレクト
        if (!clientUser) {
          navigate("/");
          return;
        }

        // AI使用状況を取得
        try {
          // ユーザーのロールを取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", clientUser.id)
            .single();

          const userRole = profile?.role || "free";
          const isAdmin = userRole === "admin";

          // adminユーザー以外は使用回数を計算
          if (!isAdmin) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count } = await supabase
              .from("ai_replies")
              .select("*", { count: "exact", head: true })
              .eq("user_id", clientUser.id)
              .gte("created_at", startOfMonth.toISOString());

            const currentCount = count || 0;
            setClientAiUsageInfo({
              remainingCount: Math.max(0, 5 - currentCount),
              monthlyLimit: 5,
              isAdmin: false,
            });
          } else {
            setClientAiUsageInfo({
              remainingCount: null,
              monthlyLimit: null,
              isAdmin: true,
            });
          }
        } catch (error) {
          console.error("Error fetching AI usage info:", error);
        }

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
  }, [journalId, isNewEntry, navigate]);

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
      } catch (e) {
        console.error("[Frontend] Failed to parse JSON:", e);

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
      navigate("/", { replace: true });
    } else if (mode === "edit") {
      setMode("view");
    } else {
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // セッションがある場合は認証ヘッダーを追加
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: entry.content,
          journalId: journalId,
        }),
      });

      // レスポンステキストを確認
      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.error("Response was not JSON:", responseText.substring(0, 500));
        throw new Error("Invalid JSON response");
      }

      if (response.ok) {
        setAiReply(data.reply || "");
        console.log("AI reply set successfully");
        
        // 残り回数を表示（adminユーザー以外）
        if (!data.isAdmin && data.remainingCount !== null) {
          // clientAiUsageInfoを更新
          setClientAiUsageInfo({
            remainingCount: data.remainingCount,
            monthlyLimit: data.monthlyLimit || 5,
            isAdmin: false,
          });
          
          if (data.remainingCount === 0) {
            toast.warning(`今月の回答上限に達しました。来月また利用できます。`);
          } else {
            toast.success(`そっとさんの回答が届きました（今月の残り回数: ${data.remainingCount}回）`);
          }
          
          // ヘッダーのAI使用状況を更新
          window.dispatchEvent(new CustomEvent("aiUsageUpdated"));
        }
      } else {
        console.error("AI response error:", data.error);
        setError(data.error || "エラーが発生しました");
        
        // 429エラー（制限超過）の場合は特別なメッセージを表示
        if (response.status === 429) {
          toast.error(data.error);
        }
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
    return <Loading fullScreen />;
  }

  // Show login prompt if no user
  if (!user) {
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
      aiUsageInfo={clientAiUsageInfo}
    />
  );
}
