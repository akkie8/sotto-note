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
    <header className="shadow-gentle sticky top-0 z-50 mx-2 mb-4 rounded-b-3xl bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link
          to="/"
          className="text-wellness-accent select-none text-2xl font-bold tracking-wide drop-shadow-sm"
        >
          そっとノート
        </Link>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-wellness-text bg-wellness-accent/30 rounded-full px-3 py-1 text-sm font-medium">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-wellness px-4 py-1.5 text-sm"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-wellness px-4 py-1.5 text-sm">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
