import { useEffect, useCallback, useRef } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";

interface UseAuthRefreshOptions {
  enabled?: boolean;
  checkInterval?: number; // minutes
  onRefreshSuccess?: () => void;
  onRefreshError?: () => void;
}

interface RefreshResponse {
  error?: string;
  refreshed?: boolean;
  user?: any;
  session?: any;
}

export function useAuthRefresh(options: UseAuthRefreshOptions = {}) {
  const {
    enabled = true,
    checkInterval = 30, // 30分ごとにチェック
    onRefreshSuccess,
    onRefreshError,
  } = options;

  const fetcher = useFetcher();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout>();
  const isRefreshingRef = useRef(false);

  // トークンリフレッシュ実行
  const refreshToken = useCallback(() => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    console.log("[AuthRefresh] Attempting token refresh...");

    fetcher.submit(
      {},
      {
        method: "POST",
        action: "/auth/refresh",
      }
    );
  }, [fetcher]);

  // フェッチャーの状態監視
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as RefreshResponse;
      isRefreshingRef.current = false;

      if (data.error) {
        console.error("[AuthRefresh] Refresh failed:", data.error);
        onRefreshError?.();
        
        // 認証エラーの場合はログインページにリダイレクト
        if (data.error === "Authentication failed") {
          navigate("/login");
        }
      } else if (data.refreshed) {
        console.log("[AuthRefresh] Token refreshed successfully");
        onRefreshSuccess?.();
      }
    }
  }, [fetcher.state, fetcher.data, navigate, onRefreshSuccess, onRefreshError]);

  // 定期的なトークンチェック
  useEffect(() => {
    if (!enabled) return;

    const startPeriodicCheck = () => {
      intervalRef.current = setInterval(() => {
        refreshToken();
      }, checkInterval * 60 * 1000); // 分を秒に変換
    };

    // 初回実行（1分後）
    const initialTimer = setTimeout(() => {
      refreshToken();
      startPeriodicCheck();
    }, 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkInterval, refreshToken]);

  // ページフォーカス時のチェック
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      console.log("[AuthRefresh] Page focused, checking auth status...");
      refreshToken();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, refreshToken]);

  // ネットワーク復旧時のチェック
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      console.log("[AuthRefresh] Network restored, checking auth status...");
      refreshToken();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [enabled, refreshToken]);

  return {
    refreshToken,
    isRefreshing: fetcher.state === "submitting" || isRefreshingRef.current,
    lastRefreshError: (fetcher.data as RefreshResponse)?.error,
  };
}