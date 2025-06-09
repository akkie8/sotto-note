import { Link } from "@remix-run/react";

export default function About() {
  return (
    <div className="min-h-screen bg-wellness-surface/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-soft">
          <h1 className="mb-6 text-3xl font-bold text-wellness-text">
            認証エラー
          </h1>
          <div className="space-y-4">
            <p className="text-wellness-textLight">
              セッションの有効期限が切れているか、認証に問題が発生しました。
            </p>
            <p className="text-wellness-textLight">
              再度ログインしてください。
            </p>
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
