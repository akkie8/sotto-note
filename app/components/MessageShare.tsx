import { useRef, useState } from "react";
import { Download, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";

import { MessageCard } from "./MessageCard";

interface MessageShareProps {
  message: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageShare({
  message,
  userName,
  isOpen,
  onClose,
}: MessageShareProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      // 動的インポートでhtml2canvasを読み込み
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // 高解像度
        useCORS: true,
        allowTaint: true,
        width: 360,
        height: 240,
      });

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/png",
          1.0
        );
      });
    } catch (error) {
      console.error("画像生成エラー:", error);
      toast.error("画像の生成に失敗しました");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `そっとさんからのメッセージ_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("画像をダウンロードしました");
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    if (navigator.share && navigator.canShare()) {
      try {
        const file = new File([blob], "そっとさんからのメッセージ.png", {
          type: "image/png",
        });

        await navigator.share({
          title: "そっとさんからのメッセージ",
          text: "そっとノートでそっとさんからやさしいメッセージをもらいました 🌸",
          files: [file],
        });

        toast.success("シェアしました");
      } catch (error) {
        console.error("シェアエラー:", error);
        // Web Share APIが失敗した場合はダウンロードにフォールバック
        handleDownload();
      }
    } else {
      // Web Share APIが使えない場合はダウンロード
      handleDownload();
    }
  };

  const handleTwitterShare = async () => {
    const tweetText = encodeURIComponent(
      `そっとノートでそっとさんからやさしいメッセージをもらいました 🌸\n\n#そっとノート #心のケア`
    );
    const url = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-semibold text-wellness-text">
            メッセージをシェア
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* プレビュー */}
        <div className="p-4">
          <div className="mb-6 flex justify-center">
            <div className="origin-center scale-90">
              <MessageCard
                ref={cardRef}
                message={message}
                userName={userName}
                showBranding={true}
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={handleShare}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wellness-primary px-4 py-3 text-white transition-colors hover:bg-wellness-secondary disabled:opacity-50"
            >
              <Share2 size={20} />
              {isGenerating ? "生成中..." : "シェアする"}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 rounded-xl bg-wellness-surface px-4 py-3 text-wellness-text transition-colors hover:bg-wellness-surface/80 disabled:opacity-50"
              >
                <Download size={18} />
                ダウンロード
              </button>

              <button
                onClick={handleTwitterShare}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-white transition-colors hover:bg-blue-600"
              >
                <Twitter size={18} />
                Twitter
              </button>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mt-4 rounded-lg bg-wellness-surface/50 p-3">
            <p className="text-xs text-wellness-textLight">
              💡
              シェア機能でそっとノートを広めて、より多くの人に心のケアを届けましょう
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
