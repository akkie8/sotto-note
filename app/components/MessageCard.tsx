import { forwardRef } from "react";

interface MessageCardProps {
  message: string;
  userName?: string;
  showBranding?: boolean;
}

export const MessageCard = forwardRef<HTMLDivElement, MessageCardProps>(
  ({ message, userName, showBranding = true }, ref) => {
    return (
      <div
        ref={ref}
        className="relative rounded-2xl bg-gradient-to-br from-wellness-surface via-white to-wellness-surface/50 p-6 shadow-xl"
        style={{
          background:
            "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)",
          width: "360px",
          height: "240px",
        }}
      >
        {/* 装飾的な背景パターン */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute right-4 top-4 text-4xl">🌸</div>
          <div className="absolute bottom-8 left-6 text-2xl">✨</div>
          <div className="absolute left-4 top-1/3 text-xl">🌙</div>
        </div>

        {/* ヘッダー */}
        <div className="mb-4 text-center">
          <h3 className="mb-1 text-base font-bold text-wellness-primary">
            そっとさんからのメッセージ
          </h3>
          {userName && (
            <p className="text-xs text-wellness-textLight">{userName}さんへ</p>
          )}
        </div>

        {/* メッセージ本文 */}
        <div className="mb-4 flex flex-1 items-center justify-center">
          <div className="relative">
            {/* 引用符の装飾 */}
            <div className="absolute -left-2 -top-2 font-serif text-3xl text-wellness-primary/30">
              &ldquo;
            </div>
            <p className="px-3 py-1 text-center text-sm leading-relaxed text-wellness-text">
              {message.length > 100
                ? message.substring(0, 100) + "..."
                : message}
            </p>
            <div className="absolute -bottom-2 -right-2 font-serif text-3xl text-wellness-primary/30">
              &rdquo;
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center">
          <p className="mb-2 text-xs italic text-wellness-textLight">
            - そっとさん -
          </p>

          {showBranding && (
            <div className="border-t border-wellness-primary/10 pt-2">
              <p className="text-xs font-medium text-wellness-primary">
                #そっとノート
              </p>
              <p className="mt-0.5 text-xs text-wellness-textLight/70">
                心に寄り添うAI
              </p>
            </div>
          )}
        </div>

        {/* 微細なボーダー効果 */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-wellness-primary/5"></div>
      </div>
    );
  }
);

MessageCard.displayName = "MessageCard";
