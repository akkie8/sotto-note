import { redirect } from "@remix-run/node";
import { getSupabase } from "./supabase.server";

export async function requireAuth(request: Request) {
  const response = new Response();
  const supabase = getSupabase(request, response);
  
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("[requireAuth] getUser result:", { 
      userId: user?.id, 
      error: error?.message,
      hasAuthHeader: request.headers.get('authorization') ? 'yes' : 'no',
      cookies: request.headers.get('cookie')?.includes('sb-') ? 'has supabase cookies' : 'no supabase cookies'
    });

    if (error) {
      console.error("[requireAuth] Auth error:", error.message);
      // Instead of immediately redirecting, try to continue without auth for now
      console.log("[requireAuth] Continuing despite auth error for debugging");
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
      error: error?.message 
    });

    return { user, headers: response.headers, supabase };
  } catch (error) {
    console.error("[getOptionalUser] Exception:", error);
    return { user: null, headers: response.headers, supabase };
  }
}