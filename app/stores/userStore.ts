import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// User metadata型定義
interface UserMetadata {
  name?: string;
  full_name?: string;
  [key: string]: unknown;
}

// Userを拡張して型安全性を向上
interface ExtendedUser extends Omit<User, "user_metadata"> {
  user_metadata?: UserMetadata;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  role: "free" | "admin";
  created_at?: string;
  updated_at?: string;
}

interface AIUsageInfo {
  remainingCount: number | null;
  monthlyLimit: number | null;
  isAdmin: boolean;
}

// 環境変数からの管理者ID
const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID || "";

interface UserState {
  // User auth state
  user: ExtendedUser | null;
  isLoading: boolean;

  // Profile state
  profile: UserProfile | null;
  profileLoading: boolean;

  // AI usage state
  aiUsageInfo: AIUsageInfo | null;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setAiUsageInfo: (info: AIUsageInfo | null) => void;
  setLoading: (loading: boolean) => void;

  // Computed getters
  isAdmin: () => boolean;
  getUserName: () => string;
  getUserRole: () => "free" | "admin";

  // Reset function
  reset: () => void;
}

// バリデーション関数
const validateProfile = (profile: unknown): profile is UserProfile => {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.user_id === "string" &&
    typeof p.name === "string" &&
    (p.role === "free" || p.role === "admin")
  );
};

const validateAIUsageInfo = (info: unknown): info is AIUsageInfo => {
  if (!info || typeof info !== "object") return false;
  const i = info as Record<string, unknown>;
  return (
    (typeof i.remainingCount === "number" || i.remainingCount === null) &&
    (typeof i.monthlyLimit === "number" || i.monthlyLimit === null) &&
    typeof i.isAdmin === "boolean"
  );
};

export const useUserStore = create<UserState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      user: null,
      isLoading: true,
      profile: null,
      profileLoading: false,
      aiUsageInfo: null,

      // Actions with validation
      setUser: (user) =>
        set((state) => {
          try {
            state.user = user as ExtendedUser;
          } catch (error) {
            console.error("Error setting user:", error);
          }
        }),

      setProfile: (profile) =>
        set((state) => {
          try {
            if (profile && !validateProfile(profile)) {
              console.error("Invalid profile data:", profile);
              return;
            }
            state.profile = profile;
          } catch (error) {
            console.error("Error setting profile:", error);
          }
        }),

      setProfileLoading: (loading) =>
        set((state) => {
          try {
            state.profileLoading = loading;
          } catch (error) {
            console.error("Error setting profile loading:", error);
          }
        }),

      setAiUsageInfo: (info) =>
        set((state) => {
          try {
            if (info && !validateAIUsageInfo(info)) {
              console.error("Invalid AI usage info:", info);
              return;
            }
            state.aiUsageInfo = info;
          } catch (error) {
            console.error("Error setting AI usage info:", error);
          }
        }),

      setLoading: (loading) =>
        set((state) => {
          try {
            state.isLoading = loading;
          } catch (error) {
            console.error("Error setting loading:", error);
          }
        }),

      // Computed getters
      isAdmin: () => {
        const state = get();
        return (
          state.profile?.role === "admin" ||
          (ADMIN_USER_ID && state.user?.id === ADMIN_USER_ID)
        );
      },

      getUserName: () => {
        const state = get();
        return (
          state.profile?.name ||
          state.user?.user_metadata?.name ||
          state.user?.user_metadata?.full_name ||
          "ユーザー"
        );
      },

      getUserRole: () => {
        const state = get();
        if (ADMIN_USER_ID && state.user?.id === ADMIN_USER_ID) {
          return "admin";
        }
        return state.profile?.role || "free";
      },

      // Reset function
      reset: () =>
        set((state) => {
          try {
            state.user = null;
            state.profile = null;
            state.aiUsageInfo = null;
            state.isLoading = false;
            state.profileLoading = false;
          } catch (error) {
            console.error("Error resetting store:", error);
          }
        }),
    }))
  )
);

// メモ化されたSelectors
export const selectUser = (state: UserState) => state.user;
export const selectProfile = (state: UserState) => state.profile;
export const selectAiUsageInfo = (state: UserState) => state.aiUsageInfo;
export const selectIsLoading = (state: UserState) => state.isLoading;

// Computed selectorsはストア内のgetterを呼び出す
export const selectIsAdmin = (state: UserState) => state.isAdmin();
export const selectUserName = (state: UserState) => state.getUserName();
export const selectUserRole = (state: UserState) => state.getUserRole();
