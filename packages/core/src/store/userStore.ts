/**
 * User Store
 * 
 * Manages user authentication state and profile.
 * This store works identically on web and React Native.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserProfile, UserPreferences } from '@sargam/types';

interface UserState {
  // State
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const defaultPreferences: UserPreferences = {
  dailyGoalMinutes: 15,
  notificationsEnabled: true,
  practiceReminders: true,
  showHints: true,
  autoPlayNextLesson: false,
  metronomeEnabled: true,
  defaultTempo: 80,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, _get) => ({
      // Initial state
      user: null,
      profile: null,
      preferences: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setProfile: (profile) =>
        set({ profile }),

      setPreferences: (preferences) =>
        set({ preferences }),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: state.preferences
            ? { ...state.preferences, ...updates }
            : { ...defaultPreferences, ...updates },
        })),

      logout: () =>
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) =>
        set({ isLoading }),
    }),
    {
      name: 'sargam-user-storage',
      // Storage adapter is injected at runtime (localStorage for web, AsyncStorage for RN)
      storage: createJSONStorage(() => {
        // This will be overridden by platform-specific storage
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage;
        }
        // Fallback for SSR or non-browser environments
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

// Selectors (for performance optimization)
export const selectUser = (state: UserState) => state.user;
export const selectProfile = (state: UserState) => state.profile;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectPreferences = (state: UserState) => state.preferences;
