/**
 * usePracticeSession Hook
 * 
 * Manages a practice session with timing, scoring, and feedback.
 * Works identically on web and React Native.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Note } from '@sargam/types';
import { useLessonStore } from '../store/lessonStore';
import { 
  calculateNoteAccuracy, 
  calculateRhythmAccuracy, 
  getPracticeFeedback 
} from '../utils/music';

interface PracticeSessionState {
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number; // in seconds
  notesPlayed: Note[];
  currentScore: number;
  rhythmScore: number;
  pitchScore: number;
  feedback: {
    message: string;
    emoji: string;
    level: 'excellent' | 'good' | 'okay' | 'needs-work';
  } | null;
}

interface PracticeSessionActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  addNote: (note: Note) => void;
  evaluate: (expectedNotes: Note[]) => void;
}

export function usePracticeSession(): [PracticeSessionState, PracticeSessionActions] {
  const { startPractice, endPractice, addUserNote, clearUserInput, userInput } = 
    useLessonStore();

  const [state, setState] = useState<PracticeSessionState>({
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    notesPlayed: [],
    currentScore: 0,
    rhythmScore: 0,
    pitchScore: 0,
    feedback: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    startPractice();
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;

    setState((prev) => ({
      ...prev,
      isActive: true,
      isPaused: false,
      elapsedTime: 0,
      notesPlayed: [],
      currentScore: 0,
      rhythmScore: 0,
      pitchScore: 0,
      feedback: null,
    }));

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
      );
      setState((prev) => ({ ...prev, elapsedTime: elapsed }));
    }, 1000);
  }, [startPractice]);

  const pause = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    pausedTimeRef.current = Date.now() - pausedTimeRef.current;
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
      );
      setState((prev) => ({ ...prev, elapsedTime: elapsed }));
    }, 1000);

    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endPractice();
    setState((prev) => ({ ...prev, isActive: false, isPaused: false }));
  }, [endPractice]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearUserInput();
    setState({
      isActive: false,
      isPaused: false,
      elapsedTime: 0,
      notesPlayed: [],
      currentScore: 0,
      rhythmScore: 0,
      pitchScore: 0,
      feedback: null,
    });
  }, [clearUserInput]);

  const addNote = useCallback((note: Note) => {
    addUserNote(note);
    setState((prev) => ({
      ...prev,
      notesPlayed: [...prev.notesPlayed, note],
    }));
  }, [addUserNote]);

  const evaluate = useCallback((expectedNotes: Note[]) => {
    const pitchScore = calculateNoteAccuracy(expectedNotes, state.notesPlayed);
    const rhythmScore = calculateRhythmAccuracy(expectedNotes, state.notesPlayed);
    const currentScore = Math.round((pitchScore + rhythmScore) / 2);
    const feedback = getPracticeFeedback(currentScore);

    setState((prev) => ({
      ...prev,
      currentScore,
      pitchScore,
      rhythmScore,
      feedback,
    }));
  }, [state.notesPlayed]);

  return [
    state,
    { start, pause, resume, stop, reset, addNote, evaluate },
  ];
}
