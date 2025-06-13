import type { User } from "@supabase/supabase-js";

import { getSupabase } from "./supabase.server";

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  role: "free" | "admin";
  created_at?: string;
  updated_at?: string;
}

export async function getUserProfile(
  request: Request,
  user: User
): Promise<{
  profile: UserProfile | null;
  userName: string;
  userRole: "free" | "admin";
  isAdmin: boolean;
}> {
  const response = new Response();
  const supabase = getSupabase(request, response);

  // Default values from user metadata
  const defaultUserName =
    user.user_metadata?.name || user.user_metadata?.full_name || "ユーザー";

  // Special admin user check
  const isAdminUserId = user.id === "6571ae84-507f-42cb-94d3-5b23e444be71";

  if (isAdminUserId) {
    return {
      profile: null,
      userName: defaultUserName,
      userRole: "admin",
      isAdmin: true,
    };
  }

  try {
    // Set auth session
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile && !error) {
      return {
        profile,
        userName: profile.name || defaultUserName,
        userRole: profile.role || "free",
        isAdmin: profile.role === "admin",
      };
    }

    return {
      profile: null,
      userName: defaultUserName,
      userRole: "free",
      isAdmin: false,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return {
      profile: null,
      userName: defaultUserName,
      userRole: "free",
      isAdmin: false,
    };
  }
}

export async function getAiUsageInfo(
  request: Request,
  userId: string,
  userRole: "free" | "admin"
) {
  if (userRole === "admin") {
    return {
      remainingCount: null,
      monthlyLimit: null,
      isAdmin: true,
    };
  }

  try {
    const response = new Response();
    const supabase = getSupabase(request, response);

    // Set auth session
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("ai_replies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());

    const currentCount = count || 0;
    return {
      remainingCount: Math.max(0, 5 - currentCount),
      monthlyLimit: 5,
      isAdmin: false,
    };
  } catch (error) {
    console.error("Error fetching AI usage info:", error);
    return {
      remainingCount: 0,
      monthlyLimit: 5,
      isAdmin: false,
    };
  }
}
