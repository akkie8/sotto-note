import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
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
  return Response.json({ serverUser: user });
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
        return Response.json({ error: "名前を入力してください" }, { headers });
      }

      try {
        const { error } = await supabase.from("profiles").upsert({
          user_id: user.id,
          name: name.trim(),
        });

        if (error) {
          return Response.json(
            { error: "プロフィールの更新に失敗しました: " + error.message },
            { headers }
          );
        }

        return Response.json({ success: true, action: "update-profile" }, { headers });
      } catch (error) {
        return Response.json({ error: "プロフィールの更新に失敗しました" }, { headers });
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
        return Response.json({ error: "データの初期化に失敗しました" }, { headers });
      }

    case "feedback":
      if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
        return Response.json({ error: "フィードバックを入力してください" }, { headers });
      }
      try {
        // TODO: フィードバック送信処理を実装
        return Response.json({ success: true, action: "feedback" }, { headers });
      } catch (error) {
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
          const cachedProfile = cache.get<{ name: string }>(
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
    <div className="mx-auto min-h-full max-w-md space-y-8 px-6 py-8">
      {/* 名前設定セクション */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
          表示名
        </h2>
        <Form method="post" className="flex gap-3">
          <input type="hidden" name="action" value="update-profile" />
          <input
            type="text"
            name="name"
            id="userName"
            value={editingName}
            onChange={handleNameChange}
            placeholder="あなたの名前"
            className="flex-1 rounded-lg border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            保存
          </button>
        </Form>
      </div>

      {/* データ初期化セクション */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
          データ管理
        </h2>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus:outline-none"
          >
            全てのジャーナルを削除
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-600">
              本当に全てのデータを削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <Form method="post" className="inline">
                <input type="hidden" name="action" value="reset" />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none"
                >
                  削除する
                </button>
              </Form>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 開発者サポートセクション */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
          サポート
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-600">
          このアプリを気に入っていただけましたら、ぜひ開発者をサポートしてください
        </p>
        <div className="grid grid-cols-3 gap-3">
          <button className="group rounded-lg bg-amber-50 p-4 text-center transition-colors hover:bg-amber-100">
            <div className="mb-2 text-2xl transition-transform group-hover:scale-110">
              ☕
            </div>
            <div className="text-xs font-medium text-amber-800">¥500</div>
          </button>
          <button className="group rounded-lg bg-green-50 p-4 text-center transition-colors hover:bg-green-100">
            <div className="mb-2 text-2xl transition-transform group-hover:scale-110">
              🍱
            </div>
            <div className="text-xs font-medium text-green-800">¥1,500</div>
          </button>
          <button className="group rounded-lg bg-purple-50 p-4 text-center transition-colors hover:bg-purple-100">
            <div className="mb-2 text-2xl transition-transform group-hover:scale-110">
              🍽️
            </div>
            <div className="text-xs font-medium text-purple-800">¥3,000</div>
          </button>
        </div>
      </div>

      {/* フィードバックセクション */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
          フィードバック
        </h2>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="action" value="feedback" />
          <textarea
            name="feedback"
            rows={4}
            className="w-full resize-none rounded-lg border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500"
            placeholder="ご意見・ご要望をお聞かせください..."
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            送信する
          </button>
        </Form>
      </div>
    </div>
  );
}
