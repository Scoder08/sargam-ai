/**
 * Gamification API
 *
 * XP, gems, streaks, achievements, and rewards.
 */

import { apiClient } from './client';

export interface GamificationStats {
  totalXp: number;
  level: number;
  xpForNextLevel: number;
  gems: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  dailyGoalMinutes: number;
  todayPracticeMinutes: number;
  goalReachedToday: boolean;
  totalLessonsCompleted: number;
  totalSongsLearned: number;
  perfectScores: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  gemReward: number;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastPracticeDate: string | null;
}

export interface DailyGoal {
  goalMinutes: number;
  todayMinutes: number;
  goalReached: boolean;
}

export interface XPResult {
  xpAdded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  oldLevel: number;
}

export const gamificationApi = {
  /**
   * Get all gamification stats
   */
  async getStats(): Promise<GamificationStats> {
    const response = await apiClient.get('gamification/stats');
    return response.json();
  },

  /**
   * Get streak info
   */
  async getStreak(): Promise<StreakInfo> {
    const response = await apiClient.get('gamification/streak');
    return response.json();
  },

  /**
   * Update streak (call after practice)
   */
  async updateStreak(): Promise<StreakInfo & { milestoneReward?: { days: number; gems: number } }> {
    const response = await apiClient.post('gamification/streak/update');
    return response.json();
  },

  /**
   * Get gems balance
   */
  async getGems(): Promise<{ gems: number }> {
    const response = await apiClient.get('gamification/gems');
    return response.json();
  },

  /**
   * Spend gems
   */
  async spendGems(amount: number, itemType: string, itemId?: string): Promise<{ success: boolean; gemsRemaining: number }> {
    const response = await apiClient.post('gamification/gems/spend', {
      json: { amount, itemType, itemId },
    });
    return response.json();
  },

  /**
   * Add XP (call after completing activities)
   */
  async addXP(amount: number): Promise<XPResult> {
    const response = await apiClient.post('gamification/add-xp', {
      json: { amount },
    });
    return response.json();
  },

  /**
   * Get daily goal progress
   */
  async getDailyGoal(): Promise<DailyGoal> {
    const response = await apiClient.get('gamification/daily-goal');
    return response.json();
  },

  /**
   * Update daily goal progress
   */
  async updateDailyGoal(minutes: number): Promise<DailyGoal & { bonusXp: number }> {
    const response = await apiClient.post('gamification/daily-goal/update', {
      json: { minutes },
    });
    return response.json();
  },

  /**
   * Set daily goal
   */
  async setDailyGoal(minutes: number): Promise<{ goalMinutes: number }> {
    const response = await apiClient.post('gamification/daily-goal/set', {
      json: { minutes },
    });
    return response.json();
  },

  /**
   * Get all achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get('gamification/achievements');
    return response.json();
  },

  /**
   * Check for new achievements
   */
  async checkAchievements(): Promise<{ unlocked: string[] }> {
    const response = await apiClient.post('gamification/achievements/check');
    return response.json();
  },
};
