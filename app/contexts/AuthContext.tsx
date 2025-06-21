import React, { createContext, useContext, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { useAuthStore } from "~/stores";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

/**
 * 認証コンテキストプロバイダー
 * RemixのルートローダーからのデータをZustandストアに同期
 */
export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const { user, isAuthenticated, isLoading, setUser, setLoading } =
    useAuthStore();

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser, setUser, setLoading]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * AuthContextを使用するフック
 * @deprecated useAuth, useUser, useSessionフックを直接使用することを推奨
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
