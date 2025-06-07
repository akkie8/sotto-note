import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { toast } from "sonner";

import { getOptionalUser, requireAuth } from "~/lib/auth.server";
import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "../lib/supabase.client";

type ActionData = {
  success?: boolean;
  error?: string;
  action?: "reset" | "feedback" | "update-profile";
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Just try to get server-side user, but don't enforce it
  const { user } = await getOptionalUser(request);
  return json({ serverUser: user });
}

export const action: ActionFunction = async ({ request }) => {
  const { user, headers, supabase } = await requireAuth(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const feedback = formData.get("feedback");
  const name = formData.get("name");

  switch (action) {
    case "update-profile":
      if (!name || typeof name !== "string" || !name.trim()) {
        return json({ error: "名前を入力してください" }, { headers });
      }

      try {
        const { error } = await supabase.from("profiles").upsert({
          user_id: user.id,
          name: name.trim(),
        });

        if (error) {
          return json(
            { error: "プロフィールの更新に失敗しました: " + error.message },
            { headers }
          );
        }

        return json({ success: true, action: "update-profile" }, { headers });
      } catch (error) {
        return json({ error: "プロフィールの更新に失敗しました" }, { headers });
      }

    case "reset":
      try {
        const { error } = await supabase
          .from("journals")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          return json(
            { error: "データの削除に失敗しました: " + error.message },
            { headers }
          );
        }

        return json({ success: true, action: "reset" }, { headers });
      } catch (error) {
        return json({ error: "データの初期化に失敗しました" }, { headers });
      }

    case "feedback":
      if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
        return json({ error: "フィードバックを入力してください" }, { headers });
      }
      try {
        // TODO: フィードバック送信処理を実装
        return json({ success: true, action: "feedback" }, { headers });
      } catch (error) {
        return json(
          {
            error: "フィードバックの送信に失敗しました",
          },
          { headers }
        );
      }

    default:
      return json({ error: "不正なアクションです" }, { headers });
  }
};

export default function Settings() {
  const { serverUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(serverUser);
  const [loading, setLoading] = useState(true);

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
          const cachedProfile = cache.get(
            CACHE_KEYS.USER_PROFILE(clientUser.id)
          );

          if (cachedProfile?.name) {
            setEditingName(cachedProfile.name);
          } else {
            // Fetch user profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("user_id", clientUser.id)
              .single();

            if (profile?.name) {
              setEditingName(profile.name);
              // Cache the profile
              cache.set(
                CACHE_KEYS.USER_PROFILE(clientUser.id),
                profile,
                10 * 60 * 1000
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
        }
      } else if (actionData.action === "reset") {
        toast.success("データを初期化しました");
        // Invalidate journal cache when data is reset
        if (user) {
          cache.invalidatePattern("journal");
        }
      } else if (actionData.action === "feedback") {
        toast.success("フィードバックを送信しました");
      }
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, user]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="mx-auto min-h-full max-w-md px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="mx-auto min-h-full max-w-md px-4 py-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>
          <p className="mb-6 text-gray-600">ログインが必要です</p>
          <Link
            to="/about"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-md px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">設定</h1>
      {/* イラスト */}
      <div className="illustration-space">
        <img
          src="/meditating.svg"
          alt="瞑想するイラスト"
          className="mx-auto h-auto w-full max-w-xs"
        />
      </div>

      {/* 名前設定セクション */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-900">表示名</h2>
        <Form method="post" className="flex gap-2">
          <input type="hidden" name="action" value="update-profile" />
          <input
            type="text"
            name="name"
            id="userName"
            value={editingName}
            onChange={handleNameChange}
            placeholder="あなたの名前"
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none"
          >
            保存
          </button>
        </Form>
      </section>

      {/* データ初期化セクション */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-900">データ初期化</h2>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none"
          >
            ジャーナルを全て削除
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600">
              本当に全てのデータを削除しますか？
            </p>
            <div className="flex gap-2">
              <Form method="post" className="inline">
                <input type="hidden" name="action" value="reset" />
                <button
                  type="submit"
                  className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none"
                >
                  はい、削除
                </button>
              </Form>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 開発者サポートセクション */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-900">
          開発者サポート
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          このアプリを気に入っていただけましたら、開発者をサポートしてください！
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button className="rounded bg-yellow-100 px-3 py-2 text-xs font-medium text-yellow-800 hover:bg-yellow-200">
            ☕ コーヒー
            <br />
            ¥500
          </button>
          <button className="rounded bg-green-100 px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-200">
            🍱 ランチ
            <br />
            ¥1,500
          </button>
          <button className="rounded bg-purple-100 px-3 py-2 text-xs font-medium text-purple-800 hover:bg-purple-200">
            🍽️ ディナー
            <br />
            ¥3,000
          </button>
        </div>
      </section>

      {/* フィードバックセクション */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-900">
          フィードバック
        </h2>
        <Form method="post" className="space-y-2">
          <input type="hidden" name="action" value="feedback" />
          <textarea
            name="feedback"
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            placeholder="ご意見・ご要望をお聞かせください"
          />
          <button
            type="submit"
            className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none"
          >
            送信
          </button>
        </Form>
      </section>

      {/* Aboutページへのリンク */}
      <div className="text-center">
        <Link
          to="/about"
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          ← Aboutページに戻る
        </Link>
      </div>
    </div>
  );
}
