/**
 * React Query Hooks for Gamification
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  gamificationApi,
  type GamificationStats,
  type Achievement,
  type StreakInfo,
  type DailyGoal,
} from '../gamification';
import { authKeys } from './useAuth';

// Query keys factory
export const gamificationKeys = {
  all: ['gamification'] as const,
  stats: () => [...gamificationKeys.all, 'stats'] as const,
  streak: () => [...gamificationKeys.all, 'streak'] as const,
  gems: () => [...gamificationKeys.all, 'gems'] as const,
  dailyGoal: () => [...gamificationKeys.all, 'dailyGoal'] as const,
  achievements: () => [...gamificationKeys.all, 'achievements'] as const,
};

/**
 * Get all gamification stats
 */
export function useGamificationStats(
  options?: Omit<UseQueryOptions<GamificationStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: gamificationKeys.stats(),
    queryFn: gamificationApi.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Get streak info
 */
export function useStreak(
  options?: Omit<UseQueryOptions<StreakInfo>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: gamificationKeys.streak(),
    queryFn: gamificationApi.getStreak,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Get gems balance
 */
export function useGems(
  options?: Omit<UseQueryOptions<{ gems: number }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: gamificationKeys.gems(),
    queryFn: gamificationApi.getGems,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Get daily goal progress
 */
export function useDailyGoal(
  options?: Omit<UseQueryOptions<DailyGoal>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: gamificationKeys.dailyGoal(),
    queryFn: gamificationApi.getDailyGoal,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Get achievements
 */
export function useAchievements(
  options?: Omit<UseQueryOptions<Achievement[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: gamificationKeys.achievements(),
    queryFn: gamificationApi.getAchievements,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Update streak after practice
 */
export function useUpdateStreakMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gamificationApi.updateStreak,
    onSuccess: (data) => {
      queryClient.setQueryData(gamificationKeys.streak(), {
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        streakFreezes: data.streakFreezes || 0,
        lastPracticeDate: new Date().toISOString().split('T')[0],
      });
      // Invalidate stats to refresh
      queryClient.invalidateQueries({ queryKey: gamificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

/**
 * Add XP
 */
export function useAddXPMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gamificationApi.addXP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

/**
 * Update daily goal progress
 */
export function useUpdateDailyGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gamificationApi.updateDailyGoal,
    onSuccess: (data) => {
      queryClient.setQueryData(gamificationKeys.dailyGoal(), {
        goalMinutes: data.goalMinutes,
        todayMinutes: data.todayMinutes,
        goalReached: data.goalReached,
      });
    },
  });
}

/**
 * Spend gems
 */
export function useSpendGemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ amount, itemType, itemId }: { amount: number; itemType: string; itemId?: string }) =>
      gamificationApi.spendGems(amount, itemType, itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(gamificationKeys.gems(), { gems: data.gemsRemaining });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.stats() });
    },
  });
}

/**
 * Check achievements
 */
export function useCheckAchievementsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gamificationApi.checkAchievements,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.achievements() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.stats() });
    },
  });
}
