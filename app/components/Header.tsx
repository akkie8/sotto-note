import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { supabase } from "../lib/supabase.client";

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log("[Header] useEffect supabase.auth.getUser user:", user);
      setUser(user);
    });
    // セッション変化も監視
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("[Header] onAuthStateChange session:", session);
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    console.log("[Header] handleLogout called");
    await supabase.auth.signOut();
    setUser(null);
    toast.success("ログアウトしました");
    window.location.href = "/about";
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-12 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-4">
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
          ) : null}
        </div>
      </div>
    </header>
  );
}
