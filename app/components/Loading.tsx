import { cn } from "~/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export function Loading({
  className,
  size = "md",
  text = "読み込み中...",
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  const containerClasses = fullScreen
    ? "flex min-h-screen items-center justify-center"
    : "flex items-center justify-center";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "animate-spin rounded-full border-wellness-primary/30 border-t-wellness-primary",
            sizeClasses[size]
          )}
          aria-label="Loading"
        />
        {text && (
          <p className="text-sm text-wellness-textLight animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}