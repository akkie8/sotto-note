import type { LoaderFunction } from "@remix-run/node";
import { AlertCircle } from "lucide-react";

export const loader: LoaderFunction = async () => {
  // メンテナンス画面は静的な内容のみ表示
  return Response.json({ status: "maintenance" });
};

export default function Maintenance() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        {/* メインコンテンツ */}
        <div className="mb-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-yellow-100 p-4">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
            </div>
          </div>

          <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">
            メンテナンス中
          </h1>

          <p className="mb-6 text-center leading-relaxed text-gray-600">
            ただいまメンテナンス中です。しばらくお待ちください。
          </p>
        </div>

        {/* Twitter埋め込みセクション */}
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">最新情報</h2>
          <div className="text-center text-gray-500">
            <p className="mb-4">
              メンテナンスの最新情報は公式X（Twitter）でお知らせしています
            </p>
            <a
              href="https://x.com/sottonote"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-500 transition-colors hover:text-blue-600"
            >
              @sottonote をフォロー
            </a>
          </div>

          {/* Twitter Timeline Widget */}
          <div className="mt-6 overflow-hidden rounded-lg">
            <a
              className="twitter-timeline"
              data-height="400"
              data-theme="light"
              data-chrome="noheader nofooter noborders"
              data-tweet-limit="3"
              href="https://x.com/sottonote?ref_src=twsrc%5Etfw"
            >
              Tweets by sottonote
            </a>
          </div>
        </div>
      </div>

      {/* Twitter Widget Script */}
      <script async src="https://platform.twitter.com/widgets.js" />
    </div>
  );
}
