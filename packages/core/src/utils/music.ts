/**
 * Music Utilities
 * 
 * Helper functions for music-related calculations.
 * Platform-agnostic - works on web and React Native.
 */

import type { Note, NoteDuration, ChordType } from '@sargam/types';

/**
 * Convert note duration to beats (assuming quarter note = 1 beat)
 */
export function durationToBeats(duration: NoteDuration): number {
  const durationMap: Record<NoteDuration, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'dotted-half': 3,
    'dotted-quarter': 1.5,
    'dotted-eighth': 0.75,
  };
  return durationMap[duration];
}

/**
 * Convert beats to milliseconds at given tempo
 */
export function beatsToMs(beats: number, tempo: number): number {
  const msPerBeat = 60000 / tempo;
  return beats * msPerBeat;
}

/**
 * Convert milliseconds to beats at given tempo
 */
export function msToBeats(ms: number, tempo: number): number {
  const msPerBeat = 60000 / tempo;
  return ms / msPerBeat;
}

/**
 * Parse pitch string (e.g., 'C4', 'F#5') to MIDI note number
 */
export function pitchToMidi(pitch: string): number {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const match = pitch.match(/^([A-G]#?)(\d+)$/);
  
  if (!match) {
    throw new Error(`Invalid pitch: ${pitch}`);
  }

  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = noteNames.indexOf(noteName);
  
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  // MIDI note 60 = C4
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Convert MIDI note number to pitch string
 */
export function midiToPitch(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Get frequency in Hz from MIDI note number
 */
export function midiToFrequency(midi: number): number {
  // A4 (MIDI 69) = 440 Hz
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Get MIDI note number from frequency
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

/**
 * Get the notes in a chord
 */
export function getChordNotes(root: string, type: ChordType, octave: number = 4): string[] {
  const rootMidi = pitchToMidi(`${root}${octave}`);
  
  // Intervals from root (in semitones)
  const intervals: Record<ChordType, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    '7': [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    add9: [0, 4, 7, 14],
  };

  const chordIntervals = intervals[type];
  return chordIntervals.map((interval) => midiToPitch(rootMidi + interval));
}

/**
 * Calculate accuracy between expected notes and user-played notes
 * Returns a score from 0 to 100
 */
export function calculateNoteAccuracy(
  expected: Note[],
  played: Note[],
  toleranceBeats: number = 0.25
): number {
  if (expected.length === 0) return 100;
  if (played.length === 0) return 0;

  let correctCount = 0;

  for (const expectedNote of expected) {
    const matchedNote = played.find((playedNote) => {
      const pitchMatch = playedNote.pitch === expectedNote.pitch;
      const timingMatch =
        Math.abs(playedNote.startTime - expectedNote.startTime) <= toleranceBeats;
      return pitchMatch && timingMatch;
    });

    if (matchedNote) {
      correctCount++;
    }
  }

  return Math.round((correctCount / expected.length) * 100);
}

/**
 * Calculate rhythm accuracy (ignoring pitch)
 */
export function calculateRhythmAccuracy(
  expected: Note[],
  played: Note[],
  toleranceBeats: number = 0.15
): number {
  if (expected.length === 0) return 100;
  if (played.length === 0) return 0;

  let correctCount = 0;

  for (let i = 0; i < Math.min(expected.length, played.length); i++) {
    const timingDiff = Math.abs(played[i].startTime - expected[i].startTime);
    if (timingDiff <= toleranceBeats) {
      correctCount++;
    }
  }

  return Math.round((correctCount / expected.length) * 100);
}

/**
 * Get practice feedback message based on score
 */
export function getPracticeFeedback(score: number): {
  message: string;
  emoji: string;
  level: 'excellent' | 'good' | 'okay' | 'needs-work';
} {
  if (score >= 90) {
    return { message: 'Excellent!', emoji: '🎉', level: 'excellent' };
  } else if (score >= 70) {
    return { message: 'Good job!', emoji: '👍', level: 'good' };
  } else if (score >= 50) {
    return { message: 'Getting there!', emoji: '💪', level: 'okay' };
  } else {
    return { message: 'Keep practicing!', emoji: '🎯', level: 'needs-work' };
  }
}

/**
 * Format practice time for display
 */
export function formatPracticeTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Get key signature display name
 */
export function getKeyDisplayName(key: string): string {
  const isMinor = key.endsWith('m');
  const root = isMinor ? key.slice(0, -1) : key;
  const displayRoot = root.replace('#', '♯').replace('b', '♭');
  return isMinor ? `${displayRoot} minor` : `${displayRoot} major`;
}
