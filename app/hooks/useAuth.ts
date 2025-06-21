import { useCallback, useRef } from "react";
import { useFetcher } from "@remix-run/react";

interface AuthRefreshOptions {
  enabled?: boolean;
  onRefreshSuccess?: () => void;
  onRefreshError?: () => void;
}

interface RefreshResponse {
  error?: string;
  refreshed?: boolean;
}

/**
 * シンプルな認証リフレッシュフック
 * バックグラウンドでのトークンリフレッシュのみに特化
 */
export function useAuthRefresh(options: AuthRefreshOptions = {}) {
  const { enabled = true, onRefreshSuccess, onRefreshError } = options;
  const fetcher = useFetcher<RefreshResponse>();
  const isRefreshingRef = useRef(false);

  // 手動リフレッシュ実行
  const refreshToken = useCallback(() => {
    if (!enabled || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    fetcher.submit({}, { method: "POST", action: "/auth/refresh" });
  }, [enabled, fetcher]);

  // フェッチャー状態の監視
  const isIdle = fetcher.state === "idle";
  const data = fetcher.data;

  if (isIdle && data && isRefreshingRef.current) {
    isRefreshingRef.current = false;

    if (data.error) {
      onRefreshError?.();
    } else if (data.refreshed) {
      onRefreshSuccess?.();
    }
  }

  return {
    refreshToken,
    isRefreshing: fetcher.state === "submitting" || isRefreshingRef.current,
    lastError: data?.error,
  };
}
