import { useCallback, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { cache, CACHE_KEYS } from "~/lib/cache.client";
import { supabase } from "~/lib/supabase.client";
import { useUserStore } from "~/stores/userStore";
import type { UserProfile } from "~/stores/userStore";

interface UserProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: UserProfile | null;
}

export function UserProvider({
  children,
  initialUser,
  initialProfile,
}: UserProviderProps) {
  const {
    setUser,
    setProfile,
    setProfileLoading,
    setAiUsageInfo,
    setLoading,
    user,
    profile,
  } = useUserStore();

  // Create user profile for new users
  const createUserProfile = useCallback(
    async (userId: string) => {
      try {
        // Get user info from auth
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const displayName =
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0] ||
          "ユーザー";

        const newProfile = {
          user_id: userId,
          name: displayName,
          role: "free",
          base_tags: "",
        };

        const { data: createdProfile, error } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createdProfile && !error) {
          setProfile(createdProfile);
          // Cache the new profile
          cache.set(
            CACHE_KEYS.USER_PROFILE(userId),
            createdProfile,
            10 * 60 * 1000
          );
          console.log("Created new profile for user:", userId);
        } else {
          console.error("Error creating profile:", error);
        }
      } catch (error) {
        console.error("Error creating user profile:", error);
      }
    },
    [setProfile]
  );

  // Fetch user profile
  const fetchUserProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);

      try {
        // Check cache first
        const cachedProfile = cache.get<UserProfile>(
          CACHE_KEYS.USER_PROFILE(userId)
        );
        if (cachedProfile) {
          setProfile(cachedProfile);
          setProfileLoading(false);
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileData && !error) {
          setProfile(profileData);
          // Cache the profile
          cache.set(
            CACHE_KEYS.USER_PROFILE(userId),
            profileData,
            10 * 60 * 1000
          );
        } else if (
          error?.code === "PGRST116" ||
          error?.message?.includes("No rows found")
        ) {
          // プロフィールが存在しない場合のみ作成
          console.log(
            "No profile found for user:",
            userId,
            ". Creating new profile..."
          );
          await createUserProfile(userId);
        } else {
          // その他のエラー（RLS等）は一時的に無視
          console.warn("Profile fetch error (ignoring):", error);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setProfileLoading(false);
      }
    },
    [setProfile, setProfileLoading, createUserProfile]
  );

  // Fetch AI usage info
  const fetchAiUsageInfo = useCallback(
    async (userId: string) => {
      try {
        const userRole = profile?.role || "free";
        const isAdmin =
          userRole === "admin" ||
          userId === "6571ae84-507f-42cb-94d3-5b23e444be71";

        if (isAdmin) {
          setAiUsageInfo({
            remainingCount: null,
            monthlyLimit: null,
            isAdmin: true,
          });
          return;
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
        setAiUsageInfo({
          remainingCount: Math.max(0, 5 - currentCount),
          monthlyLimit: 5,
          isAdmin: false,
        });
      } catch (error) {
        console.error("Error fetching AI usage info:", error);
      }
    },
    [profile?.role, setAiUsageInfo]
  );

  // Initialize with server data
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
    if (initialProfile) {
      setProfile(initialProfile);
    }
    setLoading(false);
  }, [initialUser, initialProfile, setUser, setProfile, setLoading]);

  // Handle auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await fetchAiUsageInfo(currentUser.id);
      } else {
        setProfile(null);
        setAiUsageInfo(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    setUser,
    setProfile,
    setAiUsageInfo,
    setLoading,
    fetchUserProfile,
    fetchAiUsageInfo,
  ]);

  // Re-fetch AI usage when profile changes
  useEffect(() => {
    if (user?.id && profile) {
      fetchAiUsageInfo(user.id);
    }
  }, [user?.id, profile, fetchAiUsageInfo]);

  // Listen for AI usage updates
  useEffect(() => {
    const handleAiUsageUpdate = () => {
      if (user?.id) {
        fetchAiUsageInfo(user.id);
      }
    };

    window.addEventListener("aiUsageUpdated", handleAiUsageUpdate);
    return () => {
      window.removeEventListener("aiUsageUpdated", handleAiUsageUpdate);
    };
  }, [user?.id, fetchAiUsageInfo]);

  return <>{children}</>;
}
