import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { supabase } from "../lib/supabase.client";

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    // セッション変化も監視
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.success("ログアウトしました");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-4xl px-4 py-1">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-base font-medium text-gray-900">
            そっとノート
          </Link>
          <div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
