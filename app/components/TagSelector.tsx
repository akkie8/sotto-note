import { useState } from "react";
import { Hash, Plus, X } from "lucide-react";

export interface TagSelectorProps {
  selectedTags: string[];
  suggestedTags: string[];
  autoTags: string[]; // 文章から自動抽出されたタグ
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function TagSelector({
  selectedTags,
  suggestedTags,
  autoTags,
  onTagsChange,
  className = "",
}: TagSelectorProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  // 全てのタグを統合（自動抽出 + 提案タグ、重複除去）
  const allAvailableTags = Array.from(new Set([...autoTags, ...suggestedTags]));

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // タグを削除
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      // タグを追加（最大5個まで）
      if (selectedTags.length < 5) {
        onTagsChange([...selectedTags, tag]);
      }
    }
  };

  // const handleTagRemove = (tag: string) => {
  //   onTagsChange(selectedTags.filter((t) => t !== tag));
  // };

  // 表示するタグの数を制御
  const displayTags = showAllTags
    ? allAvailableTags
    : allAvailableTags.slice(0, 8);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* タグ選択エリア */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-wellness-text">
            タグを選択
          </span>
          {allAvailableTags.length > 8 && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="touch-manipulation rounded p-1 text-sm text-wellness-primary transition-colors hover:text-wellness-secondary active:bg-wellness-primary/5"
            >
              {showAllTags ? "少なく表示" : "もっと見る"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {displayTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            const isAutoTag = autoTags.includes(tag);
            const isMaxReached = selectedTags.length >= 5 && !isSelected;
            return (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                disabled={isMaxReached}
                className={`inline-flex min-h-[32px] touch-manipulation items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all active:scale-95 ${
                  isMaxReached
                    ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                    : isSelected
                      ? isAutoTag
                        ? "border border-wellness-secondary bg-wellness-secondary text-white"
                        : "border border-wellness-primary bg-wellness-primary text-white"
                      : isAutoTag
                        ? "border border-wellness-secondary/30 bg-wellness-secondary/10 text-wellness-secondary hover:bg-wellness-secondary/20"
                        : "border border-wellness-primary/30 bg-wellness-primary/10 text-wellness-primary hover:bg-wellness-primary/20"
                }`}
                title={
                  isMaxReached
                    ? "最大5個まで選択できます"
                    : isAutoTag
                      ? "文章から自動抽出されたタグ"
                      : "過去のジャーナルから提案されたタグ"
                }
              >
                {isSelected ? (
                  <>
                    {isAutoTag ? <Hash size={10} /> : <X size={10} />}
                    {tag}
                  </>
                ) : (
                  <>
                    {isAutoTag ? <Hash size={10} /> : <Plus size={10} />}
                    {tag}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {allAvailableTags.length === 0 && (
          <p className="text-sm italic text-wellness-textLight">
            利用可能なタグがありません
          </p>
        )}

        {/* 凡例と制限メッセージ */}
        {allAvailableTags.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedTags.length >= 5 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                手動選択は最大5個までです。これ以上タグを追加できません。
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-wellness-textLight">
              <div className="flex items-center gap-1">
                <Hash size={10} />
                <span>文章から抽出</span>
              </div>
              <div className="flex items-center gap-1">
                <Plus size={10} />
                <span>過去から提案</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
