import { useState } from "react";
import { Plus, X } from "lucide-react";

export interface TagSelectorProps {
  selectedTags: string[];
  suggestedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function TagSelector({
  selectedTags,
  suggestedTags,
  onTagsChange,
  className = "",
}: TagSelectorProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // タグを削除
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      // タグを追加
      onTagsChange([...selectedTags, tag]);
    }
  };

  // const handleTagRemove = (tag: string) => {
  //   onTagsChange(selectedTags.filter((t) => t !== tag));
  // };

  // 表示するタグの数を制御
  const displayTags = showAllTags ? suggestedTags : suggestedTags.slice(0, 8);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* タグ選択エリア */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-wellness-text">
            タグを選択
          </span>
          {suggestedTags.length > 8 && (
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
            return (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`inline-flex min-h-[36px] touch-manipulation items-center gap-1 rounded-full px-3 py-2 text-sm transition-all active:scale-95 ${
                  isSelected
                    ? "bg-wellness-primary text-white"
                    : "bg-wellness-primary/10 text-wellness-primary hover:bg-wellness-primary/20"
                }`}
              >
                {isSelected ? (
                  <>
                    {tag}
                    <X size={12} />
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    {tag}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {suggestedTags.length === 0 && (
          <p className="text-xs italic text-wellness-textLight">
            利用可能なタグがありません
          </p>
        )}
      </div>
    </div>
  );
}
