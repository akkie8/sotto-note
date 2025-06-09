import { redirect } from "@remix-run/node";

import { getSupabase } from "./supabase.server";

export async function requireAuth(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("authorization");
    console.log("[requireAuth] Request details:", {
      url: request.url,
      method: request.method,
      contentType: request.headers.get("content-type"),
      hasAuthorizationHeader: !!authHeader,
      authHeaderPreview: authHeader?.substring(0, 50) + "...",
      hasCookieHeader: !!cookieHeader,
      cookieCount: cookieHeader?.split(";").length || 0,
      hasSupabaseCookies: cookieHeader?.includes("sb-") || false,
    });

    // Authorizationヘッダーからトークンを抽出
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      console.log("[requireAuth] Using Authorization header token");

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        console.log("[requireAuth] Token auth result:", {
          userId: user?.id,
          email: user?.email,
          error: error?.message,
        });

        if (error) {
          console.error("[requireAuth] Token auth error:", error.message);
          throw redirect("/about", {
            headers: response.headers,
          });
        }

        if (!user) {
          console.log("[requireAuth] No user found with token");
          throw redirect("/about", {
            headers: response.headers,
          });
        }

        console.log("[requireAuth] Token auth successful:", user.id);
        return { user, headers: response.headers, supabase };
      } catch (tokenError) {
        console.error("[requireAuth] Token processing error:", tokenError);
        if (tokenError instanceof Response) {
          throw tokenError;
        }
        // Continue to cookie-based auth if token fails
      }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Also check session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("[requireAuth] Auth results:", {
      user: {
        id: user?.id,
        email: user?.email,
      },
      userError: error?.message,
      session: {
        exists: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        accessToken: session?.access_token ? "present" : "missing",
      },
      sessionError: sessionError?.message,
    });

    if (error) {
      console.error("[requireAuth] Auth error:", error.message);
      throw redirect("/about", {
        headers: response.headers,
      });
    }

    if (!user) {
      console.log("[requireAuth] No user found, redirecting to /about");
      throw redirect("/about", {
        headers: response.headers,
      });
    }

    console.log("[requireAuth] User authenticated:", user.id);
    return { user, headers: response.headers, supabase };
  } catch (authError) {
    console.error("[requireAuth] Exception:", authError);
    if (authError instanceof Response) {
      throw authError; // Re-throw redirect responses
    }
    throw redirect("/about", {
      headers: response.headers,
    });
  }
}

export async function getOptionalUser(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("[getOptionalUser] getUser result:", {
      userId: user?.id,
      error: error?.message,
    });

    return { user, headers: response.headers, supabase };
  } catch (error) {
    console.error("[getOptionalUser] Exception:", error);
    return { user: null, headers: response.headers, supabase };
  }
}
