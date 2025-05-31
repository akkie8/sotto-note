import { useCallback } from "react";
import { useNavigate } from "@remix-run/react";
import { ArrowRight, BookHeart, Bot, Wind } from "lucide-react";

import { supabase } from "../lib/supabase.client";

export default function About() {
  const navigate = useNavigate();

  const handleLogin = useCallback(async () => {
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      console.log("[About] handleLogin result:", result);
    } catch (e) {
      console.error("[About] handleLogin error:", e);
    }
  }, []);

  const handleJournalClick = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      console.log(
        "[About] handleJournalClick getUser user:",
        user,
        "error:",
        error
      );
      if (user) {
        navigate("/journal");
      } else {
        const result = await supabase.auth.signInWithOAuth({
          provider: "google",
        });
        console.log(
          "[About] handleJournalClick signInWithOAuth result:",
          result
        );
      }
    } catch (e) {
      console.error("[About] handleJournalClick error:", e);
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* ヒーローセクション */}
      <section className="relative flex-1 overflow-hidden">
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 pb-28 pt-20 text-center sm:px-6 md:flex-row lg:px-8">
          {/* イラスト */}

          {/* テキスト */}
          <div className="flex flex-1 flex-col items-center md:items-start">
            <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
              気持ちを、
              <span className="text-indigo-600">そっと</span>
              置いていく場所。
            </h1>
            <div className="mb-8 flex flex-1 justify-center md:mb-0 md:justify-end">
              <img
                src="/levitate.gif"
                alt="リラックスする女性のイラスト"
                className="h-auto w-full max-w-xs"
              />
            </div>
            <p className="mb-12 text-xl font-light text-gray-600 md:text-2xl">
              日記 × 瞑想 × AIフィードバックの
              <br className="sm:hidden" />
              ウェルネスアプリ
            </p>
            <div className="flex flex-col justify-center gap-4">
              <button
                onClick={handleJournalClick}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700"
              >
                今日の気持ちを書いてみる
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* コンセプト紹介セクション */}
      <section className="bg-white/50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-gray-900">
            そっとノートとは？
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-gray-600">
            忙しい毎日、誰かに話す前に「まず自分で整理したい」こと、ありませんか？
            <br />
            そっとノートは、そんなあなたの心を整えるための&ldquo;内なる空間&rdquo;です。
          </p>
        </div>
      </section>

      {/* 機能紹介セクション */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* ジャーナル */}
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-indigo-600">
                <BookHeart className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">
                ジャーナル
              </h3>
              <p className="text-gray-600">
                書くことで、心が整う。日々の思いを言葉にすることで、自分自身をより深く理解できます。
              </p>
            </div>

            {/* 瞑想ガイド */}
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-indigo-600">
                <Wind className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">
                瞑想ガイド
              </h3>
              <p className="text-gray-600">
                呼吸で今に戻る。ガイド付きの呼吸法で、心を落ち着かせ、現在の瞬間に集中します。
              </p>
            </div>

            {/* AIフィードバック */}
            <div className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-indigo-600">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">
                AIフィードバック
              </h3>
              <p className="text-gray-600">
                あなたの気持ちに、そっと反応。AIがあなたの言葉に寄り添い、新しい視点を提供します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ユーザーの声セクション */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            ユーザーの声
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="mb-4 italic text-gray-600">
                「書く習慣ができて、夜が静かになった。考えが整理されて、心にゆとりができました。」
              </p>
              <p className="text-sm text-gray-500">- Aさん（30代・会社員）</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="mb-4 italic text-gray-600">
                「AIの返答が思ったより優しくて、続けたくなった。自分の気持ちと向き合うきっかけになっています。」
              </p>
              <p className="text-sm text-gray-500">- Bさん（20代・学生）</p>
            </div>
          </div>
        </div>
      </section>

      {/* プライバシーセクション */}
      <section className="bg-white/50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-gray-900">
            プライバシーと安心設計
          </h2>
          <ul className="space-y-4 text-gray-600">
            <li>✓ ローカル保存で安心（クラウド未使用）</li>
            <li>✓ 書いた内容は本人だけが見られる</li>
            <li>✓ 広告なし・静かな設計を継続</li>
          </ul>
        </div>
      </section>

      {/* 最後のCTAセクション */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-gray-900">
            そっと、始めてみませんか？
          </h2>
        </div>
        <div className="flex w-full justify-center pt-8">
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 rounded bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-indigo-700"
          >
            Googleアカウントで始める
          </button>
        </div>
      </section>
    </div>
  );
}
