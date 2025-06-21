import { useCallback, useEffect, useState } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { toast } from "sonner";

import { JournalEditor } from "~/components/JournalEditor";
import { requireAuth } from "~/utils/auth.server";
import { supabase } from "~/lib/supabase.client";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { validateMood } from "~/lib/validation";

const BASE_TAGS = ["日常", "仕事", "健康", "趣味", "人間関係", "目標", "感謝"];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireAuth(request);
  return Response.json({ user }, { headers: headers || {} });
}

type ActionData = 
  | { error: string; success?: never; journalId?: never }
  | { success: true; journalId: string; error?: never };

export async function action({ request }: ActionFunctionArgs) {
  const { user, supabase } = await requireAuth(request);
  
  const formData = await request.formData();
  const content = formData.get("content") as string;
  const mood = formData.get("mood") as string;
  const tags = formData.get("tags") as string;

  if (!content || content.trim().length === 0) {
    return Response.json({ error: "内容を入力してください。" } as ActionData, { status: 400 });
  }

  if (!mood || !validateMood(mood)) {
    return Response.json({ error: "気分を選択してください。" } as ActionData, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    const date = new Date(timestamp).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const { data, error } = await supabase
      .from("journals")
      .insert({
        user_id: user.id,
        content,
        mood,
        tags,
        timestamp,
        date,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating journal:", error);
      return Response.json({ error: "ジャーナルの作成に失敗しました。" } as ActionData, { status: 500 });
    }

    return Response.json({ success: true, journalId: data.id } as ActionData);
  } catch (error) {
    console.error("Unexpected error:", error);
    return Response.json({ error: "予期しないエラーが発生しました。" } as ActionData, { status: 500 });
  }
}

export const meta: MetaFunction = () => {
  return [
    { title: "新しいノート - そっとノート" },
    { name: "description", content: "今の気持ちを記録しましょう" },
  ];
};

export default function JournalNew() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [userJournals, setUserJournals] = useState<Array<{ tags?: string }>>([]);

  // Fetch user journals for tag suggestions
  useEffect(() => {
    const fetchUserJournals = async () => {
      const { data } = await supabase
        .from("journals")
        .select("tags")
        .eq("user_id", user.id);
      
      if (data) {
        setUserJournals(data);
      }
    };

    fetchUserJournals();
  }, [user.id]);

  // Handle successful creation
  useEffect(() => {
    if (actionData?.success && actionData.journalId) {
      // Clear journal cache
      cache.invalidate(CACHE_KEYS.JOURNAL_ENTRIES(user.id));
      
      toast.success("ノートを作成しました");
      navigate("/dashboard");
    }
  }, [actionData, navigate, user.id]);

  // Handle errors
  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const handleSave = useCallback(async (content: string, mood: string, manualTags: string[]) => {
    setSaving(true);
    
    // Create form data and submit
    const formData = new FormData();
    formData.append("content", content);
    formData.append("mood", mood);
    formData.append("tags", manualTags.join(","));

    // Submit form
    const form = document.createElement("form");
    form.method = "POST";
    form.style.display = "none";
    
    for (const [key, value] of formData.entries()) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    }
    
    document.body.appendChild(form);
    form.submit();
  }, []);

  const handleCancel = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white">
      <JournalEditor
        mode="new"
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        error={actionData?.error}
        userJournals={userJournals}
        baseTags={BASE_TAGS}
      />
    </div>
  );
}