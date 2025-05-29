import { useEffect, useState } from "react";
import { json, type ActionFunction } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";

import { supabase } from "../lib/supabase.client";

type ActionData = {
  success?: boolean;
  error?: string;
  action?: "reset" | "feedback";
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const feedback = formData.get("feedback");

  switch (action) {
    case "reset":
      try {
        // TODO: データベースのリセット処理を実装
        return json<ActionData>({ success: true, action: "reset" });
      } catch (error) {
        return json<ActionData>({ error: "データの初期化に失敗しました" });
      }

    case "feedback":
      if (!feedback) {
        return json<ActionData>({ error: "フィードバックを入力してください" });
      }
      try {
        // TODO: フィードバック送信処理を実装
        return json<ActionData>({ success: true, action: "feedback" });
      } catch (error) {
        return json<ActionData>({
          error: "フィードバックの送信に失敗しました",
        });
      }

    default:
      return json<ActionData>({ error: "不正なアクションです" });
  }
};

export default function Settings() {
  const actionData = useActionData<ActionData>();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [showNameSaved, setShowNameSaved] = useState(false);

  // ユーザー名をSupabaseから取得
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single();
      if (!error && data?.name) {
        setEditingName(data.name);
      }
    })();
  }, []);

  useEffect(() => {
    if (actionData?.action === "reset" && actionData?.success) {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        // journalsテーブルのデータ削除
        await supabase.from("journals").delete().eq("user_id", user.id);
        // profilesテーブルのデータ削除（必要なら）
        // await supabase.from("profiles").delete().eq("user_id", user.id);
      })();
    }
  }, [actionData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  // 名前保存
  const handleNameSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // upsertでprofilesテーブルに保存
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      name: editingName,
    });
    if (!error) {
      setShowNameSaved(true);
      setTimeout(() => setShowNameSaved(false), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">設定</h1>

      {/* 名前設定セクション */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-900">表示名</h2>
        <div className="flex gap-2">
          <input
            type="text"
            id="userName"
            value={editingName}
            onChange={handleNameChange}
            placeholder="あなたの名前"
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <button
            onClick={handleNameSave}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none"
          >
            保存
          </button>
        </div>
        {showNameSaved && (
          <p className="mt-2 text-xs text-emerald-600">✓ 保存しました</p>
        )}
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
        {actionData?.action === "reset" && actionData?.success && (
          <p className="mt-2 text-xs text-emerald-600">
            データを初期化しました
          </p>
        )}
      </section>

      {/* 開発者を支援セクション（目立つボタン） */}
      <section className="mb-10 text-center">
        <div className="flex flex-col gap-2">
          <a
            href="https://buy.stripe.com/dummy_link"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded border border-emerald-400 bg-white px-3 py-1.5 text-sm font-normal text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2"
          >
            ☕️ コーヒー
            <br />
            <span className="text-xs">¥500</span>
          </a>
          <a
            href="https://buy.stripe.com/dummy_link"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded border border-amber-400 bg-white px-3 py-1.5 text-sm font-normal text-amber-700 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2"
          >
            🍱 ランチ
            <br />
            <span className="text-xs">¥1,500</span>
          </a>
          <a
            href="https://buy.stripe.com/dummy_link"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded border border-pink-400 bg-white px-3 py-1.5 text-sm font-normal text-pink-700 transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:ring-offset-2"
          >
            🍽️ ディナー
            <br />
            <span className="text-xs">¥3,000</span>
          </a>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          アプリの開発・維持をサポートしていただける方はこちらからご支援いただけます。
        </div>
      </section>

      {/* 投げ銭・アバウト・フィードバックは小さくまとめて下部に */}
      <div className="mt-12 space-y-4 text-center text-xs text-gray-500">
        <div>
          <Form method="post" className="inline">
            <input type="hidden" name="action" value="feedback" />
            <textarea
              id="feedback"
              name="feedback"
              rows={2}
              className="mt-2 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
              placeholder="ご意見・ご要望"
            />
            <button
              type="submit"
              className="mt-1 rounded bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none"
            >
              フィードバック送信
            </button>
          </Form>
          {actionData?.action === "feedback" && actionData?.success && (
            <p className="mt-1 text-emerald-600">送信しました。ありがとう！</p>
          )}
        </div>
        {/* アバウトは下部に小さく */}
        <div className="mt-8">
          <Link to="/about" className="underline hover:text-indigo-600">
            そっとノートについて
          </Link>
        </div>
      </div>

      {/* エラーメッセージ */}
      {actionData?.error && (
        <div className="mt-4 text-center text-xs text-red-600">
          {actionData.error}
        </div>
      )}
    </div>
  );
}
