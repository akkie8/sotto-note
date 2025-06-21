import { createCookieSessionStorage } from "@remix-run/node";

import { AUTH_CONFIG } from "./config";
import type { AuthSession, SessionData } from "./types";

// セッションストレージの作成
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: AUTH_CONFIG.COOKIE_NAME,
      httpOnly: true,
      maxAge: AUTH_CONFIG.SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secrets: [sessionSecret],
      secure: process.env.NODE_ENV === "production",
    },
  });

export class SessionManager {
  // セッション取得
  static async getSessionData(request: Request): Promise<SessionData | null> {
    const cookie = request.headers.get("Cookie");
    const session = await getSession(cookie);

    const refreshToken = session.get("refresh_token");
    const userId = session.get("user_id");
    const userEmail = session.get("user_email");
    const expiresAt = session.get("expires_at");

    if (!refreshToken || !userId) {
      return null;
    }

    return {
      access_token: "", // Access Tokenは別途リフレッシュで取得
      refresh_token: refreshToken,
      user_id: userId,
      user_email: userEmail,
      expires_at: expiresAt,
    };
  }

  // セッション作成（設計書に沿ってRefresh Tokenのみ保存）
  static async createSession(authSession: AuthSession): Promise<string> {
    const session = await getSession();

    // 設計書に従い、Refresh TokenのみをCookieに保存
    session.set("refresh_token", authSession.refresh_token);
    session.set("user_id", authSession.user.id);
    session.set("user_email", authSession.user.email);
    session.set("expires_at", authSession.expires_at);

    return await commitSession(session);
  }

  // セッション更新（設計書に沿ってRefresh Tokenのみ更新）
  static async updateSession(
    request: Request,
    authSession: AuthSession
  ): Promise<string> {
    const cookie = request.headers.get("Cookie");
    const session = await getSession(cookie);

    // Refresh Tokenが変更された場合のみ更新
    session.set("refresh_token", authSession.refresh_token);
    session.set("user_id", authSession.user.id);
    session.set("user_email", authSession.user.email);
    session.set("expires_at", authSession.expires_at);

    return await commitSession(session);
  }

  // セッション削除
  static async destroySession(request: Request): Promise<string> {
    const cookie = request.headers.get("Cookie");
    const session = await getSession(cookie);
    return await destroySession(session);
  }
}
