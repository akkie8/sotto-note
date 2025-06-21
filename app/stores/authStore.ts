import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

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

export interface AuthState {
  // Auth state
  user: User | null;
  session: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Profile state
  profile: UserProfile | null;
  profileLoading: boolean;

  // AI usage state
  aiUsageInfo: AIUsageInfo | null;

  // Auth actions
  setUser: (user: User | null) => void;
  setSession: (session: AuthState["session"]) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  updateTokens: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => void;

  // Profile actions
  setProfile: (profile: UserProfile | null) => void;
  setProfileLoading: (loading: boolean) => void;
  setAiUsageInfo: (info: AIUsageInfo | null) => void;

  // Computed getters
  isAdmin: () => boolean;
  getUserName: () => string;
  getUserRole: () => "free" | "admin";
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer((set, get) => ({
          // Initial state
          user: null,
          session: null,
          isLoading: true,
          isAuthenticated: false,
          profile: null,
          profileLoading: false,
          aiUsageInfo: null,

          // Auth actions
          setUser: (user) =>
            set((state) => {
              state.user = user;
              state.isAuthenticated = !!user;
            }),

          setSession: (session) =>
            set((state) => {
              state.session = session;
              state.isAuthenticated = !!session?.accessToken;
            }),

          setLoading: (isLoading) =>
            set((state) => {
              state.isLoading = isLoading;
            }),

          clearAuth: () =>
            set((state) => {
              state.user = null;
              state.session = null;
              state.profile = null;
              state.aiUsageInfo = null;
              state.isAuthenticated = false;
              state.isLoading = false;
              state.profileLoading = false;
            }),

          updateTokens: (accessToken, refreshToken, expiresAt) =>
            set((state) => {
              state.session = {
                ...state.session,
                accessToken,
                refreshToken,
                expiresAt,
              };
              state.isAuthenticated = true;
            }),

          // Profile actions
          setProfile: (profile) =>
            set((state) => {
              state.profile = profile;
            }),

          setProfileLoading: (loading) =>
            set((state) => {
              state.profileLoading = loading;
            }),

          setAiUsageInfo: (info) =>
            set((state) => {
              state.aiUsageInfo = info;
            }),

          // Computed getters
          isAdmin: () => {
            const state = get();
            return (
              state.profile?.role === "admin" ||
              state.user?.id === "6571ae84-507f-42cb-94d3-5b23e444be71"
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
            if (state.user?.id === "6571ae84-507f-42cb-94d3-5b23e444be71") {
              return "admin";
            }
            return state.profile?.role || "free";
          },
        })),
        {
          name: "auth-storage",
          partialize: (state) => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
            profile: state.profile,
          }),
        }
      ),
      {
        name: "auth-store",
      }
    )
  )
);

// Selectors for easier component usage
export const selectUser = (state: AuthState) => state.user;
export const selectProfile = (state: AuthState) => state.profile;
export const selectIsAdmin = (state: AuthState) => state.isAdmin();
export const selectUserName = (state: AuthState) => state.getUserName();
export const selectUserRole = (state: AuthState) => state.getUserRole();
export const selectAiUsageInfo = (state: AuthState) => state.aiUsageInfo;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated;
