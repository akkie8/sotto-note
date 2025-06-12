import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";

import {
  extractHashtags,
  getManualTags,
  getSuggestedTags,
  getUserTags,
  mergeTags,
} from "~/lib/hashtag";
import { MessageShare } from "./MessageShare";
import { TagSelector } from "./TagSelector";

export type JournalMode = "new" | "edit" | "view";

export interface JournalEntry {
  id?: string;
  content: string;
  mood: string;
  tags?: string;
  timestamp?: number;
  date?: string;
  user_id?: string;
  has_ai_reply?: boolean;
}

export interface JournalEditorProps {
  mode: JournalMode;
  entry?: JournalEntry;
  onSave: (
    content: string,
    mood: string,
    manualTags: string[]
  ) => Promise<void>;
  onCancel: () => void;
  onEdit?: () => void;
  onAskAI?: () => void;
  aiLoading?: boolean;
  saving?: boolean;
  aiReply?: string;
  error?: string;
  userJournals?: Array<{ tags?: string }>; // ユーザーの過去ジャーナル（タグ取得用）
  baseTags?: string[]; // ベースタグ
  userName?: string; // ユーザー名（シェア用）
  aiUsageInfo?: {
    remainingCount: number | null;
    monthlyLimit: number | null;
    isAdmin: boolean;
  };
}

const MAX_CHARACTERS = 1500;

export function JournalEditor({
  mode,
  entry,
  onSave,
  onCancel,
  onEdit,
  onAskAI,
  aiLoading = false,
  saving = false,
  aiReply,
  error,
  userJournals = [],
  baseTags = [],
  userName,
  aiUsageInfo,
}: JournalEditorProps) {
  const [content, setContent] = useState(entry?.content || "");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (entry) {
      setContent(entry.content);

      // 既存エントリーの場合、保存されているタグから手動タグを抽出
      if (entry.tags) {
        const allSavedTags = entry.tags
          .split(",")
          .filter((tag) => tag.trim() !== "");
        const manualOnlyTags = getManualTags(allSavedTags, entry.content);
        setManualTags(manualOnlyTags);
      }
    }
  }, [entry]);

  // テキストエリアの自動リサイズ機能
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 一時的にautoにしてscrollHeightを正確に取得
      textarea.style.height = "auto";

      // 実際のコンテンツ高さを取得
      const scrollHeight = textarea.scrollHeight;

      // 最小高さを計算（編集時は内容に応じて動的に調整）
      const lineHeight = 1.5; // leading-relaxed
      const fontSize = 14; // text-sm
      const padding = 24; // py-3 (12px * 2)

      // 内容の行数を概算
      const textLines = content.split("\n").length;
      const estimatedLines = Math.max(textLines, 1);

      // 最小行数を設定（新規作成時は2行、編集時は内容に応じて1-3行）
      let minRows;
      if (mode === "new") {
        minRows = 2;
      } else {
        minRows = Math.min(Math.max(estimatedLines, 1), 3);
      }

      const minHeight = fontSize * lineHeight * minRows + padding;
      const newHeight = Math.max(scrollHeight, minHeight);

      textarea.style.height = newHeight + "px";
    }
  }, [mode, content]);

  // コンテンツが変更されたときにテキストエリアの高さを調整
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    await onSave(content.trim(), "neutral", manualTags); // 手動タグも渡す
  };

  const isEditable = mode === "new" || mode === "edit";
  const isView = mode === "view";

  // 編集モードの時に自動フォーカス
  useEffect(() => {
    if (isEditable && textareaRef.current) {
      // 少し遅延させてフォーカスを設定（レンダリング完了後）
      setTimeout(() => {
        textareaRef.current?.focus();
        // カーソルを文末に移動
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
          );
        }
      }, 100);
    }
  }, [isEditable, mode]);

  // タグ関連の計算
  const userTags = getUserTags(userJournals);
  const suggestedTags = getSuggestedTags(userTags, baseTags);
  const allCurrentTags = mergeTags(content, manualTags);

  const getPlaceholder = () => {
    if (mode === "new") {
      return "今はどんな気持ちですか？";
    }
    return "内容を編集してください...";
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {mode !== "new" && (
              <button
                onClick={onCancel}
                className="flex touch-manipulation items-center gap-2 rounded p-2 text-wellness-textLight transition-colors hover:text-wellness-text active:bg-wellness-primary/5"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">戻る</span>
              </button>
            )}
            {mode === "new" && <div />}
            <div className="flex items-center gap-2">
              {isView ? (
                <>
                  <span className="text-xs text-wellness-textLight">
                    {content.length}/{MAX_CHARACTERS} 文字 •{" "}
                    {allCurrentTags.length} タグ
                  </span>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="min-h-[36px] touch-manipulation rounded-lg bg-wellness-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-wellness-secondary active:scale-95"
                    >
                      編集
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs text-wellness-textLight">
                    <span
                      className={
                        content.length > MAX_CHARACTERS * 0.9
                          ? "text-orange-500"
                          : ""
                      }
                    >
                      {content.length}/{MAX_CHARACTERS}
                    </span>
                    {" • "}手動{manualTags.length}/5 • 自動
                    {extractHashtags(content).length}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={saving || !content.trim()}
                    className="min-h-[36px] touch-manipulation rounded-lg bg-wellness-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-wellness-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      saving
                        ? "保存中..."
                        : !content.trim()
                          ? "内容を入力してください"
                          : "保存"
                    }
                  >
                    {saving ? "保存中..." : "保存"}
                    {!content.trim() && (
                      <span className="ml-1 text-red-300">!</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col p-4">
        {/* 日付と時間 - 既存エントリーのみ上部表示 */}
        {mode !== "new" && entry && entry.date && (
          <div className="">
            <div className="mb-2 flex items-center gap-3 text-xs text-wellness-textLight">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{entry.date}</span>
              </div>
              {entry.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>
                    {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Writing Area - Main Focus - NO FLEX-1 */}
        <div className="flex flex-col pb-4">
          <div className="relative">
            {isView ? (
              <div
                className="w-full px-2 py-3 text-sm leading-relaxed text-wellness-text"
                style={{ minHeight: "auto" }}
              >
                <pre className="whitespace-pre-wrap font-sans">{content}</pre>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue.length <= MAX_CHARACTERS) {
                    setContent(newValue);
                  }
                }}
                className="w-full resize-none bg-transparent px-2 py-3 text-sm leading-relaxed text-wellness-text placeholder-wellness-textLight/60 focus:outline-none"
                placeholder={getPlaceholder()}
                rows={
                  mode === "new"
                    ? 2
                    : Math.min(Math.max(content.split("\n").length, 1), 3)
                }
                style={{
                  height: "auto",
                  overflow: "hidden",
                }}
              />
            )}
          </div>
        </div>

        {/* タグ表示エリア（閲覧モード時） */}
        {isView && allCurrentTags.length > 0 && (
          <div className="mt-6 border-t border-wellness-primary/10 pt-4">
            <h3 className="mb-3 text-sm font-medium text-wellness-textLight">
              タグ
            </h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {allCurrentTags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-md bg-wellness-primary/5 px-2 py-1 text-xs text-wellness-primary/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* そっとさんからの返答 */}
        {aiReply && (
          <div className="mt-6 border-t border-wellness-primary/10 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-wellness-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-sm font-medium text-wellness-primary">
                  そっとさんからのメッセージ
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1 rounded-full bg-wellness-primary px-3 py-1.5 text-xs text-white transition-colors hover:bg-wellness-secondary active:bg-wellness-primary/80"
                title="メッセージをシェア"
              >
                <Share2 size={14} />
                <span>シェア</span>
              </button>
            </div>
            <div className="mx-auto max-w-2xl rounded-lg bg-wellness-primary/5 p-4">
              <div className="text-sm leading-relaxed text-wellness-text">
                {aiReply.split("\n").map((line, index) => (
                  <div key={index} className={index > 0 ? "mt-3" : ""}>
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 新規作成時の日付・時間 */}
        {mode === "new" && (
          <div className="mb-4">
            <div className="flex items-center gap-3 text-xs text-wellness-textLight">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{new Date().toLocaleDateString("ja-JP")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>
                  {new Date().toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* タグエリア */}
        {isEditable && (
          <div className="mb-4">
            <TagSelector
              selectedTags={manualTags}
              suggestedTags={suggestedTags}
              autoTags={extractHashtags(content)}
              onTagsChange={setManualTags}
            />
          </div>
        )}

        {/* AI相談ボタン */}
        {onAskAI && isView && !aiReply && !entry?.has_ai_reply && (
          <div className="mb-4 border-t border-wellness-primary/20 pt-4">
            <div className="text-center">
              <button
                onClick={onAskAI}
                disabled={aiLoading || (aiUsageInfo && !aiUsageInfo.isAdmin && aiUsageInfo.remainingCount === 0)}
                className="inline-flex items-center gap-3 rounded-full bg-wellness-primary px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-wellness-primary/90 hover:shadow-xl disabled:opacity-50 disabled:hover:shadow-lg"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.993-.523c-.993.266-2.207.423-2.957.423-2.485 0-4.05-1.565-4.05-4.05 0-.75.157-1.964.423-2.957A8.955 8.955 0 013 12a8 8 0 118 8z"
                  />
                </svg>
                {aiLoading ? "そっとさん思考中..." : "そっとさんに聞いてもらう"}
              </button>
              {aiUsageInfo && !aiUsageInfo.isAdmin && aiUsageInfo.monthlyLimit !== null && (
                <p className="mt-2 text-sm text-wellness-textLight">
                  今月の利用回数: {aiUsageInfo.monthlyLimit - (aiUsageInfo.remainingCount || 0)} / {aiUsageInfo.monthlyLimit}回
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {aiReply && (
        <MessageShare
          message={aiReply}
          userName={userName}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
