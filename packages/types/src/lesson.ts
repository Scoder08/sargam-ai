/**
 * Lesson-related types
 */

import type { InstrumentType, SkillLevel } from './user';

export interface Lesson {
  id: string;
  title: string;
  titleHindi?: string;
  description: string;
  descriptionHindi?: string;
  instrument: InstrumentType;
  skillLevel: SkillLevel;
  durationMinutes: number;
  thumbnailUrl: string;
  videoUrl?: string;
  order: number;
  moduleId: string;
  sections: LessonSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonModule {
  id: string;
  title: string;
  titleHindi?: string;
  description: string;
  instrument: InstrumentType;
  skillLevel: SkillLevel;
  order: number;
  lessonsCount: number;
  thumbnailUrl: string;
  lessons: Lesson[];
}

export interface LessonSection {
  id: string;
  title: string;
  type: LessonSectionType;
  order: number;
  content: LessonContent;
  durationSeconds: number;
}

export type LessonSectionType = 
  | 'video'
  | 'practice'
  | 'quiz'
  | 'theory'
  | 'exercise';

export type LessonContent = 
  | VideoContent
  | PracticeContent
  | QuizContent
  | TheoryContent
  | ExerciseContent;

export interface VideoContent {
  type: 'video';
  videoUrl: string;
  subtitlesUrl?: string;
  timestamps?: VideoTimestamp[];
}

export interface VideoTimestamp {
  time: number; // seconds
  label: string;
}

export interface PracticeContent {
  type: 'practice';
  notes: Note[];
  tempo: number;
  timeSignature: [number, number];
  midiData?: string; // base64 encoded MIDI
  backingTrackUrl?: string;
}

export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface TheoryContent {
  type: 'theory';
  markdown: string;
  images?: string[];
  audioExamples?: AudioExample[];
}

export interface AudioExample {
  label: string;
  audioUrl: string;
}

export interface ExerciseContent {
  type: 'exercise';
  instructions: string;
  pattern: Note[];
  repetitions: number;
  tempoRange: [number, number];
}

/**
 * Music notation types
 */
export interface Note {
  pitch: string; // e.g., 'C4', 'F#5'
  duration: NoteDuration;
  startTime: number; // in beats
  velocity?: number; // 0-127
  finger?: number; // 1-5 for piano fingering
}

export type NoteDuration = 
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'dotted-half'
  | 'dotted-quarter'
  | 'dotted-eighth';

export interface LessonProgress {
  lessonId: string;
  sectionsCompleted: string[];
  currentSectionId?: string;
  overallProgress: number; // 0-100
  bestScore?: number;
  lastAttemptAt?: Date;
  practiceTimeSeconds: number;
}
