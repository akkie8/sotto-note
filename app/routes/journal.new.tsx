import { useEffect, useState } from "react";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { toast } from "sonner";

import {
  JournalEditor,
  type JournalEntry,
} from "~/components/JournalEditor";
import { Loading } from "~/components/Loading";
import { requireAuth } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireAuth(request);

  const aiUsageInfo = {
    remainingCount: null as number | null,
    monthlyLimit: null as number | null,
    isAdmin: false,
  };

  // Check user roles and AI usage
  if (user) {
    try {
      const { createSupabaseAdmin } = await import("~/lib/auth/supabase");
      const supabaseAdmin = createSupabaseAdmin();

      // Get user profile for admin check
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, role")
        .eq("user_id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";
      aiUsageInfo.isAdmin = isAdmin;

      // Get AI usage for non-admin users
      if (!isAdmin) {
        const { data: usage } = await supabaseAdmin
          .from("ai_usage")
          .select("count")
          .eq("user_id", user.id)
          .eq("month", new Date().toISOString().slice(0, 7))
          .single();

        const currentUsage = usage?.count || 0;
        const monthlyLimit = 100; // デフォルト制限
        aiUsageInfo.remainingCount = Math.max(0, monthlyLimit - currentUsage);
        aiUsageInfo.monthlyLimit = monthlyLimit;
      }
    } catch (error) {
      console.error("Error fetching AI usage info:", error);
    }
  }

  return json(
    {
      journalEntry: null,
      aiReply: null,
      user,
      aiUsageInfo,
    },
    {
      headers: headers || {},
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  const formData = await request.formData();
  const content = formData.get("content") as string;
  const mood = formData.get("mood") as string;
  const tags = formData.get("tags") as string;
  const needsAiReply = formData.get("needsAiReply") === "true";

  if (!content?.trim()) {
    return json({ error: "内容を入力してください" }, { status: 400 });
  }

  try {
    const { createSupabaseAdmin } = await import("~/lib/auth/supabase");
    const supabaseAdmin = createSupabaseAdmin();

    // Create journal entry
    const now = Date.now();
    const dateStr = new Date(now).toLocaleDateString("ja-JP");

    const { data: newEntry, error: insertError } = await supabaseAdmin
      .from("journals")
      .insert({
        content: content.trim(),
        mood,
        timestamp: now,
        date: dateStr,
        user_id: user.id,
        tags: tags || "",
        has_ai_reply: needsAiReply,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating journal entry:", insertError);
      return json({ error: "エントリーの作成に失敗しました" }, { status: 500 });
    }

    // Handle AI reply if requested
    if (needsAiReply) {
      try {
        // AI reply logic would go here
        console.log("AI reply requested for entry:", newEntry.id);
      } catch (error) {
        console.error("Error generating AI reply:", error);
      }
    }

    return json({
      success: true,
      entryId: newEntry.id,
      message: "エントリーを作成しました",
    });
  } catch (error) {
    console.error("Error in journal action:", error);
    return json({ error: "エラーが発生しました" }, { status: 500 });
  }
}

export default function JournalNew() {
  const { user, aiUsageInfo } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission result
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message || "エントリーを作成しました");
        navigate(`/journal/${fetcher.data.entryId}`);
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      }
      setIsSubmitting(false);
    }
  }, [fetcher.data, navigate]);

  const handleSave = async (entry: JournalEntry, needsAiReply: boolean) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("content", entry.content);
    formData.append("mood", entry.mood);
    formData.append("tags", entry.tags || "");
    formData.append("needsAiReply", needsAiReply.toString());

    fetcher.submit(formData, { method: "post" });
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  if (!user) {
    return <Loading fullScreen />;
  }

  return (
    <JournalEditor
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      isLoading={isSubmitting}
      aiUsageInfo={aiUsageInfo}
    />
  );
}
