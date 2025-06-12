import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  role: 'free' | 'admin';
  created_at?: string;
  updated_at?: string;
}

interface AIUsageInfo {
  remainingCount: number | null;
  monthlyLimit: number | null;
  isAdmin: boolean;
}

interface UserState {
  // User auth state
  user: User | null;
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
  getUserRole: () => 'free' | 'admin';
  
  // Reset function
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      user: null,
      isLoading: true,
      profile: null,
      profileLoading: false,
      aiUsageInfo: null,

      // Actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
        }),

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

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      // Computed getters
      isAdmin: () => {
        const state = get();
        return state.profile?.role === 'admin' || state.user?.id === '6571ae84-507f-42cb-94d3-5b23e444be71';
      },

      getUserName: () => {
        const state = get();
        return (
          state.profile?.name ||
          state.user?.user_metadata?.name ||
          state.user?.user_metadata?.full_name ||
          'ユーザー'
        );
      },

      getUserRole: () => {
        const state = get();
        if (state.user?.id === '6571ae84-507f-42cb-94d3-5b23e444be71') {
          return 'admin';
        }
        return state.profile?.role || 'free';
      },

      // Reset function
      reset: () =>
        set((state) => {
          state.user = null;
          state.profile = null;
          state.aiUsageInfo = null;
          state.isLoading = false;
          state.profileLoading = false;
        }),
    }))
  )
);

// Selectors for easier component usage
export const selectUser = (state: UserState) => state.user;
export const selectProfile = (state: UserState) => state.profile;
export const selectIsAdmin = (state: UserState) => state.isAdmin();
export const selectUserName = (state: UserState) => state.getUserName();
export const selectUserRole = (state: UserState) => state.getUserRole();
export const selectAiUsageInfo = (state: UserState) => state.aiUsageInfo;
export const selectIsLoading = (state: UserState) => state.isLoading;