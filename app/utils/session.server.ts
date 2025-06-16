import { createCookieSessionStorage } from "@remix-run/node";

// セッション設定
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in environment variables");
}

// セッションストレージの作成
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: "/",
      sameSite: "lax",
      secrets: [sessionSecret],
      secure: process.env.NODE_ENV === "production",
    },
  });

export { getSession, commitSession, destroySession };

// セッションデータの型定義
export interface SessionData {
  access_token: string;
  refresh_token: string;
  user_id: string;
  user_email: string;
}

// セッション取得ヘルパー
export async function getSessionData(
  request: Request
): Promise<SessionData | null> {
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);

  const accessToken = session.get("access_token");
  const refreshToken = session.get("refresh_token");
  const userId = session.get("user_id");
  const userEmail = session.get("user_email");

  if (!accessToken || !refreshToken || !userId) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: userId,
    user_email: userEmail,
  };
}

// セッション更新ヘルパー
export async function updateSessionData(
  request: Request,
  data: Partial<SessionData>
): Promise<string> {
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);

  if (data.access_token) session.set("access_token", data.access_token);
  if (data.refresh_token) session.set("refresh_token", data.refresh_token);
  if (data.user_id) session.set("user_id", data.user_id);
  if (data.user_email) session.set("user_email", data.user_email);

  return await commitSession(session);
}

// セッションクリアヘルパー
export async function clearSession(request: Request): Promise<string> {
  const cookie = request.headers.get("Cookie");
  const session = await getSession(cookie);
  return await destroySession(session);
}