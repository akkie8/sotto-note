import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * ユーザーのプロフィールが存在することを保証し、存在しない場合は作成する
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User
) {
  try {
    // プロフィールの存在確認
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingProfile && !fetchError) {
      return existingProfile;
    }

    // プロフィールが存在しない場合は作成
    console.log("Creating profile for user:", user.id);
    
    const displayName = 
      user.user_metadata?.full_name || 
      user.email?.split("@")[0] || 
      "ユーザー";

    const newProfile = {
      user_id: user.id,
      name: displayName,
      role: "free",
      base_tags: "",
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (createError) {
      console.error("Error creating profile:", createError);
      throw createError;
    }

    console.log("Created profile for user:", user.id);
    return createdProfile;
  } catch (error) {
    console.error("Error ensuring user profile:", error);
    throw error;
  }
}