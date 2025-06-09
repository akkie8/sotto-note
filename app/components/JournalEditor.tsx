import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

import {
  extractHashtags,
  getManualTags,
  getSuggestedTags,
  getUserTags,
  mergeTags,
} from "~/lib/hashtag";
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
}

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
}: JournalEditorProps) {
  const [content, setContent] = useState(entry?.content || "");
  const [selectedMood, setSelectedMood] = useState(entry?.mood || "");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (entry) {
      setContent(entry.content);
      setSelectedMood(entry.mood);

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
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const lineHeight = 1.5; // leading-relaxed
      const fontSize = 16; // text-base
      const padding = 24; // p-3 (12px * 2)
      const minHeight = fontSize * lineHeight * 5 + padding; // 5行分
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = newHeight + "px";
    }
  };

  // コンテンツが変更されたときにテキストエリアの高さを調整
  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  const handleSave = async () => {
    console.log("[JournalEditor] handleSave called with:", {
      content: content.trim(),
      mode,
      contentLength: content.trim().length,
      manualTags: manualTags,
    });

    if (!content.trim()) {
      console.log("[JournalEditor] Content is empty");
      return;
    }

    console.log("[JournalEditor] Calling onSave...");
    await onSave(content.trim(), "neutral", manualTags); // 手動タグも渡す
  };

  const isEditable = mode === "new" || mode === "edit";
  const isView = mode === "view";

  // タグ関連の計算
  const userTags = getUserTags(userJournals);
  const suggestedTags = getSuggestedTags(userTags);
  const allCurrentTags = mergeTags(content, manualTags);

  // デバッグ用ログ
  console.log("[JournalEditor] Current state:", {
    mode,
    content: content.slice(0, 50) + "...",
    contentLength: content.length,
    contentTrimmed: !!content.trim(),
    saving,
    isButtonDisabled: saving || !content.trim(),
  });

  const getPlaceholder = () => {
    if (mode === "new") {
      return "今日はどんな一日でしたか？\n\n思ったことや感じたことを、ここに自由に書いてみてください...\n\nあなたの心の声に耳を傾けて、素直な気持ちを記録しましょう。";
    }
    return "内容を編集してください...";
  };

  return (
    <div className="flex min-h-full flex-col bg-wellness-bg">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-wellness-surface/90 backdrop-blur-sm">
        <div className="px-6 py-2">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="flex touch-manipulation items-center gap-2 rounded p-2 text-wellness-textLight transition-colors hover:text-wellness-text active:bg-wellness-primary/5"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">戻る</span>
            </button>
            <div className="flex items-center gap-2">
              {isView ? (
                <>
                  <span className="text-xs text-wellness-textLight">
                    {content.length} 文字 • {allCurrentTags.length} タグ
                  </span>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="min-h-[44px] touch-manipulation rounded-lg bg-wellness-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-wellness-secondary active:scale-95"
                    >
                      編集
                    </button>
                  )}
                  {onAskAI && (
                    <button
                      onClick={onAskAI}
                      disabled={aiLoading}
                      className="min-h-[44px] touch-manipulation rounded-lg bg-wellness-secondary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-wellness-primary active:scale-95 disabled:opacity-50"
                    >
                      {aiLoading ? "AI思考中..." : "AI相談"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs text-wellness-textLight">
                    {content.length} 文字 • 手動{manualTags.length}/5 • 自動
                    {extractHashtags(content).length}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={saving || !content.trim()}
                    className="min-h-[44px] touch-manipulation rounded-lg bg-wellness-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-wellness-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="flex flex-1 flex-col px-6">
        {/* 日付と時間 - 既存エントリーのみ上部表示 */}
        {mode !== "new" && entry && entry.date && (
          <div className="py-2">
            <div className="flex items-center gap-3 text-xs text-wellness-textLight">
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

        {/* Writing Area - Main Focus */}
        <div className="flex flex-1 flex-col pb-4">
          <div className="relative flex-1">
            {isView ? (
              <div
                className="w-full p-3 text-base leading-relaxed text-wellness-text md:text-sm"
                style={{ minHeight: "auto" }}
              >
                <pre className="whitespace-pre-wrap font-sans">{content}</pre>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full resize-none bg-transparent p-3 text-base leading-relaxed text-wellness-text placeholder-wellness-textLight/60 focus:outline-none md:text-sm"
                placeholder={getPlaceholder()}
                rows={5}
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
            <div className="flex flex-wrap gap-2">
              {allCurrentTags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-md bg-wellness-primary/10 px-3 py-1.5 text-sm text-wellness-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI返答エリア */}
        {aiReply && (
          <div className="mt-6 rounded-lg bg-wellness-surface p-4">
            <h3 className="mb-3 text-sm font-medium text-wellness-text">
              AIからの返答
            </h3>
            <div className="whitespace-pre-wrap rounded bg-wellness-bg p-3 text-sm text-wellness-text">
              {aiReply}
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 下部情報エリア（新規作成時の日付・時間・タグ） */}
        <div className="mt-4 border-t border-wellness-primary/10 pt-4">
          {/* 新規作成時の日付・時間 */}
          {mode === "new" && (
            <div className="mb-3">
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
            <div className="mb-3">
              <TagSelector
                selectedTags={manualTags}
                suggestedTags={suggestedTags}
                autoTags={extractHashtags(content)}
                onTagsChange={setManualTags}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
