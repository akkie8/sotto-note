import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Calendar, Clock, Edit, Save } from "lucide-react";

import { moodColors } from "~/moodColors";

export type JournalMode = "new" | "edit" | "view";

export interface JournalEntry {
  id?: string;
  content: string;
  mood: string;
  timestamp?: number;
  date?: string;
  user_id?: string;
}

export interface JournalEditorProps {
  mode: JournalMode;
  entry?: JournalEntry;
  onSave: (content: string, mood: string) => Promise<void>;
  onCancel: () => void;
  onEdit?: () => void;
  onAskAI?: () => void;
  aiLoading?: boolean;
  saving?: boolean;
  aiReply?: string;
  error?: string;
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
}: JournalEditorProps) {
  const [content, setContent] = useState(entry?.content || "");
  const [selectedMood, setSelectedMood] = useState(entry?.mood || "");

  useEffect(() => {
    if (entry) {
      setContent(entry.content);
      setSelectedMood(entry.mood);
    }
  }, [entry]);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }
    if (!selectedMood) {
      return;
    }

    await onSave(content.trim(), selectedMood);
  };

  const isEditable = mode === "new" || mode === "edit";
  const isView = mode === "view";
  const mood = selectedMood
    ? moodColors[selectedMood as keyof typeof moodColors]
    : null;

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
              className="flex items-center gap-2 text-wellness-textLight transition-colors hover:text-wellness-text"
            >
              <ArrowLeft size={16} />
              <span className="text-xs">戻る</span>
            </button>
            <div className="flex items-center gap-2">
              {isView ? (
                <>
                  <span className="text-xs text-wellness-textLight">
                    {content.length} 文字
                  </span>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="rounded bg-wellness-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-wellness-secondary"
                    >
                      編集
                    </button>
                  )}
                  {onAskAI && (
                    <button
                      onClick={onAskAI}
                      disabled={aiLoading}
                      className="rounded bg-wellness-secondary px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-wellness-primary disabled:opacity-50"
                    >
                      {aiLoading ? "AI思考中..." : "AI相談"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs text-wellness-textLight">
                    {content.length} 文字
                  </span>
                  <button
                    onClick={onCancel}
                    className="rounded border border-wellness-primary px-3 py-1.5 text-xs font-medium text-wellness-primary transition-all hover:bg-wellness-primary hover:text-white"
                  >
                    {mode === "new" ? "戻る" : "キャンセル"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !content.trim() || !selectedMood}
                    className="rounded bg-wellness-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-wellness-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col px-6">
        {/* 日付と時間 - コンパクト */}
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

        {/* 気分セレクター - コンパクト */}
        <div className="py-3">
          <div className="mb-2 flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-medium text-wellness-text">
              {mode === "new" ? "今の気分" : "気分"}
            </span>
            <div className="flex gap-1 overflow-x-auto">
              {isView ? (
                <span
                  className={`flex-shrink-0 rounded px-2 py-1 text-xs ${
                    mood?.color || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {mood?.label || selectedMood}
                </span>
              ) : (
                Object.entries(moodColors).map(
                  ([moodKey, { color, hoverColor, label }]) => (
                    <button
                      key={moodKey}
                      type="button"
                      className={`flex-shrink-0 rounded px-2 py-1 text-xs transition-all ${color} ${
                        selectedMood === moodKey
                          ? `text-wellness-text`
                          : `${hoverColor} text-wellness-textLight`
                      }`}
                      onClick={() => setSelectedMood(moodKey)}
                    >
                      {label}
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </div>

        {/* Writing Area - Main Focus */}
        <div className="flex flex-1 flex-col pb-4">
          <div className="relative flex-1">
            {isView ? (
              <div className="h-full min-h-[60vh] w-full p-3 text-sm leading-relaxed text-wellness-text">
                <pre className="whitespace-pre-wrap font-sans">{content}</pre>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-full min-h-[60vh] w-full resize-none bg-transparent p-3 text-sm leading-relaxed text-wellness-text placeholder-wellness-textLight/60 focus:outline-none"
                placeholder={getPlaceholder()}
                autoFocus
              />
            )}
          </div>
        </div>

        {/* AI返答エリア */}
        {aiReply && (
          <div className="mt-4 rounded-lg bg-wellness-surface p-4">
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
      </div>
    </div>
  );
}
