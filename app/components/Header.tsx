import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { cache, CACHE_KEYS } from "../lib/cache.client";
import { supabase } from "../lib/supabase.client";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    // Check cache first
    const cachedProfile = cache.get<{ name: string }>(
      CACHE_KEYS.USER_PROFILE(userId)
    );

    if (cachedProfile?.name) {
      setUserName(cachedProfile.name);
    } else {
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();

      if (profile?.name) {
        setUserName(profile.name);
        // Cache the profile
        cache.set(CACHE_KEYS.USER_PROFILE(userId), profile, 10 * 60 * 1000);
      } else {
        setUserName("ユーザー");
      }
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log("[Header] useEffect supabase.auth.getUser user:", user);
      console.log("[Header] user metadata:", user?.user_metadata);
      console.log("[Header] avatar_url:", user?.user_metadata?.avatar_url);
      setUser(user);

      if (user) {
        fetchUserProfile(user.id);
      }
    });
    // セッション変化も監視
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("[Header] onAuthStateChange session:", session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUserName("");
        }
      }
    );

    // プロフィール更新イベントをリッスン
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log("[Header] Profile updated:", event.detail);
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
    console.log("[Header] handleLogout called");
    await supabase.auth.signOut();
    setUser(null);
    setIsMenuOpen(false);
    toast.success("ログアウトしました");
    window.location.href = "/about";
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
    <header className="fixed left-0 right-0 top-0 z-50 h-10 border-b border-wellness-primary/10 bg-wellness-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-6">
        <Link to="/" className="text-sm font-medium text-wellness-primary">
          そっとノート
        </Link>
        <div>
          {user ? (
            <div className="user-menu relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-wellness-primary/10"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="ユーザーアバター"
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-wellness-primary text-white">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-8 w-36 rounded-md bg-white py-1 shadow-sm">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-800">
                    {userName || "ユーザー"}
                  </div>
                  <Link
                    to="/settings"
                    className="block px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    設定
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-3 py-1.5 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50"
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
