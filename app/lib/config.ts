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

  return "production";
};

// OAuth リダイレクトURL取得
export const getOAuthRedirectUrl = () => {
  // 開発環境では現在のブラウザのオリジンを使用
  if (typeof window !== "undefined") {
    // 環境変数が設定されている場合はそれを使用
    if (import.meta.env.VITE_OAUTH_REDIRECT_URL) {
      return import.meta.env.VITE_OAUTH_REDIRECT_URL;
    }

    // 開発環境では現在のポートを自動検出
    const currentOrigin = window.location.origin;
    return `${currentOrigin}/`;
  }

  // サーバーサイドの場合は環境に応じたデフォルト値
  const env = getEnvironment();

  switch (env) {
    case "development":
      return "http://localhost:5173/";
    case "staging":
      return "https://staging.sottonote.com/";
    case "production":
      return "https://www.sottonote.com/";
    default:
      return "http://localhost:5173/";
  }
};

// その他の環境設定
export const config = {
  environment: getEnvironment(),
  oauthRedirectUrl: getOAuthRedirectUrl(),
};
