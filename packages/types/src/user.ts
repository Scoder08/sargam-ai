/**
 * User-related types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  preferredInstrument: InstrumentType;
  skillLevel: SkillLevel;
  preferredLanguage: Language;
  timezone: string;
  streakDays: number;
  totalPracticeMinutes: number;
  lessonsCompleted: number;
  songsLearned: number;
}

export interface UserPreferences {
  dailyGoalMinutes: number;
  notificationsEnabled: boolean;
  practiceReminders: boolean;
  preferredPracticeTime?: string; // HH:mm format
  showHints: boolean;
  autoPlayNextLesson: boolean;
  metronomeEnabled: boolean;
  defaultTempo: number;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export type InstrumentType = 'piano' | 'guitar' | 'harmonium' | 'keyboard';

export interface UserProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  score?: number;
  practiceTime: number; // in seconds
  attempts: number;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: Date;
  weeklyPractice: number[]; // minutes per day, last 7 days
}
