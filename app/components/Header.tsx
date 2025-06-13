import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import { toast } from "sonner";

import { supabase } from "../lib/supabase.client";
import {
  selectAiUsageInfo,
  selectUser,
  selectUserName,
  selectUserRole,
  useUserStore,
} from "../stores/userStore";

export function Header() {
  const user = useUserStore(selectUser);
  const userName = useUserStore(selectUserName);
  const userRole = useUserStore(selectUserRole);
  const aiUsageInfo = useUserStore(selectAiUsageInfo);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);

  // Handle avatar loading state
  useEffect(() => {
    if (user) {
      setAvatarLoading(false);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    toast.success("ログアウトしました");
    window.location.href = "/";
  };

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu")) {
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

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 h-14 bg-wellness-surface/90 backdrop-blur-sm"
      style={{ boxShadow: "inset 0 -8px 16px -8px rgba(0, 0, 0, 0.1)" }}
    >
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-6">
        <Link to="/" className="text-base font-medium text-wellness-primary">
          そっとノート
        </Link>
        <div>
          {user ? (
            <div className="user-menu relative">
              <div className="flex items-center gap-2">
                {aiUsageInfo &&
                  !aiUsageInfo.isAdmin &&
                  aiUsageInfo.monthlyLimit !== null && (
                    <div className="flex items-center gap-1 rounded-full bg-wellness-primary/10 px-2 py-1 text-xs font-medium text-wellness-primary">
                      <svg
                        className="h-3 w-3"
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
                      {aiUsageInfo.monthlyLimit -
                        (aiUsageInfo.remainingCount || 0)}
                      /{aiUsageInfo.monthlyLimit}
                    </div>
                  )}
                {userRole === "admin" && (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                    admin
                  </span>
                )}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 rounded-full p-2 transition-colors hover:bg-wellness-primary/10 active:bg-wellness-primary/20"
                >
                  {avatarLoading ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wellness-primary/20">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-wellness-primary border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {user.user_metadata?.avatar_url && (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="ユーザーアバター"
                          className="h-9 w-9 rounded-full"
                          onError={(e) => {
                            // フォールバックとしてデフォルトアバターを表示
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      )}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full bg-wellness-primary text-white ${user.user_metadata?.avatar_url && !avatarLoading ? "hidden" : ""}`}
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {isMenuOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2">
                    <div className="text-sm font-medium text-gray-800">
                      {userName || "ユーザー"}
                    </div>
                    {userRole && (
                      <div className="mt-1 text-xs text-gray-500">
                        Role: {userRole}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/settings"
                    className="block touch-manipulation px-4 py-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    設定
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full touch-manipulation px-4 py-3 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
