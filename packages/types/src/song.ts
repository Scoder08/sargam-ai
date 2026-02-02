/**
 * Song-related types for Bollywood tutorials
 */

import type { InstrumentType, SkillLevel } from './user';
import type { Note } from './lesson';

export interface Song {
  id: number;
  title: string;
  titleHindi?: string;
  artist: string;
  movie?: string;
  year?: number;
  genre: SongGenre | SongGenre[];
  thumbnailUrl?: string;
  previewUrl?: string;
  duration: number;
  tempo: number;
  key: MusicalKey | string;
  difficulty: SkillLevel | string;
  instruments: InstrumentType[] | string[];
  isPopular: boolean;
  isFree: boolean;
  hasTutorial: boolean;
  playCount: number;
  createdAt?: Date;
  createdByUserId?: number | null;
}

export type SongGenre = 
  | 'bollywood'
  | 'classical'
  | 'devotional'
  | 'folk'
  | 'ghazal'
  | 'indie'
  | 'pop'
  | 'romantic'
  | 'retro'
  | 'sufi';

export type MusicalKey = 
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'
  | 'Cm' | 'C#m' | 'Dm' | 'D#m' | 'Em' | 'Fm' | 'F#m' | 'Gm' | 'G#m' | 'Am' | 'A#m' | 'Bm';

export interface SongTutorial {
  id: string;
  songId: string;
  song: Song;
  instrument: InstrumentType;
  version: TutorialVersion;
  sections: TutorialSection[];
  fullMelody: Note[];
  chords: ChordProgression[];
  tips: string[];
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TutorialVersion = 'simplified' | 'standard' | 'advanced';

export interface TutorialSection {
  id: string;
  name: string; // e.g., 'Intro', 'Verse 1', 'Chorus'
  startTime: number; // seconds in original song
  endTime: number;
  melody: Note[];
  chords: ChordProgression[];
  practiceNotes?: string;
}

export interface ChordProgression {
  chord: Chord;
  startTime: number; // in beats
  duration: number; // in beats
}

export interface Chord {
  root: string; // e.g., 'C', 'F#'
  type: ChordType;
  bass?: string; // for slash chords like C/E
  notes: string[]; // actual notes in the chord
}

export type ChordType = 
  | 'major'
  | 'minor'
  | 'dim'
  | 'aug'
  | '7'
  | 'maj7'
  | 'min7'
  | 'sus2'
  | 'sus4'
  | 'add9';

/**
 * Song library & filtering
 */
export interface SongFilter {
  search?: string;
  genres?: SongGenre[];
  difficulty?: SkillLevel[];
  instruments?: InstrumentType[];
  yearRange?: [number, number];
  sortBy?: SongSortOption;
  sortOrder?: 'asc' | 'desc';
}

export type SongSortOption = 
  | 'title'
  | 'artist'
  | 'year'
  | 'difficulty'
  | 'playCount'
  | 'createdAt';

export interface SongProgress {
  songId: string;
  userId: string;
  tutorialId: string;
  sectionsCompleted: string[];
  overallProgress: number; // 0-100
  bestAccuracy?: number;
  practiceTimeSeconds: number;
  lastPracticedAt?: Date;
}

/**
 * AI Song Analysis (for future song-to-tutorial feature)
 */
export interface SongAnalysis {
  songId: string;
  key: MusicalKey;
  tempo: number;
  timeSignature: [number, number];
  melody: Note[];
  chords: ChordProgression[];
  sections: AnalyzedSection[];
  confidence: number; // 0-1
  analyzedAt: Date;
}

export interface AnalyzedSection {
  name: string;
  startTime: number;
  endTime: number;
  energy: number; // 0-1
  complexity: number; // 0-1
}
