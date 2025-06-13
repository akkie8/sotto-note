/**
 * 環境別の設定を管理するファイル
 */

// 環境判定
const getEnvironment = () => {
  if (typeof window === "undefined") {
    // サーバーサイド
    return process.env.NODE_ENV || "development";
  }

  // クライアントサイド
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "development";
  }

  if (hostname.includes("staging") || hostname.includes("stg")) {
    return "staging";
  }

  if (hostname.includes("vercel.app")) {
    return "staging";
  }

  return "production";
};

// OAuth リダイレクトURL取得
export const getOAuthRedirectUrl = () => {
  // 環境変数があれば優先して使用
  if (import.meta.env.VITE_OAUTH_REDIRECT_URL) {
    return import.meta.env.VITE_OAUTH_REDIRECT_URL;
  }

  // クライアントサイドでは常に現在のオリジンを使用
  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    return `${currentOrigin}/auth/callback`;
  }

  // サーバーサイドのフォールバック
  return "http://localhost:5173/auth/callback";
};

// その他の環境設定
export const config = {
  environment: getEnvironment(),
  oauthRedirectUrl: getOAuthRedirectUrl(),
};
