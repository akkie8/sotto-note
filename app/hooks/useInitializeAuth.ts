import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { useAuthStore } from "~/stores";

/**
 * Remixのルートローダーからの初期認証データをZustandストアに同期するフック
 * root.tsxで使用
 */
export function useInitializeAuth(initialUser?: User | null) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser, setUser, setLoading]);
}
