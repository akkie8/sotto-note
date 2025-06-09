import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { cache, CACHE_KEYS } from "../lib/cache.client";
import { supabase } from "../lib/supabase.client";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    // Check cache first
    const cachedProfile = cache.get<{ name: string; role: string }>(
      CACHE_KEYS.USER_PROFILE(userId)
    );

    if (cachedProfile?.name) {
      setUserName(cachedProfile.name);
      setUserRole(cachedProfile.role || "");
    } else {
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("user_id", userId)
        .single();

      if (profile) {
        setUserName(profile.name || "ユーザー");
        setUserRole(profile.role || "");
        // Cache the profile
        cache.set(CACHE_KEYS.USER_PROFILE(userId), profile, 10 * 60 * 1000);
      } else {
        setUserName("ユーザー");
        setUserRole("");
      }
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);

      if (user) {
        fetchUserProfile(user.id);
      }
    });
    // セッション変化も監視
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUserName("");
          setUserRole("");
        }
      }
    );

    // プロフィール更新イベントをリッスン
    const handleProfileUpdate = (event: CustomEvent) => {
      setUserName(event.detail.name);
    };

    window.addEventListener(
      "profileUpdated",
      handleProfileUpdate as EventListener
    );

    return () => {
      listener?.subscription.unsubscribe();
      window.removeEventListener(
        "profileUpdated",
        handleProfileUpdate as EventListener
      );
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
                {userRole === "admin" && (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                    admin
                  </span>
                )}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2 rounded-full p-2 transition-colors hover:bg-wellness-primary/10 active:bg-wellness-primary/20"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="ユーザーアバター"
                      className="h-9 w-9 rounded-full"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wellness-primary text-white">
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
