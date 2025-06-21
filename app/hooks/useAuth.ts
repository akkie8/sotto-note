import { useCallback, useEffect, useRef } from "react";
import { useFetcher, useRouteLoaderData } from "@remix-run/react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "~/lib/supabase.client";
import { useAuthStore } from "~/stores";

interface AuthRefreshOptions {
  enabled?: boolean;
  onRefreshSuccess?: () => void;
  onRefreshError?: () => void;
}

interface RefreshResponse {
  error?: string;
  refreshed?: boolean;
}

interface RootLoaderData {
  user?: User | null;
  env?: Record<string, string>;
}

/**
 * 認証状態を管理するメインフック
 * Remix loaderデータとZustand storeを同期
 */
export function useAuth() {
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const { user, setUser, setLoading, isAuthenticated, isLoading } =
    useAuthStore();

  useEffect(() => {
    if (rootData?.user !== undefined) {
      setUser(rootData.user);
      setLoading(false);
    }
  }, [rootData?.user, setUser, setLoading]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    signOut,
  };
}

/**
 * ユーザー情報のみを取得するフック
 */
export function useUser() {
  const { user, isAuthenticated } = useAuthStore();
  return { user, isAuthenticated };
}

/**
 * セッション情報を管理するフック
 */
export function useSession() {
  const { session, updateTokens } = useAuthStore();

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (data.session && !error) {
      updateTokens(
        data.session.access_token,
        data.session.refresh_token ?? "",
        new Date(data.session.expires_at ?? 0).getTime()
      );
      return true;
    }
    return false;
  }, [updateTokens]);

  return {
    session,
    refreshSession,
    isExpired: session?.expiresAt ? Date.now() > session.expiresAt : true,
  };
}

/**
 * 認証リフレッシュフック
 * バックグラウンドでのトークンリフレッシュを管理
 */
export function useAuthRefresh(options: AuthRefreshOptions = {}) {
  const { enabled = true, onRefreshSuccess, onRefreshError } = options;
  const fetcher = useFetcher<RefreshResponse>();
  const isRefreshingRef = useRef(false);
  const { refreshSession } = useSession();

  const refreshToken = useCallback(() => {
    if (!enabled || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    fetcher.submit({}, { method: "POST", action: "/auth/refresh" });
  }, [enabled, fetcher]);

  const isIdle = fetcher.state === "idle";
  const data = fetcher.data;

  if (isIdle && data && isRefreshingRef.current) {
    isRefreshingRef.current = false;

    if (data.error) {
      onRefreshError?.();
    } else if (data.refreshed) {
      refreshSession();
      onRefreshSuccess?.();
    }
  }

  return {
    refreshToken,
    isRefreshing: fetcher.state === "submitting" || isRefreshingRef.current,
    lastError: data?.error,
  };
}
