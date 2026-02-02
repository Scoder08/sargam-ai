/**
 * Gamification Types
 * 
 * XP, Gems, Hearts, Streaks, Achievements
 */

// User gamification state
export interface GamificationState {
  // XP & Levels
  xp: number;
  level: number;
  xpToNextLevel: number;
  
  // Currency
  gems: number;
  
  // Hearts (lives)
  hearts: number;
  maxHearts: number;
  heartsRegenAt: string | null; // ISO timestamp
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  streakFreezes: number;
  
  // Daily
  dailyGoalMinutes: number;
  todayMinutes: number;
  dailyGoalComplete: boolean;
  
  // Premium
  isPremium: boolean;
  premiumUntil: string | null;
}

// Achievement definition
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'beginner' | 'streak' | 'songs' | 'skill' | 'social' | 'special';
  gemReward: number;
  xpReward: number;
  isHidden: boolean;
}

// User's unlocked achievement
export interface UserAchievement extends Achievement {
  unlockedAt: string;
  isNew: boolean; // Show notification
}

// Reward from action
export interface Reward {
  xp: number;
  gems: number;
  streakBonus?: number;
  achievement?: Achievement | null;
  levelUp?: { oldLevel: number; newLevel: number } | null;
  chestUnlocked?: ChestType | null;
}

// Chest types
export type ChestType = 'daily' | 'weekly' | 'streak' | 'achievement';

export interface Chest {
  type: ChestType;
  contents: {
    gems: number;
    xp: number;
    streakFreeze?: number;
  };
  isOpened: boolean;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
  isCurrentUser: boolean;
}

export interface League {
  id: string;
  name: string;
  icon: string;
  minLevel: number;
  color: string;
}

// Daily challenge
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { xp: number; gems: number };
  expiresAt: string;
  isComplete: boolean;
}

// Level thresholds
export const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4600,   // Level 10
  5900,   // Level 11
  7500,   // Level 12
  9400,   // Level 13
  11600,  // Level 14
  14200,  // Level 15
  17200,  // Level 16
  20700,  // Level 17
  24700,  // Level 18
  29300,  // Level 19
  34500,  // Level 20
];

// Calculate level from XP
export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Calculate XP needed for next level
export function xpForNextLevel(currentXp: number): number {
  const level = calculateLevel(currentXp);
  if (level >= LEVEL_THRESHOLDS.length) return 0;
  return LEVEL_THRESHOLDS[level] - currentXp;
}

// Calculate progress to next level (0-100)
export function levelProgress(currentXp: number): number {
  const level = calculateLevel(currentXp);
  if (level >= LEVEL_THRESHOLDS.length) return 100;
  
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp = LEVEL_THRESHOLDS[level];
  const xpInLevel = currentXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  
  return Math.round((xpInLevel / xpNeeded) * 100);
}

// Leagues
export const LEAGUES: League[] = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', minLevel: 1, color: '#CD7F32' },
  { id: 'silver', name: 'Silver', icon: '🥈', minLevel: 10, color: '#C0C0C0' },
  { id: 'gold', name: 'Gold', icon: '🥇', minLevel: 25, color: '#FFD700' },
  { id: 'platinum', name: 'Platinum', icon: '💎', minLevel: 50, color: '#E5E4E2' },
  { id: 'diamond', name: 'Diamond', icon: '👑', minLevel: 100, color: '#B9F2FF' },
];

export function getLeague(level: number): League {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (level >= LEAGUES[i].minLevel) {
      return LEAGUES[i];
    }
  }
  return LEAGUES[0];
}
