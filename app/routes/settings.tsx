import { useEffect, useRef, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Loading } from "~/components/Loading";
import { getOptionalUser } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";

// デフォルトのベースタグ
const DEFAULT_BASE_TAGS = [
  "仕事",
  "疲れ",
  "嬉しい",
  "ストレス",
  "感謝",
  "不安",
  "楽しい",
  "悲しい",
  "怒り",
  "リラックス",
  "成長",
  "家族",
  "友達",
  "健康",
  "趣味",
];

type ActionData = {
  success?: boolean;
  error?: string;
  action?: "reset" | "feedback" | "update-profile" | "update-base-tags";
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Just try to get server-side user, but don't enforce it
  const { user } = await getOptionalUser(request);
  return Response.json({ serverUser: user });
}

export const action: ActionFunction = async ({ request }) => {
  const { user, headers, supabase } = await getOptionalUser(request);

  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }
  const formData = await request.formData();
  const action = formData.get("action");
  const feedback = formData.get("feedback");
  const name = formData.get("name");
  const baseTags = formData.get("baseTags");

  switch (action) {
    case "update-profile":
      console.log("Received update-profile action:", { name, user: user.id });

      if (!name || typeof name !== "string" || !name.trim()) {
        console.log("Validation failed - name is empty or invalid:", name);
        return Response.json({ error: "名前を入力してください" }, { headers });
      }

      try {
        console.log(
          "Updating profile for user:",
          user.id,
          "with name:",
          name.trim()
        );

        // First try to update existing profile
        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({ name: name.trim() })
          .eq("user_id", user.id)
          .select();

        if (updateError && updateError.code !== "PGRST116") {
          // PGRST116 is "not found" error
          console.error("Profile update error:", updateError);
          return Response.json(
            {
              error: "プロフィールの更新に失敗しました: " + updateError.message,
            },
            { headers }
          );
        }

        // If no rows were affected (profile doesn't exist), create it
        if (!updateData || updateData.length === 0) {
          console.log("Profile not found, creating new one");
          const { data: insertData, error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              name: name.trim(),
            })
            .select();

          if (insertError) {
            console.error("Profile insert error:", insertError);
            return Response.json(
              {
                error:
                  "プロフィールの作成に失敗しました: " + insertError.message,
              },
              { headers }
            );
          }
          console.log("Profile created successfully:", insertData);
        } else {
          console.log("Profile updated successfully:", updateData);
        }

        return Response.json(
          { success: true, action: "update-profile" },
          { headers }
        );
      } catch (error) {
        return Response.json(
          { error: "プロフィールの更新に失敗しました" },
          { headers }
        );
      }

    case "update-base-tags":
      if (!baseTags || typeof baseTags !== "string") {
        return Response.json({ error: "ベースタグが無効です" }, { headers });
      }

      try {
        const tagsArray = baseTags
          .split(",")
          .filter((tag: string) => tag.trim() !== "");

        // プロフィールテーブルのbase_tagsカラムを更新（存在しない場合は作成）
        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({ base_tags: tagsArray.join(",") })
          .eq("user_id", user.id)
          .select();

        if (updateError && updateError.code !== "PGRST116") {
          console.error("Base tags update error:", updateError);
          return Response.json(
            { error: "ベースタグの更新に失敗しました: " + updateError.message },
            { headers }
          );
        }

        // プロフィールが存在しない場合は作成
        if (!updateData || updateData.length === 0) {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              base_tags: tagsArray.join(","),
            });

          if (insertError) {
            console.error("Base tags insert error:", insertError);
            return Response.json(
              {
                error: "ベースタグの保存に失敗しました: " + insertError.message,
              },
              { headers }
            );
          }
        }

        return Response.json(
          { success: true, action: "update-base-tags" },
          { headers }
        );
      } catch (error) {
        return Response.json(
          { error: "ベースタグの更新に失敗しました" },
          { headers }
        );
      }

    case "reset":
      try {
        const { error } = await supabase
          .from("journals")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          return Response.json(
            { error: "データの削除に失敗しました: " + error.message },
            { headers }
          );
        }

        return Response.json({ success: true, action: "reset" }, { headers });
      } catch (error) {
        return Response.json(
          { error: "データの初期化に失敗しました" },
          { headers }
        );
      }

    case "feedback":
      if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
        return Response.json(
          { error: "フィードバックを入力してください" },
          { headers }
        );
      }
      try {
        // フィードバックをデータベースに保存
        const { error: feedbackError } = await supabase
          .from("feedback")
          .insert({
            user_id: user.id,
            content: feedback.trim(),
            created_at: new Date().toISOString(),
          });

        if (feedbackError) {
          console.error("Feedback save error:", feedbackError);
          return Response.json(
            {
              error:
                "フィードバックの保存に失敗しました: " + feedbackError.message,
            },
            { headers }
          );
        }

        return Response.json(
          { success: true, action: "feedback" },
          { headers }
        );
      } catch (error) {
        console.error("Feedback submission error:", error);
        return Response.json(
          {
            error: "フィードバックの送信に失敗しました",
          },
          { headers }
        );
      }

    default:
      return Response.json({ error: "不正なアクションです" }, { headers });
  }
};

export default function Settings() {
  const { serverUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);
  const [baseTags, setBaseTags] = useState<string[]>(DEFAULT_BASE_TAGS);
  const [newTag, setNewTag] = useState("");
  const feedbackFormRef = useRef<HTMLFormElement>(null);

  // Check client-side authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();
        setUser(clientUser);

        if (clientUser) {
          // Check cache first
          const cachedProfile = cache.get<{
            name?: string;
            base_tags?: string;
          }>(CACHE_KEYS.USER_PROFILE(clientUser.id));

          if (cachedProfile?.name) {
            console.log("Using cached profile:", cachedProfile);
            setEditingName(cachedProfile.name);
          }

          if (cachedProfile?.base_tags) {
            const userBaseTags = cachedProfile.base_tags
              .split(",")
              .filter((tag: string) => tag.trim() !== "");
            setBaseTags(
              userBaseTags.length > 0 ? userBaseTags : DEFAULT_BASE_TAGS
            );
          }

          if (!cachedProfile) {
            // Fetch user profile
            console.log("Fetching profile for user:", clientUser.id);
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("name, base_tags")
              .eq("user_id", clientUser.id)
              .single();

            console.log("Profile fetch result:", { profile, error });

            if (profile?.name) {
              setEditingName(profile.name);
            }

            if (profile?.base_tags) {
              const userBaseTags = profile.base_tags
                .split(",")
                .filter((tag: string) => tag.trim() !== "");
              setBaseTags(
                userBaseTags.length > 0 ? userBaseTags : DEFAULT_BASE_TAGS
              );
            }

            if (profile) {
              // Cache the profile
              cache.set(
                CACHE_KEYS.USER_PROFILE(clientUser.id),
                profile,
                10 * 60 * 1000
              );
            } else if (error) {
              console.log(
                "No profile found or error, this might be a new user"
              );
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle action results
  useEffect(() => {
    if (actionData?.success) {
      if (actionData.action === "update-profile") {
        toast.success("プロフィールを更新しました");
        // Invalidate cache when profile is updated
        if (user) {
          cache.invalidate(CACHE_KEYS.USER_PROFILE(user.id));
          // Optionally refresh the profile data
          const checkUpdatedProfile = async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("user_id", user.id)
              .single();

            if (profile?.name) {
              setEditingName(profile.name);
              cache.set(
                CACHE_KEYS.USER_PROFILE(user.id),
                profile,
                10 * 60 * 1000
              );
              // ヘッダーに更新を通知
              window.dispatchEvent(
                new CustomEvent("profileUpdated", {
                  detail: { name: profile.name },
                })
              );
            }
          };
          checkUpdatedProfile();
        }
      } else if (actionData.action === "update-base-tags") {
        toast.success("タグを更新しました");
      } else if (actionData.action === "reset") {
        toast.success("データを初期化しました");
        // Invalidate journal cache when data is reset
        if (user) {
          cache.invalidatePattern("journal");
        }
      } else if (actionData.action === "feedback") {
        toast.success("フィードバックを送信しました");
        // フォームをリセット
        if (feedbackFormRef.current) {
          feedbackFormRef.current.reset();
        }
      }
    } else if (actionData?.error) {
      console.log("Action error received:", actionData.error);
      toast.error(actionData.error);
    }
  }, [actionData, user]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    if (!editingName.trim()) {
      toast.error("名前を入力してください");
      return;
    }

    try {
      console.log(
        "Updating profile for user:",
        user.id,
        "with name:",
        editingName.trim()
      );

      // First try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ name: editingName.trim() })
        .eq("user_id", user.id)
        .select();

      if (updateError && updateError.code !== "PGRST116") {
        console.error("Profile update error:", updateError);
        toast.error("プロフィールの更新に失敗しました: " + updateError.message);
        return;
      }

      // If no rows were affected (profile doesn't exist), create it
      if (!updateData || updateData.length === 0) {
        console.log("Profile not found, creating new one");
        const { data: insertData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            name: editingName.trim(),
          })
          .select();

        if (insertError) {
          console.error("Profile insert error:", insertError);
          toast.error(
            "プロフィールの作成に失敗しました: " + insertError.message
          );
          return;
        }
        console.log("Profile created successfully:", insertData);
      } else {
        console.log("Profile updated successfully:", updateData);
      }

      toast.success("プロフィールを更新しました");

      // Update cache
      cache.invalidate(CACHE_KEYS.USER_PROFILE(user.id));
      cache.set(
        CACHE_KEYS.USER_PROFILE(user.id),
        { name: editingName.trim() },
        10 * 60 * 1000
      );

      // ヘッダーに更新を通知
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { name: editingName.trim() },
        })
      );
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("プロフィールの更新に失敗しました");
    }
  };

  const addTag = () => {
    if (newTag.trim() && !baseTags.includes(newTag.trim())) {
      setBaseTags([...baseTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setBaseTags(baseTags.filter((tag) => tag !== tagToRemove));
  };

  const saveBaseTags = async () => {
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        base_tags: baseTags.join(","),
      });

      if (error) {
        console.error("Base tags save error:", error);
        toast.error("タグの保存に失敗しました");
        return;
      }

      toast.success("タグを保存しました");
    } catch (error) {
      console.error("Base tags save failed:", error);
      toast.error("タグの保存に失敗しました");
    }
  };

  // Show loading state
  if (loading) {
    return <Loading fullScreen />;
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="mx-auto min-h-full max-w-md px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-wellness-text">設定</h1>
          <p className="mb-6 text-wellness-textLight">ログインが必要です</p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-wellness-primary px-6 py-3 text-white transition-colors hover:bg-wellness-secondary"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-md space-y-6 px-6 py-6">
      {/* 名前設定セクション */}
      <div className="rounded-md bg-wellness-surface p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
          表示名
        </h2>
        <form onSubmit={handleNameSubmit} className="flex gap-2">
          <input
            type="text"
            name="name"
            id="userName"
            value={editingName}
            onChange={handleNameChange}
            placeholder="あなたの名前"
            className="flex-1 rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all focus:bg-wellness-surface"
          />
          <button
            type="submit"
            className="rounded bg-wellness-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-wellness-secondary"
          >
            保存
          </button>
        </form>
      </div>

      {/* タグ設定セクション */}
      <div className="rounded-md bg-wellness-surface p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
          タグ設定
        </h2>
        <p className="mb-4 text-xs text-wellness-textLight">
          ノート作成時に選択できるタグを設定できます
        </p>

        {/* 現在のタグ一覧 */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {baseTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 rounded-full bg-wellness-primary/10 px-3 py-1 text-xs"
              >
                <span className="text-wellness-primary">{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="text-wellness-textLight hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* タグ追加 */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTag()}
            placeholder="新しいタグを追加"
            className="flex-1 rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all focus:bg-wellness-surface"
          />
          <button
            onClick={addTag}
            className="flex items-center gap-1 rounded bg-wellness-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-wellness-secondary"
          >
            <Plus size={12} />
            追加
          </button>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={saveBaseTags}
          className="w-full rounded bg-wellness-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-wellness-secondary"
        >
          タグを保存
        </button>
      </div>

      {/* データ初期化セクション - 一時的に非表示 */}
      {false && (
        <div className="rounded-md bg-wellness-surface p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
            データ管理
          </h2>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              全てのノートを削除
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-600">
                本当に全てのデータを削除しますか？この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <Form method="post" className="inline">
                  <input type="hidden" name="action" value="reset" />
                  <button
                    type="submit"
                    className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                  >
                    削除する
                  </button>
                </Form>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded bg-wellness-bg px-3 py-1.5 text-xs font-medium text-wellness-text transition-colors hover:bg-wellness-primary/10"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 開発者サポートセクション - Stripe未登録のため一時非表示 */}
      {false && (
        <div className="rounded-md bg-wellness-surface p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
            サポート
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-wellness-textLight">
            このアプリを気に入っていただけましたら、ぜひ開発者をサポートしてください
          </p>
          <div className="grid grid-cols-3 gap-2">
            <a
              href="https://buy.stripe.com/test_eVq4gBc6R2eHdQr4JD67S00"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded bg-amber-50 p-3 text-center transition-colors hover:bg-amber-100"
            >
              <div className="mb-1 text-lg transition-transform group-hover:scale-110">
                ☕
              </div>
              <div className="text-xs font-medium text-amber-800">¥500</div>
            </a>
            <button className="group rounded bg-green-50 p-3 text-center transition-colors hover:bg-green-100">
              <div className="mb-1 text-lg transition-transform group-hover:scale-110">
                🍱
              </div>
              <div className="text-xs font-medium text-green-800">¥1,500</div>
            </button>
            <button className="group rounded bg-purple-50 p-3 text-center transition-colors hover:bg-purple-100">
              <div className="mb-1 text-lg transition-transform group-hover:scale-110">
                🍽️
              </div>
              <div className="text-xs font-medium text-purple-800">¥3,000</div>
            </button>
          </div>
        </div>
      )}

      {/* フィードバックセクション */}
      <div className="rounded-md bg-wellness-surface p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
          フィードバック
        </h2>
        <Form ref={feedbackFormRef} method="post" className="space-y-3">
          <input type="hidden" name="action" value="feedback" />
          <textarea
            name="feedback"
            rows={3}
            className="w-full resize-none rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all focus:bg-wellness-surface"
            placeholder="ご意見・ご要望をお聞かせください..."
          />
          <button
            type="submit"
            className="w-full rounded bg-wellness-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-wellness-secondary"
          >
            送信する
          </button>
        </Form>
      </div>

      {/* 法的情報セクション */}
      <div className="rounded-md bg-wellness-surface p-4">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-wellness-textLight">
          法的情報
        </h2>
        <div className="space-y-2">
          <a
            href="https://akiyamada.dev/sotto-note#privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all hover:bg-wellness-primary/10"
          >
            プライバシーポリシー
          </a>
          <a
            href="https://akiyamada.dev/sotto-note#terms"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all hover:bg-wellness-primary/10"
          >
            利用規約
          </a>
          <a
            href="https://akiyamada.dev/sotto-note#tokusho"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all hover:bg-wellness-primary/10"
          >
            特定商取引法に基づく表記
          </a>
          <a
            href="https://akiyamada.dev/sotto-note"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all hover:bg-wellness-primary/10"
          >
            サービス詳細
          </a>
          <a
            href="https://akiyamada.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded bg-wellness-bg px-3 py-2 text-xs text-wellness-text transition-all hover:bg-wellness-primary/10"
          >
            運営者について
          </a>
        </div>
      </div>
    </div>
  );
}
