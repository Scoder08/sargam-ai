/**
 * Gamification Store
 * 
 * Manages XP, gems, hearts, streaks, and rewards
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GamificationState,
  Reward,
  calculateLevel,
  xpForNextLevel
} from '@sargam/types';

interface GamificationStore extends GamificationState {
  // Actions
  addXp: (amount: number) => Reward;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  useHeart: () => boolean;
  regenerateHeart: () => void;
  updateStreak: () => { streakUpdated: boolean; streakBonus: number };
  addPracticeTime: (minutes: number) => { goalComplete: boolean; bonusXp: number };
  useStreakFreeze: () => boolean;
  buyStreakFreeze: () => boolean;
  
  // Computed
  canPractice: () => boolean;
  getTimeUntilHeart: () => number | null;
}

const INITIAL_STATE: GamificationState = {
  xp: 0,
  level: 1,
  xpToNextLevel: 100,
  gems: 50, // Start with some gems
  hearts: 5,
  maxHearts: 5,
  heartsRegenAt: null,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  streakFreezes: 1, // Start with 1 streak freeze
  dailyGoalMinutes: 10,
  todayMinutes: 0,
  dailyGoalComplete: false,
  isPremium: false,
  premiumUntil: null,
};

const HEART_REGEN_MS = 30 * 60 * 1000; // 30 minutes

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addXp: (amount: number) => {
        const state = get();
        const oldLevel = state.level;
        const newXp = state.xp + amount;
        const newLevel = calculateLevel(newXp);
        const leveledUp = newLevel > oldLevel;

        // Level up bonus
        let gemBonus = 0;
        if (leveledUp) {
          gemBonus = 25 * (newLevel - oldLevel);
        }

        set({
          xp: newXp,
          level: newLevel,
          xpToNextLevel: xpForNextLevel(newXp),
          gems: state.gems + gemBonus,
        });

        return {
          xp: amount,
          gems: gemBonus,
          levelUp: leveledUp ? { oldLevel, newLevel } : null,
          achievement: null,
          chestUnlocked: null,
        };
      },

      addGems: (amount: number) => {
        set((state) => ({ gems: state.gems + amount }));
      },

      spendGems: (amount: number) => {
        const state = get();
        if (state.gems >= amount) {
          set({ gems: state.gems - amount });
          return true;
        }
        return false;
      },

      useHeart: () => {
        const state = get();
        
        // Premium users have unlimited hearts
        if (state.isPremium) return true;
        
        if (state.hearts > 0) {
          const now = new Date().toISOString();
          set({ 
            hearts: state.hearts - 1,
            heartsRegenAt: state.heartsRegenAt || now,
          });
          return true;
        }
        return false;
      },

      regenerateHeart: () => {
        const state = get();
        if (state.hearts < state.maxHearts) {
          const newHearts = state.hearts + 1;
          set({ 
            hearts: newHearts,
            heartsRegenAt: newHearts < state.maxHearts 
              ? new Date().toISOString() 
              : null,
          });
        }
      },

      updateStreak: () => {
        const state = get();
        const today = new Date().toDateString();
        const lastPractice = state.lastPracticeDate 
          ? new Date(state.lastPracticeDate).toDateString()
          : null;

        // Already practiced today
        if (lastPractice === today) {
          return { streakUpdated: false, streakBonus: 0 };
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let newStreak = state.currentStreak;
        let streakBonus = 0;

        if (lastPractice === yesterdayStr) {
          // Continued streak
          newStreak = state.currentStreak + 1;
        } else if (lastPractice && lastPractice !== yesterdayStr) {
          // Missed days - streak broken (unless freeze used)
          newStreak = 1;
        } else {
          // First practice ever
          newStreak = 1;
        }

        // Streak milestones
        if (newStreak === 7) streakBonus = 50;
        else if (newStreak === 14) streakBonus = 100;
        else if (newStreak === 30) streakBonus = 200;
        else if (newStreak === 100) streakBonus = 500;

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, state.longestStreak),
          lastPracticeDate: new Date().toISOString(),
          gems: state.gems + streakBonus,
        });

        return { streakUpdated: true, streakBonus };
      },

      addPracticeTime: (minutes: number) => {
        const state = get();
        const newMinutes = state.todayMinutes + minutes;
        const goalComplete = newMinutes >= state.dailyGoalMinutes;
        const wasComplete = state.dailyGoalComplete;
        
        let bonusXp = 0;
        if (goalComplete && !wasComplete) {
          bonusXp = 25;
        }

        set({
          todayMinutes: newMinutes,
          dailyGoalComplete: goalComplete,
          xp: state.xp + bonusXp,
        });

        return { goalComplete: goalComplete && !wasComplete, bonusXp };
      },

      useStreakFreeze: () => {
        const state = get();
        if (state.streakFreezes > 0) {
          set({ streakFreezes: state.streakFreezes - 1 });
          return true;
        }
        return false;
      },

      buyStreakFreeze: () => {
        const state = get();
        const cost = 50;
        if (state.gems >= cost) {
          set({ 
            gems: state.gems - cost,
            streakFreezes: state.streakFreezes + 1,
          });
          return true;
        }
        return false;
      },

      canPractice: () => {
        const state = get();
        return state.isPremium || state.hearts > 0;
      },

      getTimeUntilHeart: () => {
        const state = get();
        if (!state.heartsRegenAt || state.hearts >= state.maxHearts) {
          return null;
        }
        const regenTime = new Date(state.heartsRegenAt).getTime() + HEART_REGEN_MS;
        const now = Date.now();
        return Math.max(0, regenTime - now);
      },
    }),
    {
      name: 'sargam-gamification',
      partialize: (state) => ({
        xp: state.xp,
        level: state.level,
        gems: state.gems,
        hearts: state.hearts,
        heartsRegenAt: state.heartsRegenAt,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastPracticeDate: state.lastPracticeDate,
        streakFreezes: state.streakFreezes,
        dailyGoalMinutes: state.dailyGoalMinutes,
        todayMinutes: state.todayMinutes,
        dailyGoalComplete: state.dailyGoalComplete,
        isPremium: state.isPremium,
        premiumUntil: state.premiumUntil,
      }),
    }
  )
);
