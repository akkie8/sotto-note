import { useEffect, useState } from "react";
import { Edit, MoreVertical, Trash2 } from "lucide-react";

interface ThreeDotsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ThreeDotsMenu({ onEdit, onDelete }: ThreeDotsMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".three-dots-menu")) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleEdit = () => {
    setIsMenuOpen(false);
    onEdit();
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete();
  };

  return (
    <div className="three-dots-menu relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex min-h-[32px] min-w-[32px] touch-manipulation items-center justify-center rounded-full p-1 transition-colors hover:bg-wellness-primary/10 active:bg-wellness-primary/20"
      >
        <MoreVertical size={16} className="text-wellness-textLight" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-8 w-32 rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
          <button
            onClick={handleEdit}
            className="flex w-full touch-manipulation items-center gap-2 px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <Edit size={14} />
            編集
          </button>
          <button
            onClick={handleDelete}
            className="flex w-full touch-manipulation items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      )}
    </div>
  );
}
