import { useCallback, useEffect } from "react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { ArrowRight, BookHeart, Bot, Wind } from "lucide-react";

import { getOptionalUser } from "~/lib/auth.server";
import { supabase } from "../lib/supabase.client";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getOptionalUser(request);

  // If user is already logged in, redirect to home
  if (user) {
    throw redirect("/", { headers });
  }

  return json({ user: null }, { headers });
}

export default function About() {
  const navigate = useNavigate();
  const { user } = useLoaderData<typeof loader>();

  const handleLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error("[About] handleLogin error:", error);
      }
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
    <div className="flex min-h-screen flex-col bg-wellness-bg">
      {/* ヒーローセクション */}
      <section className="relative flex-1 overflow-hidden">
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 pb-28 pt-20 text-center sm:px-6 md:flex-row lg:px-8">
          {/* イラスト */}

          {/* テキスト */}
          <div className="flex flex-1 flex-col items-center md:items-start">
            <h1 className="mb-6 text-4xl font-bold text-wellness-text md:text-6xl">
              気持ちを、
              <span className="text-wellness-primary">そっと</span>
              置いていく場所。
            </h1>
            <div className="mb-8 flex flex-1 justify-center md:mb-0 md:justify-end">
              <img
                src="/levitate.gif"
                alt="リラックスする女性のイラスト"
                className="h-auto w-full max-w-xs"
              />
            </div>
            <p className="mb-12 text-xl font-light text-wellness-textLight md:text-2xl">
              日記 × 瞑想 × AIフィードバックの
              <br className="sm:hidden" />
              ウェルネスアプリ
            </p>
            <div className="flex flex-col justify-center gap-4">
              <button
                onClick={handleJournalClick}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-wellness-primary px-8 py-3 text-base font-medium text-white hover:bg-wellness-secondary"
              >
                今日の気持ちを書いてみる
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* コンセプト紹介セクション */}
      <section className="bg-wellness-surface/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-wellness-text">
            そっとノートとは？
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-wellness-textLight">
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
            <div className="rounded-xl bg-wellness-surface p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-wellness-primary">
                <BookHeart className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-wellness-text">
                ジャーナル
              </h3>
              <p className="text-wellness-textLight">
                書くことで、心が整う。日々の思いを言葉にすることで、自分自身をより深く理解できます。
              </p>
            </div>

            {/* 瞑想ガイド */}
            <div className="rounded-xl bg-wellness-surface p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-wellness-primary">
                <Wind className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-wellness-text">
                瞑想ガイド
              </h3>
              <p className="text-wellness-textLight">
                呼吸で今に戻る。ガイド付きの呼吸法で、心を落ち着かせ、現在の瞬間に集中します。
              </p>
            </div>

            {/* AIフィードバック */}
            <div className="rounded-xl bg-wellness-surface p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 text-wellness-primary">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-wellness-text">
                AIフィードバック
              </h3>
              <p className="text-wellness-textLight">
                あなたの気持ちに、そっと反応。AIがあなたの言葉に寄り添い、新しい視点を提供します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ユーザーの声セクション */}
      <section className="bg-wellness-surface/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold text-wellness-text">
            ユーザーの声
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg bg-wellness-surface p-6 shadow-sm">
              <p className="mb-4 italic text-wellness-textLight">
                「書く習慣ができて、夜が静かになった。考えが整理されて、心にゆとりができました。」
              </p>
              <p className="text-sm text-wellness-textLight/70">
                - Aさん（30代・会社員）
              </p>
            </div>
            <div className="rounded-lg bg-wellness-surface p-6 shadow-sm">
              <p className="mb-4 italic text-wellness-textLight">
                「AIの返答が思ったより優しくて、続けたくなった。自分の気持ちと向き合うきっかけになっています。」
              </p>
              <p className="text-sm text-wellness-textLight/70">
                - Bさん（20代・学生）
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* プライバシーセクション */}
      <section className="bg-wellness-surface/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-wellness-text">
            プライバシーと安心設計
          </h2>
          <ul className="space-y-4 text-wellness-textLight">
            <li>✓ ローカル保存で安心（クラウド未使用）</li>
            <li>✓ 書いた内容は本人だけが見られる</li>
            <li>✓ 広告なし・静かな設計を継続</li>
          </ul>
        </div>
      </section>

      {/* 最後のCTAセクション */}
      <section className="bg-wellness-bg py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-8 text-3xl font-bold text-wellness-text">
            そっと、始めてみませんか？
          </h2>
        </div>
        <div className="flex w-full justify-center pt-8">
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 rounded bg-wellness-primary px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-wellness-secondary"
          >
            Googleアカウントで始める
          </button>
        </div>
      </section>
    </div>
  );
}
