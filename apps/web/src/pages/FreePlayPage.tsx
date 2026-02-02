import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAudio } from '../hooks/useAudio';
import { useSongPatterns, useRecognizeAudioMutation } from '@sargam/api';
import type { AudioRecognitionResult } from '@sargam/api';
import AudioSettingsPanel from '../components/AudioSettingsPanel';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface PlayedNote {
  midiNote: number;
  time: number;
  color: string;
}

interface SongMatch {
  songId: number;
  title: string;
  artist: string;
  confidence: number;
}

const NOTE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
  '#84cc16', '#a855f7'
];

// Pitch detection using autocorrelation
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let foundGoodCorrelation = false;

  // Find RMS (volume level)
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      break;
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01 && bestOffset > 0) {
    return sampleRate / bestOffset;
  }
  return -1;
}

// Convert frequency to MIDI note
function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED MELODY RECOGNITION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
// Combines multiple state-of-the-art algorithms:
// 1. Smith-Waterman Local Alignment (from bioinformatics - handles insertions/deletions)
// 2. N-gram Fingerprinting (like Shazam - robust to partial matches)
// 3. Prefix Matching with Tolerance (for exact hook matching)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Smith-Waterman Local Alignment Algorithm
 * Gold standard for finding the best local alignment between two sequences.
 * Handles insertions, deletions, and substitutions gracefully.
 * Returns normalized score from 0-100.
 */
function smithWaterman(query: number[], target: number[]): number {
  if (query.length === 0 || target.length === 0) return 0;

  const n = query.length;
  const m = target.length;

  // Scoring parameters (tuned for melody matching)
  const MATCH_SCORE = 3;        // Exact match reward
  const CLOSE_MATCH = 2;        // ±1 semitone (minor pitch error)
  const MISMATCH_PENALTY = -2;  // Wrong note penalty
  const GAP_PENALTY = -1;       // Insertion/deletion penalty

  // Initialize scoring matrix
  const H: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

  let maxScore = 0;

  // Fill the matrix
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diff = Math.abs(query[i - 1] - target[j - 1]);

      // Calculate match/mismatch score
      let matchScore: number;
      if (diff === 0) {
        matchScore = MATCH_SCORE;
      } else if (diff === 1) {
        matchScore = CLOSE_MATCH;  // Small pitch error tolerance
      } else {
        matchScore = MISMATCH_PENALTY;
      }

      // Smith-Waterman recurrence (local alignment allows starting fresh with 0)
      H[i][j] = Math.max(
        0,                           // Start fresh (local alignment feature)
        H[i - 1][j - 1] + matchScore, // Diagonal (match/mismatch)
        H[i - 1][j] + GAP_PENALTY,    // Deletion in target
        H[i][j - 1] + GAP_PENALTY     // Insertion in target
      );

      maxScore = Math.max(maxScore, H[i][j]);
    }
  }

  // Normalize: perfect score would be query.length * MATCH_SCORE
  const perfectScore = query.length * MATCH_SCORE;
  return Math.min(100, (maxScore / perfectScore) * 100);
}

/**
 * Create N-grams (subsequences) from interval array
 * N-grams provide robust fingerprinting - even if user plays slightly differently,
 * some n-grams will still match.
 */
function createNgrams(intervals: number[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= intervals.length - n; i++) {
    // Create a string key for the n-gram
    ngrams.add(intervals.slice(i, i + n).join(','));
  }
  return ngrams;
}

/**
 * Create "fuzzy" N-grams that allow ±1 semitone tolerance
 * This catches slightly out-of-tune playing
 */
function createFuzzyNgrams(intervals: number[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= intervals.length - n; i++) {
    const ngram = intervals.slice(i, i + n);
    // Add exact n-gram
    ngrams.add(ngram.join(','));
    // Add variations with ±1 tolerance on each position
    // (This is a simplified version - full would generate all 3^n variations)
    for (let j = 0; j < n; j++) {
      const variant1 = [...ngram];
      const variant2 = [...ngram];
      variant1[j] = ngram[j] + 1;
      variant2[j] = ngram[j] - 1;
      ngrams.add(variant1.join(','));
      ngrams.add(variant2.join(','));
    }
  }
  return ngrams;
}

/**
 * N-gram based matching score
 * Returns percentage of query n-grams found in target
 */
function ngramMatchScore(queryIntervals: number[], targetIntervals: number[], n: number): number {
  if (queryIntervals.length < n || targetIntervals.length < n) return 0;

  const queryNgrams = createNgrams(queryIntervals, n);
  const targetNgrams = createFuzzyNgrams(targetIntervals, n);  // Fuzzy for tolerance

  let matches = 0;
  for (const ngram of queryNgrams) {
    if (targetNgrams.has(ngram)) matches++;
  }

  return queryNgrams.size > 0 ? (matches / queryNgrams.size) * 100 : 0;
}

/**
 * Prefix matching with tolerance
 * Compares from the start, good for when user plays the hook correctly
 */
function prefixMatchScore(queryIntervals: number[], targetIntervals: number[]): number {
  const len = Math.min(queryIntervals.length, targetIntervals.length);
  if (len === 0) return 0;

  let score = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;

  for (let i = 0; i < len; i++) {
    const diff = Math.abs(queryIntervals[i] - targetIntervals[i]);
    if (diff === 0) {
      score += 1.0;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else if (diff === 1) {
      score += 0.7;  // Partial credit for close match
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }

  // Base score from matches
  let baseScore = (score / len) * 100;

  // Bonus for consecutive matches (indicates correct hook)
  if (maxConsecutive >= 4) {
    baseScore += (maxConsecutive - 3) * 3;  // +3% per consecutive match beyond 3
  }

  return Math.min(100, baseScore);
}

/**
 * Main recognition function - combines all strategies
 * Uses the TRUE first notes from the session (not a rolling window)
 */
function recognizeSong(
  sessionNotes: number[],  // First notes from this playing session
  patterns: any[]
): SongMatch[] {
  // Require at least 4 notes (3 intervals) for recognition
  if (sessionNotes.length < 4) return [];

  // Calculate intervals (transposition-invariant representation)
  const playedIntervals: number[] = [];
  for (let i = 1; i < sessionNotes.length; i++) {
    playedIntervals.push(sessionNotes[i] - sessionNotes[i - 1]);
  }

  // Only use first 12 intervals (the hook) - this is the key part
  const MAX_HOOK_LENGTH = 12;
  const hookIntervals = playedIntervals.slice(0, MAX_HOOK_LENGTH);

  const matches: SongMatch[] = [];
  const MIN_CONFIDENCE = 55;  // Slightly lower threshold since we use multiple strategies

  for (const pattern of patterns) {
    let songIntervals = pattern.intervals || [];

    // Calculate intervals from notes if not provided
    if (!songIntervals.length && pattern.notes?.length > 1) {
      songIntervals = [];
      for (let i = 1; i < pattern.notes.length; i++) {
        songIntervals.push(pattern.notes[i] - pattern.notes[i - 1]);
      }
    }

    if (songIntervals.length < 3) continue;

    // ─────────────────────────────────────────────────────────────────────────
    // Strategy 1: Prefix Matching (40% weight)
    // Best for users playing the hook correctly from the start
    // ─────────────────────────────────────────────────────────────────────────
    const prefixScore = prefixMatchScore(hookIntervals, songIntervals);

    // ─────────────────────────────────────────────────────────────────────────
    // Strategy 2: Smith-Waterman Local Alignment (35% weight)
    // Handles insertions, deletions, and finds best matching subsequence
    // ─────────────────────────────────────────────────────────────────────────
    const swScore = smithWaterman(hookIntervals, songIntervals.slice(0, MAX_HOOK_LENGTH + 4));

    // ─────────────────────────────────────────────────────────────────────────
    // Strategy 3: N-gram Fingerprinting (25% weight)
    // Robust to partial matches and slight variations
    // ─────────────────────────────────────────────────────────────────────────
    const trigramScore = ngramMatchScore(hookIntervals, songIntervals, 3);
    const tetragramScore = hookIntervals.length >= 4
      ? ngramMatchScore(hookIntervals, songIntervals, 4)
      : trigramScore;
    const ngramScore = (trigramScore * 0.4 + tetragramScore * 0.6);

    // ─────────────────────────────────────────────────────────────────────────
    // Combined Score with Weighted Average
    // ─────────────────────────────────────────────────────────────────────────
    const combinedScore = (
      prefixScore * 0.40 +   // Prefix match is most important
      swScore * 0.35 +       // Smith-Waterman for robustness
      ngramScore * 0.25      // N-grams for partial matches
    );

    // Bonus: If all strategies agree (all above 70%), add confidence bonus
    const agreementBonus = (prefixScore > 70 && swScore > 70 && ngramScore > 70) ? 5 : 0;

    // Bonus: Perfect prefix match of 5+ intervals
    const perfectPrefixBonus = (prefixScore >= 99 && hookIntervals.length >= 5) ? 5 : 0;

    const confidence = Math.min(99, Math.round(combinedScore + agreementBonus + perfectPrefixBonus));

    if (confidence >= MIN_CONFIDENCE) {
      matches.push({
        songId: pattern.songId,
        title: pattern.title,
        artist: pattern.artist,
        confidence
      });
    }
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  if (matches.length === 0) return [];

  // ─────────────────────────────────────────────────────────────────────────
  // Filter results to show clear winners
  // ─────────────────────────────────────────────────────────────────────────
  const topScore = matches[0].confidence;

  // Only show matches within 12% of top score
  const validMatches = matches.filter(m =>
    m.confidence >= MIN_CONFIDENCE && (topScore - m.confidence) <= 12
  );

  // If top match is very confident (>80%), only show top 2
  if (topScore >= 80) {
    return validMatches.slice(0, 2);
  }

  // Otherwise show top 3
  return validMatches.slice(0, 3);
}

export default function FreePlayPage() {
  const navigate = useNavigate();
  const { playNote, stopNote, stopAll, initAudio, isReady } = useAudio();
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [playedNotes, setPlayedNotes] = useState<PlayedNote[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [recentNotes, setRecentNotes] = useState<number[]>([]);
  const [matches, setMatches] = useState<SongMatch[]>([]);
  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const recognitionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastNoteTimeRef = useRef<number>(0);  // Track last note time for session reset

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioRecognitionResult | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Pitch detection state
  const [isPitchDetecting, setIsPitchDetecting] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [hummedNotes, setHummedNotes] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pitchStreamRef = useRef<MediaStream | null>(null);
  const pitchAnimationRef = useRef<number>();
  const lastHummedNoteRef = useRef<number | null>(null);
  const noteStabilityRef = useRef<number>(0);

  // Fetch song patterns for recognition
  const { data: songPatterns = [] } = useSongPatterns({ enabled: aiEnabled });

  // Audio recognition mutation
  const recognizeAudioMutation = useRecognizeAudioMutation();

  // Piano range: C2 to C7 (5 octaves)
  const startOctave = 2;
  const endOctave = 7;
  const totalOctaves = endOctave - startOctave;

  // Generate all keys
  const keys: { midiNote: number; noteName: string; octave: number; isBlack: boolean }[] = [];
  for (let octave = startOctave; octave < endOctave; octave++) {
    for (let note = 0; note < 12; note++) {
      const midiNote = (octave + 1) * 12 + note;
      const noteName = NOTE_NAMES[note];
      const isBlack = noteName.includes('#');
      keys.push({ midiNote, noteName, octave, isBlack });
    }
  }
  // Add final C
  keys.push({ midiNote: (endOctave + 1) * 12, noteName: 'C', octave: endOctave, isBlack: false });

  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  // Center the piano on middle C on mount
  useEffect(() => {
    if (pianoContainerRef.current) {
      const container = pianoContainerRef.current;
      const middleCPosition = (4 - startOctave) * 7 * 60;
      container.scrollLeft = middleCPosition - container.clientWidth / 2 + 200;
    }
  }, [startOctave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // Animation loop for falling notes
  useEffect(() => {
    const animate = () => {
      setPlayedNotes(prev =>
        prev
          .map(note => ({ ...note, time: note.time + 16 }))
          .filter(note => note.time < 3000)
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Clear notes after inactivity for recognition
  useEffect(() => {
    if (recentNotes.length > 0) {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      recognitionTimeoutRef.current = setTimeout(() => {
        setRecentNotes([]);
        setMatches([]);
      }, 5000); // Clear after 5 seconds of inactivity
    }

    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, [recentNotes]);

  // Run recognition when notes change (using DTW algorithm)
  useEffect(() => {
    if (aiEnabled && recentNotes.length >= 4 && songPatterns.length > 0) {
      // Use DTW-based recognition for better accuracy
      const newMatches = recognizeSong(recentNotes, songPatterns);
      setMatches(newMatches);

      // Debug logging for melody recognition
      if (recentNotes.length >= 4) {
        const playedIntervals: number[] = [];
        for (let i = 1; i < recentNotes.length; i++) {
          playedIntervals.push(recentNotes[i] - recentNotes[i - 1]);
        }
        // Only use first 12 intervals (the hook)
        const hookIntervals = playedIntervals.slice(0, 12);

        // Find specific songs to debug
        const debugSongs = ['Pehle Bhi Main', 'Tum Hi Ho'];
        const debugScores: Record<string, number> = {};
        for (const pattern of songPatterns) {
          if (debugSongs.some(s => pattern.title?.toLowerCase().includes(s.toLowerCase()))) {
            // Calculate what score this song would get
            const songIntervals = pattern.intervals || [];
            const prefixScore = prefixMatchScore(hookIntervals, songIntervals);
            debugScores[pattern.title] = Math.round(prefixScore);
          }
        }

        console.log('🎵 Melody Recognition:', {
          notesPlayed: recentNotes.length,
          hookIntervals: hookIntervals.join(', '),
          matchesFound: newMatches.length,
          topMatch: newMatches[0] ? `${newMatches[0].title} (${newMatches[0].confidence}%)` : 'none',
          debugScores
        });
      }
    }
  }, [recentNotes, aiEnabled, songPatterns]);

  // Start audio recording (for AudD fingerprinting)
  const startRecording = useCallback(async () => {
    setRecordingError(null);
    setAudioResult(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          try {
            const result = await recognizeAudioMutation.mutateAsync(audioBlob);
            setAudioResult(result);
          } catch (err: any) {
            setRecordingError(err?.message || 'Recognition failed');
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setRecordingError('Microphone access denied. Please allow microphone access.');
      } else {
        setRecordingError('Could not access microphone');
      }
    }
  }, [recognizeAudioMutation]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  // Start pitch detection (for humming)
  const startPitchDetection = useCallback(async () => {
    setRecordingError(null);
    setHummedNotes([]);
    lastHummedNoteRef.current = null;
    noteStabilityRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pitchStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsPitchDetecting(true);

      // Start pitch detection loop
      const buffer = new Float32Array(analyser.fftSize);

      const detectPitch = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(buffer);
        const frequency = autoCorrelate(buffer, audioContext.sampleRate);

        if (frequency > 80 && frequency < 1000) { // Human voice range
          const midiNote = frequencyToMidi(frequency);
          const noteIndex = midiNote % 12;
          const octave = Math.floor(midiNote / 12) - 1;
          const noteName = NOTE_NAMES[noteIndex];

          setDetectedNote(`${noteName}${octave}`);

          // Stability check - only add note if it's stable for a few frames
          if (lastHummedNoteRef.current === midiNote) {
            noteStabilityRef.current++;
            if (noteStabilityRef.current >= 5) { // ~100ms of stability
              setHummedNotes(prev => {
                const last = prev[prev.length - 1];
                if (last !== midiNote) {
                  return [...prev.slice(-29), midiNote];
                }
                return prev;
              });
              noteStabilityRef.current = 0;
            }
          } else {
            lastHummedNoteRef.current = midiNote;
            noteStabilityRef.current = 1;
          }
        } else {
          setDetectedNote(null);
          noteStabilityRef.current = 0;
        }

        pitchAnimationRef.current = requestAnimationFrame(detectPitch);
      };

      detectPitch();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setRecordingError('Microphone access denied. Please allow microphone access.');
      } else {
        setRecordingError('Could not access microphone');
      }
    }
  }, []);

  // Stop pitch detection
  const stopPitchDetection = useCallback(() => {
    if (pitchAnimationRef.current) {
      cancelAnimationFrame(pitchAnimationRef.current);
    }
    if (pitchStreamRef.current) {
      pitchStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsPitchDetecting(false);
    setDetectedNote(null);
  }, []);

  // Run melody recognition on hummed notes (with rhythm/timing data)
  useEffect(() => {
    if (aiEnabled && hummedNotes.length >= 6 && songPatterns.length > 0) {
      const newMatches = recognizeSong(hummedNotes, songPatterns);
      if (newMatches.length > 0) {
        setMatches(prev => {
          // Merge with keyboard matches, prefer higher confidence
          const merged = [...prev];
          for (const match of newMatches) {
            const existing = merged.find(m => m.songId === match.songId);
            if (existing) {
              existing.confidence = Math.max(existing.confidence, match.confidence);
            } else {
              merged.push(match);
            }
          }
          return merged.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
        });
      }
    }
  }, [hummedNotes, aiEnabled, songPatterns]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPitchDetection();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [stopPitchDetection]);

  const handleKeyDown = useCallback(async (midiNote: number) => {
    if (!isReady) {
      await initAudio();
    }
    setPressedKeys(prev => new Set(prev).add(midiNote));
    playNote(midiNote, 100);

    // Add to played notes for visualization
    const noteIndex = midiNote % 12;
    setPlayedNotes(prev => [...prev, {
      midiNote,
      time: 0,
      color: NOTE_COLORS[noteIndex]
    }]);

    // Add to recent notes for recognition
    // KEY FIX: Reset if >3 seconds since last note (user starting new song attempt)
    if (aiEnabled) {
      const now = Date.now();
      const timeSinceLastNote = now - lastNoteTimeRef.current;

      if (timeSinceLastNote > 3000) {
        // New session - start fresh
        setRecentNotes([midiNote]);
        setMatches([]);
        console.log('🎵 New session started (3s gap detected)');
      } else {
        // Continue session - PRESERVE the first notes (don't slice from front!)
        // Only keep first 30 notes - after that, we have enough for hook matching
        setRecentNotes(prev => {
          if (prev.length >= 30) {
            // Already have 30 notes - don't add more (preserve the hook)
            return prev;
          }
          return [...prev, midiNote];
        });
      }

      lastNoteTimeRef.current = now;
    }
  }, [playNote, initAudio, isReady, aiEnabled]);

  const handleKeyUp = useCallback((midiNote: number) => {
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
    stopNote(midiNote);
  }, [stopNote]);

  // Keyboard mapping
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65,
      't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71,
      'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76, "'": 77,
    };

    const onKeyDown = async (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi && !e.repeat) {
        if (!isReady) await initAudio();
        handleKeyDown(midi);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi) handleKeyUp(midi);
    };

    // Release all keys when window loses focus
    const onBlur = () => {
      setPressedKeys(new Set());
      stopAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleKeyDown, handleKeyUp, initAudio, isReady, stopAll]);

  // Calculate note position for visualization
  const getNotePosition = (midiNote: number) => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteInOctave = midiNote % 12;
    const isBlack = NOTE_NAMES[noteInOctave].includes('#');

    const whiteKeysBefore = (octave - startOctave) * 7;
    const whiteKeyMap: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
    const blackKeyOffset: Record<number, number> = { 1: 0.7, 3: 1.7, 6: 3.7, 8: 4.7, 10: 5.7 };
    const whiteKeyWidth = 60;

    if (isBlack) {
      const offset = blackKeyOffset[noteInOctave] || 0;
      return (whiteKeysBefore + offset) * whiteKeyWidth;
    } else {
      const whiteIndex = whiteKeyMap[noteInOctave] || 0;
      return (whiteKeysBefore + whiteIndex) * whiteKeyWidth + whiteKeyWidth / 2 - 15;
    }
  };

  const whiteKeyWidth = 60;
  const totalWidth = whiteKeys.length * whiteKeyWidth;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <h1 className="text-white font-bold text-lg">Free Play</h1>

        <div className="flex items-center gap-2">
          {/* AI Toggle */}
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              aiEnabled
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
            <span className="hidden sm:inline">AI</span>
          </button>

          {/* Humming Detection Button */}
          <button
            onClick={isPitchDetecting ? stopPitchDetection : startPitchDetection}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              isPitchDetecting
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Detect melody from humming"
          >
            <GraphicEqRoundedIcon sx={{ fontSize: 16 }} />
            <span className="hidden sm:inline">
              {isPitchDetecting ? (detectedNote || 'Listening...') : 'Hum'}
            </span>
          </button>

          {/* Mic Recording Button (AudD) */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={recognizeAudioMutation.isPending || isPitchDetecting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : recognizeAudioMutation.isPending
                  ? 'bg-white/10 text-white/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Record audio for song fingerprinting"
          >
            {isRecording ? (
              <StopRoundedIcon sx={{ fontSize: 16 }} />
            ) : (
              <MicRoundedIcon sx={{ fontSize: 16 }} />
            )}
            <span className="hidden sm:inline">
              {isRecording ? `${recordingTime}s` : recognizeAudioMutation.isPending ? 'Analyzing...' : 'Record'}
            </span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Humming Detection Panel */}
      {isPitchDetecting && (
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraphicEqRoundedIcon sx={{ fontSize: 18, color: '#10b981' }} />
              <span className="text-white/80 text-sm font-medium">Humming Detection</span>
            </div>
            <div className="flex items-center gap-2">
              {detectedNote && (
                <span className="px-2 py-1 bg-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
                  {detectedNote}
                </span>
              )}
              <span className="text-emerald-400 text-xs">
                {hummedNotes.length} notes
              </span>
            </div>
          </div>
          <p className="text-white/40 text-sm mt-2">
            Hum or sing the melody clearly. Each stable note will be captured.
          </p>
        </div>
      )}

      {/* Audio Recording Results Panel */}
      {(audioResult || recordingError || isRecording || recognizeAudioMutation.isPending) && (
        <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MicRoundedIcon sx={{ fontSize: 18, color: '#f97316' }} />
              <span className="text-white/80 text-sm font-medium">Audio Recognition (AudD)</span>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500/30 rounded-full text-red-400 text-xs font-bold">
                  {recordingTime}s
                </span>
                <span className="text-red-400 text-xs animate-pulse">Recording...</span>
              </div>
            )}
            {recognizeAudioMutation.isPending && (
              <span className="text-orange-400 text-xs">Analyzing...</span>
            )}
          </div>

          {recordingError && (
            <div className="mt-2 p-2 bg-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{recordingError}</p>
            </div>
          )}

          {audioResult?.success && audioResult.recognized && (
            <div className="mt-3">
              {audioResult.localMatch ? (
                <Link
                  to={`/practice/${audioResult.localMatch.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
                    <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{audioResult.recognized.title}</p>
                    <p className="text-white/50 text-sm truncate">{audioResult.recognized.artist}</p>
                    <p className="text-emerald-400 text-xs mt-1">Available in your library!</p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-500">
                    <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{audioResult.recognized.title}</p>
                    <p className="text-white/50 text-sm truncate">{audioResult.recognized.artist}</p>
                    {audioResult.recognized.album && (
                      <p className="text-white/30 text-xs truncate">{audioResult.recognized.album}</p>
                    )}
                    <p className="text-amber-400 text-xs mt-1">Not in library - create a tutorial?</p>
                  </div>
                  <Link
                    to="/create-song"
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full text-white text-xs font-medium hover:opacity-90"
                  >
                    Create
                  </Link>
                </div>
              )}
            </div>
          )}

          {audioResult && !audioResult.success && (
            <p className="text-white/40 text-sm mt-2">
              {audioResult.message || 'No song recognized. Try recording a clearer sample.'}
            </p>
          )}

          {isRecording && (
            <p className="text-white/40 text-sm mt-2">
              Play actual music near your mic (5+ seconds). Works best with recorded songs, not humming.
            </p>
          )}
        </div>
      )}

      {/* AI Recognition Panel (Note-based) */}
      {aiEnabled && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#a855f7' }} />
              <span className="text-white/80 text-sm font-medium">Melody Recognition</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              {recentNotes.length > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 rounded text-purple-400">
                  {recentNotes.length} keyboard
                </span>
              )}
              {hummedNotes.length > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-400">
                  {hummedNotes.length} hummed
                </span>
              )}
            </div>
          </div>

          {matches.length > 0 ? (
            <div className="mt-3 space-y-2">
              {matches.map((match, index) => (
                <Link
                  key={match.songId}
                  to={`/practice/${match.songId}`}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    index === 0
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    index === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-white/10'
                  }`}>
                    <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{match.title}</p>
                    <p className="text-white/50 text-sm truncate">{match.artist}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    match.confidence >= 80
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : match.confidence >= 60
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-white/10 text-white/60'
                  }`}>
                    {match.confidence}%
                  </div>
                </Link>
              ))}
            </div>
          ) : recentNotes.length >= 6 ? (
            <p className="text-white/40 text-sm mt-2">
              No matches found. Keep playing!
            </p>
          ) : (
            <p className="text-white/40 text-sm mt-2">
              Play at least 4 notes to start recognition...
            </p>
          )}
        </div>
      )}

      {/* Visualization Area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={pianoContainerRef}
          className="absolute inset-0 overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <div
            className="relative h-full"
            style={{ width: `${totalWidth}px`, minWidth: '100%' }}
          >
            {/* Falling Notes */}
            {playedNotes.map((note, index) => {
              const x = getNotePosition(note.midiNote);
              const y = note.time / 3000 * 100;
              const isBlack = NOTE_NAMES[note.midiNote % 12].includes('#');

              return (
                <div
                  key={`${note.midiNote}-${index}`}
                  className="absolute rounded-md transition-opacity"
                  style={{
                    left: `${x}px`,
                    bottom: `${y}%`,
                    width: isBlack ? '24px' : '30px',
                    height: '40px',
                    backgroundColor: note.color,
                    opacity: 1 - (note.time / 3000),
                  }}
                />
              );
            })}

            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: totalOctaves }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-white/5"
                  style={{ left: `${i * 7 * whiteKeyWidth}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hints & Create Button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <Link
            to="/create-song"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
          >
            <AddRoundedIcon sx={{ fontSize: 18 }} />
            Create Tutorial from Audio
          </Link>
          <p className="text-white/40 text-sm">
            Use keyboard: A-L keys
          </p>
        </div>
      </div>

      {/* Piano */}
      <div
        className="bg-[#111] border-t border-white/10 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
        onScroll={(e) => {
          if (pianoContainerRef.current) {
            pianoContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        <div
          className="relative select-none touch-none"
          style={{ width: `${totalWidth}px`, height: '200px' }}
        >
          {/* White Keys */}
          <div className="absolute inset-0 flex">
            {whiteKeys.map((key) => {
              const isPressed = pressedKeys.has(key.midiNote);
              const noteColor = NOTE_COLORS[key.midiNote % 12];

              return (
                <button
                  key={key.midiNote}
                  className={`
                    relative rounded-b-lg border border-neutral-300
                    transition-all duration-75
                    ${isPressed ? 'shadow-inner' : 'shadow-md'}
                  `}
                  style={{
                    width: `${whiteKeyWidth}px`,
                    backgroundColor: isPressed ? noteColor : '#fff',
                  }}
                  onMouseDown={() => handleKeyDown(key.midiNote)}
                  onMouseUp={() => handleKeyUp(key.midiNote)}
                  onMouseLeave={() => pressedKeys.has(key.midiNote) && handleKeyUp(key.midiNote)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyDown(key.midiNote);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyUp(key.midiNote);
                  }}
                >
                  <span className={`
                    absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-medium
                    ${isPressed ? 'text-white' : 'text-neutral-400'}
                  `}>
                    {key.noteName}
                    {key.noteName === 'C' && <span className="text-xs">{key.octave}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Black Keys */}
          <div className="absolute inset-0 flex pointer-events-none">
            {whiteKeys.map((whiteKey, index) => {
              const blackKey = blackKeys.find(b => b.midiNote === whiteKey.midiNote + 1);
              if (!blackKey) return <div key={index} style={{ width: `${whiteKeyWidth}px` }} />;

              const isPressed = pressedKeys.has(blackKey.midiNote);
              const noteColor = NOTE_COLORS[blackKey.midiNote % 12];

              return (
                <div
                  key={index}
                  className="relative"
                  style={{ width: `${whiteKeyWidth}px` }}
                >
                  <button
                    className={`
                      absolute top-0 right-0 translate-x-1/2 rounded-b-md
                      pointer-events-auto z-10
                      transition-all duration-75
                      ${isPressed ? 'shadow-inner' : 'shadow-lg'}
                    `}
                    style={{
                      width: '36px',
                      height: '120px',
                      backgroundColor: isPressed ? noteColor : '#1a1a1a',
                    }}
                    onMouseDown={() => handleKeyDown(blackKey.midiNote)}
                    onMouseUp={() => handleKeyUp(blackKey.midiNote)}
                    onMouseLeave={() => pressedKeys.has(blackKey.midiNote) && handleKeyUp(blackKey.midiNote)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleKeyDown(blackKey.midiNote);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleKeyUp(blackKey.midiNote);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio Settings Panel */}
      <AudioSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
