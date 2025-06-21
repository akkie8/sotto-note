import { json, type ActionFunctionArgs } from "@remix-run/node";

import { auth } from "~/lib/auth";

// トークンリフレッシュ専用エンドポイント
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const result = await auth.validateAndRefreshSession(request);

    if (!result.user) {
      return json(
        { error: "Authentication failed" },
        {
          status: 401,
          headers: result.headers || {},
        }
      );
    }

    return json(
      {
        user: result.user,
        refreshed: true,
      },
      {
        headers: result.headers || {},
      }
    );
  } catch (error) {
    console.error("[Auth Refresh] Error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

// このエンドポイントはAPIとしてのみ使用
export function loader() {
  return json({ error: "GET method not supported" }, { status: 405 });
}
