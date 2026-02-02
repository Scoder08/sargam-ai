/**
 * Lesson Store
 * 
 * Manages current lesson playback, progress tracking, and practice sessions.
 * This store works identically on web and React Native.
 */

import { create } from 'zustand';
import type { 
  Lesson, 
  LessonSection, 
  LessonProgress,
  Note 
} from '@sargam/types';

interface LessonState {
  // Current lesson
  currentLesson: Lesson | null;
  currentSection: LessonSection | null;
  currentSectionIndex: number;

  // Playback state
  isPlaying: boolean;
  tempo: number;
  currentBeat: number;

  // Practice state
  practiceStartTime: number | null;
  practiceNotes: Note[];
  userInput: Note[];

  // Progress
  progress: Map<string, LessonProgress>;

  // Actions
  setLesson: (lesson: Lesson) => void;
  setSection: (sectionIndex: number) => void;
  nextSection: () => void;
  previousSection: () => void;

  // Playback actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setTempo: (tempo: number) => void;
  setCurrentBeat: (beat: number) => void;

  // Practice actions
  startPractice: () => void;
  endPractice: () => void;
  addUserNote: (note: Note) => void;
  clearUserInput: () => void;

  // Progress actions
  updateProgress: (lessonId: string, progress: Partial<LessonProgress>) => void;
  markSectionComplete: (lessonId: string, sectionId: string) => void;

  // Reset
  reset: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  // Initial state
  currentLesson: null,
  currentSection: null,
  currentSectionIndex: 0,
  isPlaying: false,
  tempo: 80,
  currentBeat: 0,
  practiceStartTime: null,
  practiceNotes: [],
  userInput: [],
  progress: new Map(),

  // Lesson navigation
  setLesson: (lesson) =>
    set({
      currentLesson: lesson,
      currentSection: lesson.sections[0] ?? null,
      currentSectionIndex: 0,
      isPlaying: false,
      currentBeat: 0,
    }),

  setSection: (sectionIndex) => {
    const { currentLesson } = get();
    if (!currentLesson) return;

    const section = currentLesson.sections[sectionIndex];
    if (section) {
      set({
        currentSection: section,
        currentSectionIndex: sectionIndex,
        isPlaying: false,
        currentBeat: 0,
        userInput: [],
      });
    }
  },

  nextSection: () => {
    const { currentLesson, currentSectionIndex } = get();
    if (!currentLesson) return;

    const nextIndex = currentSectionIndex + 1;
    if (nextIndex < currentLesson.sections.length) {
      get().setSection(nextIndex);
    }
  },

  previousSection: () => {
    const { currentSectionIndex } = get();
    if (currentSectionIndex > 0) {
      get().setSection(currentSectionIndex - 1);
    }
  },

  // Playback
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentBeat: 0 }),
  setTempo: (tempo) => set({ tempo: Math.max(40, Math.min(200, tempo)) }),
  setCurrentBeat: (beat) => set({ currentBeat: beat }),

  // Practice
  startPractice: () =>
    set({
      practiceStartTime: Date.now(),
      userInput: [],
    }),

  endPractice: () => {
    const { practiceStartTime, currentLesson } = get();
    if (practiceStartTime && currentLesson) {
      const practiceTime = Math.floor((Date.now() - practiceStartTime) / 1000);
      get().updateProgress(currentLesson.id, {
        practiceTimeSeconds: practiceTime,
      });
    }
    set({ practiceStartTime: null });
  },

  addUserNote: (note) =>
    set((state) => ({
      userInput: [...state.userInput, note],
    })),

  clearUserInput: () => set({ userInput: [] }),

  // Progress
  updateProgress: (lessonId, updates) =>
    set((state) => {
      const newProgress = new Map(state.progress);
      const existing = newProgress.get(lessonId) || {
        lessonId,
        sectionsCompleted: [],
        overallProgress: 0,
        practiceTimeSeconds: 0,
      };
      newProgress.set(lessonId, { ...existing, ...updates });
      return { progress: newProgress };
    }),

  markSectionComplete: (lessonId, sectionId) =>
    set((state) => {
      const { currentLesson } = state;
      const newProgress = new Map(state.progress);
      const existing = newProgress.get(lessonId) || {
        lessonId,
        sectionsCompleted: [],
        overallProgress: 0,
        practiceTimeSeconds: 0,
      };

      if (!existing.sectionsCompleted.includes(sectionId)) {
        const sectionsCompleted = [...existing.sectionsCompleted, sectionId];
        const totalSections = currentLesson?.sections.length || 1;
        const overallProgress = Math.round(
          (sectionsCompleted.length / totalSections) * 100
        );

        newProgress.set(lessonId, {
          ...existing,
          sectionsCompleted,
          overallProgress,
          lastAttemptAt: new Date(),
        });
      }

      return { progress: newProgress };
    }),

  reset: () =>
    set({
      currentLesson: null,
      currentSection: null,
      currentSectionIndex: 0,
      isPlaying: false,
      currentBeat: 0,
      practiceStartTime: null,
      practiceNotes: [],
      userInput: [],
    }),
}));

// Selectors
export const selectCurrentLesson = (state: LessonState) => state.currentLesson;
export const selectCurrentSection = (state: LessonState) => state.currentSection;
export const selectIsPlaying = (state: LessonState) => state.isPlaying;
export const selectTempo = (state: LessonState) => state.tempo;
export const selectProgress = (lessonId: string) => (state: LessonState) =>
  state.progress.get(lessonId);
