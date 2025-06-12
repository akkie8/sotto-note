import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  return Response.json({ error });
}

export const meta: MetaFunction = () => {
  return [
    { title: "アクセス情報 - そっとノート" },
    {
      name: "description",
      content: "そっとノートのアクセス情報とサービス準備状況についてご案内いたします。",
    },
    {
      name: "robots",
      content: "noindex,nofollow",
    },
    {
      rel: "canonical",
      href: "https://www.sottonote.com/about",
    },
  ];
};

export default function About() {
  const { error } = useLoaderData<typeof loader>();

  const isAccessDenied = error === "access_denied";

  return (
    <div className="min-h-screen bg-wellness-surface/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-soft">
          <h1 className="mb-6 text-3xl font-bold text-wellness-text">
            {isAccessDenied ? "準備中です" : "認証エラー"}
          </h1>
          <div className="space-y-4">
            {isAccessDenied ? (
              <>
                <p className="mb-4 text-lg text-wellness-textLight">
                  そっとノートをご利用いただき、ありがとうございます。
                </p>
                <p className="mb-6 text-wellness-textLight">
                  現在、そっとノートは準備中です。
                  <br />
                  公開までしばらくお待ちください。
                </p>
                <div className="rounded-lg bg-wellness-surface/50 p-6">
                  <h3 className="mb-3 font-medium text-wellness-primary">
                    📅 準備中の機能
                  </h3>
                  <ul className="space-y-2 text-sm text-wellness-textLight">
                    <li>• 心の記録ノート機能</li>
                    <li>• そっとさんからの優しい返信</li>
                    <li>• 深呼吸ガイド</li>
                    <li>• 感情の可視化</li>
                  </ul>
                  <div className="mt-4 text-xs text-wellness-textLight/70">
                    正式公開をお楽しみに 🌸
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-wellness-textLight">
                  セッションの有効期限が切れているか、認証に問題が発生しました。
                </p>
                <p className="text-wellness-textLight">
                  再度ログインしてください。
                </p>
              </>
            )}
            <div className="mt-6">
              <Link
                to="/"
                className="inline-block rounded-xl bg-wellness-primary px-6 py-3 font-medium text-white transition-all hover:bg-wellness-secondary"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
