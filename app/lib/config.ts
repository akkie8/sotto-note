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

// その他の環境設定
export const config = {
  environment: getEnvironment(),
};
