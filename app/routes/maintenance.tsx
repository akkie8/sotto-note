import type { LoaderFunction } from "@remix-run/node";
import { AlertCircle } from "lucide-react";

export const loader: LoaderFunction = async () => {
  // メンテナンス画面は静的な内容のみ表示
  return Response.json({ status: "maintenance" });
};

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-yellow-100 p-4 rounded-full">
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">
            メンテナンス中
          </h1>
          
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            ただいまメンテナンス中です。しばらくお待ちください。
          </p>
        </div>

        {/* Twitter埋め込みセクション */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            最新情報
          </h2>
          <div className="text-center text-gray-500">
            <p className="mb-4">
              メンテナンスの最新情報は公式X（Twitter）でお知らせしています
            </p>
            <a
              href="https://x.com/sottonote"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors"
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