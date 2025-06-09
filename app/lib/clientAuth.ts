import { supabase } from "./supabase.client";

export async function checkAdminRole() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return false;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role || "free";

    if (role !== "admin") {
      window.location.href = "/about?error=access_denied";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Admin role check error:", error);
    window.location.href = "/";
    return false;
  }
}
