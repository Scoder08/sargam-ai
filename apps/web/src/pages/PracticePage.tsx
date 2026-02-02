import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RewardModal from '../components/RewardModal';
import AudioSettingsPanel from '../components/AudioSettingsPanel';
import {
  useSong,
  useSongTutorial,
  useAddXPMutation,
  useUpdateStreakMutation,
  useUpdateDailyGoalMutation,
  useGamificationStats,
} from '@sargam/api';
import { useAudio, midiToNoteName } from '../hooks/useAudio';

type FeedbackType = 'correct' | 'wrong' | 'early' | 'late' | null;
type PracticeMode = 'intro' | 'demo' | 'practice' | 'complete';

interface NoteData {
  midiNote: number;
  startTime: number;
  duration: number;
  label: string;
}

// Note colors by semitone (C=0, C#=1, etc.)
const NOTE_COLORS = [
  '#ef4444', // C - red
  '#f97316', // C# - orange
  '#eab308', // D - yellow
  '#22c55e', // D# - green
  '#14b8a6', // E - teal
  '#3b82f6', // F - blue
  '#8b5cf6', // F# - violet
  '#ec4899', // G - pink
  '#f43f5e', // G# - rose
  '#06b6d4', // A - cyan
  '#84cc16', // A# - lime
  '#a855f7', // B - purple
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteColor(midiNote: number): string {
  return NOTE_COLORS[midiNote % 12];
}

// Get white key index for a MIDI note (for positioning)
function getWhiteKeyIndex(midiNote: number, startMidi: number): number {
  let whiteKeyCount = 0;
  for (let m = startMidi; m < midiNote; m++) {
    const note = m % 12;
    if (![1, 3, 6, 8, 10].includes(note)) { // Not a black key
      whiteKeyCount++;
    }
  }
  return whiteKeyCount;
}

function isBlackKey(midiNote: number): boolean {
  const note = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

export default function PracticePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const songId = sessionId || '1';

  // Fetch song and tutorial from backend
  const { data: song, isLoading: songLoading, error: songError } = useSong(songId);
  const { data: tutorial, isLoading: tutorialLoading, error: tutorialError } = useSongTutorial(songId);
  const { data: gamificationStats } = useGamificationStats();

  // Audio
  const { playNote, stopNote, stopAll, initAudio, isReady } = useAudio();

  // Mutations for saving progress
  const addXPMutation = useAddXPMutation();
  const updateStreakMutation = useUpdateStreakMutation();
  const updateDailyGoalMutation = useUpdateDailyGoalMutation();

  // State
  const [mode, setMode] = useState<PracticeMode>('intro');
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [demoNoteIndex, setDemoNoteIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedGems, setEarnedGems] = useState(0);
  const [progressSaved, setProgressSaved] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [demoHighlightedNote, setDemoHighlightedNote] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoNoteStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDemoMidiRef = useRef<number | null>(null);
  const pianoRef = useRef<HTMLDivElement>(null);
  const fallingNotesRef = useRef<HTMLDivElement>(null);

  // Piano range: C3 to C6 (3 octaves centered on middle C)
  const START_MIDI = 48; // C3
  const END_MIDI = 84;   // C6
  const WHITE_KEY_WIDTH = 44;

  // Transform backend notes to the format we need
  const allNotes: NoteData[] = useMemo(() => {
    const notes = tutorial?.notes || [];
    return notes.map((note: { midiNote: number; startTime: number; duration?: number }, index: number) => {
      // Use provided duration or calculate from next note, default 400ms
      const duration = note.duration ||
        (notes[index + 1] ? notes[index + 1].startTime - note.startTime : 400);
      return {
        midiNote: note.midiNote,
        startTime: note.startTime,
        duration: Math.min(duration, 800), // Cap duration at 800ms for demo
        label: midiToNoteName(note.midiNote),
      };
    });
  }, [tutorial?.notes]);

  const currentSectionName = tutorial?.sections?.[0]?.name || 'Practice';
  const currentNote = allNotes[currentNoteIndex];
  const currentDemoNote = allNotes[demoNoteIndex];
  const totalNotes = allNotes.length;
  const isPlaying = mode === 'practice';
  const isDemo = mode === 'demo';
  const progress = totalNotes > 0 ? Math.round(((isDemo ? demoNoteIndex : currentNoteIndex) / totalNotes) * 100) : 0;
  const accuracy = score.correct + score.wrong > 0
    ? Math.round((score.correct / (score.correct + score.wrong)) * 100)
    : 100;

  // Generate piano keys (C3 to C6)
  const pianoKeys = useMemo(() => {
    const keys: { midiNote: number; noteName: string; octave: number; isBlack: boolean }[] = [];
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      const octave = Math.floor(midi / 12) - 1;
      const noteIndex = midi % 12;
      keys.push({
        midiNote: midi,
        noteName: NOTE_NAMES[noteIndex],
        octave,
        isBlack: isBlackKey(midi),
      });
    }
    return keys;
  }, []);

  const whiteKeys = useMemo(() => pianoKeys.filter(k => !k.isBlack), [pianoKeys]);
  const blackKeys = useMemo(() => pianoKeys.filter(k => k.isBlack), [pianoKeys]);

  // Calculate position for a note on the piano
  const getNotePosition = useCallback((midiNote: number): number => {
    const whiteKeyIndex = getWhiteKeyIndex(midiNote, START_MIDI);
    const isBlack = isBlackKey(midiNote);

    if (isBlack) {
      // Black key - position between white keys
      return (whiteKeyIndex * WHITE_KEY_WIDTH) + (WHITE_KEY_WIDTH / 2);
    } else {
      // White key - center of the key
      return (whiteKeyIndex * WHITE_KEY_WIDTH) + (WHITE_KEY_WIDTH / 2);
    }
  }, []);

  // Center piano on middle C on mount
  useEffect(() => {
    if (pianoRef.current) {
      const middleCIndex = getWhiteKeyIndex(60, START_MIDI); // C4
      const containerWidth = pianoRef.current.clientWidth;
      const scrollTo = (middleCIndex * WHITE_KEY_WIDTH) - (containerWidth / 2) + (WHITE_KEY_WIDTH / 2);
      pianoRef.current.scrollTo({ left: Math.max(0, scrollTo), behavior: 'auto' });
    }
  }, []);

  // Demo playback - play notes automatically
  const playDemoNote = useCallback(async (noteIndex: number) => {
    if (noteIndex >= allNotes.length) {
      // Demo complete - stop all audio and clear state
      stopAll();
      currentDemoMidiRef.current = null;
      setPressedKeys(new Set());
      setDemoHighlightedNote(null);
      setDemoNoteIndex(0);
      setMode('intro');
      return;
    }

    const note = allNotes[noteIndex];

    // Initialize audio if needed
    if (!isReady) {
      await initAudio();
    }

    // Stop the previous note before playing new one
    // Always stop if there's a current note (even if same note - prevents stuck notes)
    if (currentDemoMidiRef.current !== null) {
      stopNote(currentDemoMidiRef.current);
      currentDemoMidiRef.current = null;
    }

    // Clear any pending note stop timeout
    if (demoNoteStopTimeoutRef.current) {
      clearTimeout(demoNoteStopTimeoutRef.current);
      demoNoteStopTimeoutRef.current = null;
    }

    // Play the note
    playNote(note.midiNote, 80);
    currentDemoMidiRef.current = note.midiNote;
    setDemoHighlightedNote(note.midiNote);
    setDemoNoteIndex(noteIndex);

    // Stop note after duration
    const noteDuration = Math.max(note.duration * 0.8, 150);
    demoNoteStopTimeoutRef.current = setTimeout(() => {
      stopNote(note.midiNote);
      currentDemoMidiRef.current = null;
      setDemoHighlightedNote(null);
    }, noteDuration);

    // Schedule next note
    const timeToNext = note.duration;
    demoTimeoutRef.current = setTimeout(() => {
      playDemoNote(noteIndex + 1);
    }, timeToNext);
  }, [allNotes, isReady, initAudio, playNote, stopNote, stopAll]);

  const startDemo = useCallback(async () => {
    if (totalNotes === 0) return;

    // Initialize audio first
    if (!isReady) {
      await initAudio();
    }

    // Clear any previous state
    stopAll();
    setPressedKeys(new Set());
    setDemoHighlightedNote(null);

    setMode('demo');
    setDemoNoteIndex(0);

    // Start playing notes
    playDemoNote(0);
  }, [totalNotes, isReady, initAudio, playDemoNote, stopAll]);

  const stopDemo = useCallback(() => {
    // Clear the next note timeout
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    // Clear the note stop timeout
    if (demoNoteStopTimeoutRef.current) {
      clearTimeout(demoNoteStopTimeoutRef.current);
      demoNoteStopTimeoutRef.current = null;
    }
    // Clear the current demo note ref
    currentDemoMidiRef.current = null;
    // Stop all currently playing sounds
    stopAll();
    // Clear visual state - important!
    setPressedKeys(new Set());
    setDemoHighlightedNote(null);
    setDemoNoteIndex(0);
    setMode('intro');
  }, [stopAll]);

  // Start practice
  const startPractice = useCallback(async () => {
    if (totalNotes === 0) return;

    // Initialize audio first
    if (!isReady) {
      await initAudio();
    }

    // Clear any previous state
    stopAll();
    setPressedKeys(new Set());
    setDemoHighlightedNote(null);

    setMode('practice');
    setCurrentNoteIndex(0);
    setElapsedTime(0);
    setScore({ correct: 0, wrong: 0 });
    setCombo(0);
    setMaxCombo(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 50);
  }, [totalNotes, isReady, initAudio, stopAll]);

  // Stop practice
  const stopPractice = useCallback(() => {
    setMode('intro');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Clear visual state
    setPressedKeys(new Set());
    stopAll();
  }, [stopAll]);

  // Handle note played
  const handleNotePlay = useCallback(async (midiNote: number) => {
    // Initialize audio if needed
    if (!isReady) {
      await initAudio();
    }

    // Play sound
    playNote(midiNote, 100);

    // Add to pressed keys
    setPressedKeys(prev => new Set(prev).add(midiNote));

    if (!isPlaying || !currentNote) return;

    const timeDiff = elapsedTime - currentNote.startTime;
    const isCorrectNote = midiNote === currentNote.midiNote;
    const isOnTime = Math.abs(timeDiff) < 300;

    let newFeedback: FeedbackType = null;

    if (isCorrectNote && isOnTime) {
      newFeedback = 'correct';
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
      setCombo(prev => {
        const newCombo = prev + 1;
        setMaxCombo(max => Math.max(max, newCombo));
        return newCombo;
      });
    } else if (isCorrectNote && timeDiff < -300) {
      newFeedback = 'early';
      setCombo(0);
    } else if (isCorrectNote && timeDiff > 300) {
      newFeedback = 'late';
      setCombo(0);
    } else {
      newFeedback = 'wrong';
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
      setCombo(0);
    }

    setFeedback(newFeedback);
    setTimeout(() => setFeedback(null), 200);

    // Move to next note
    if (isCorrectNote || newFeedback === 'wrong') {
      if (currentNoteIndex < totalNotes - 1) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        // Complete!
        stopPractice();

        const finalCorrect = score.correct + (newFeedback === 'correct' ? 1 : 0);
        const finalTotal = score.correct + score.wrong + 1;
        const finalAccuracy = Math.round((finalCorrect / finalTotal) * 100);

        const xpEarned = 50 + Math.floor(finalAccuracy / 2);
        const gemsEarned = finalAccuracy >= 90 ? 10 : finalAccuracy >= 70 ? 5 : 0;

        setEarnedXP(xpEarned);
        setEarnedGems(gemsEarned);

        if (!progressSaved) {
          setProgressSaved(true);
          const practiceMinutes = Math.max(1, Math.ceil(totalNotes / 10));
          addXPMutation.mutate(xpEarned);
          updateStreakMutation.mutate();
          updateDailyGoalMutation.mutate(practiceMinutes);
        }

        setShowReward(true);
      }
    }
  }, [isPlaying, currentNote, elapsedTime, currentNoteIndex, totalNotes, stopPractice, score, progressSaved, addXPMutation, updateStreakMutation, updateDailyGoalMutation, isReady, initAudio, playNote]);

  const handleNoteRelease = useCallback((midiNote: number) => {
    stopNote(midiNote);
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
  }, [stopNote]);

  // Keyboard support (maps to C4-C5 range)
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66,
      'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73,
      'l': 74, 'p': 75, ';': 76,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi && !e.repeat) {
        handleNotePlay(midi);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi) {
        handleNoteRelease(midi);
      }
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
  }, [handleNotePlay, handleNoteRelease, stopAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
      if (demoNoteStopTimeoutRef.current) clearTimeout(demoNoteStopTimeoutRef.current);
      // Stop all audio when leaving the page
      stopAll();
    };
  }, [stopAll]);

  // Get upcoming notes for falling visualization
  const upcomingNotes = useMemo(() => {
    if (isDemo) {
      return allNotes.slice(demoNoteIndex, demoNoteIndex + 6);
    }
    if (!isPlaying) return [];
    return allNotes.slice(currentNoteIndex, currentNoteIndex + 6);
  }, [allNotes, currentNoteIndex, demoNoteIndex, isPlaying, isDemo]);

  // Sync falling notes container scroll with piano scroll
  const handlePianoScroll = useCallback(() => {
    if (pianoRef.current && fallingNotesRef.current) {
      fallingNotesRef.current.scrollLeft = pianoRef.current.scrollLeft;
    }
  }, []);

  // Loading state
  if (songLoading || tutorialLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading song...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (songError || tutorialError || !song) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎵</span>
          <h1 className="text-2xl font-bold text-white mb-2">Song Not Found</h1>
          <p className="text-white/50 mb-6">This song might not be available yet.</p>
          <button
            onClick={() => navigate('/songs')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold"
          >
            Browse Songs
          </button>
        </div>
      </div>
    );
  }

  // No tutorial available
  if (!tutorial || totalNotes === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎹</span>
          <h1 className="text-2xl font-bold text-white mb-2">{song.title}</h1>
          <p className="text-white/50 mb-6">Tutorial not available yet. Coming soon!</p>
          <button
            onClick={() => navigate('/songs')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold"
          >
            Browse Songs
          </button>
        </div>
      </div>
    );
  }

  const pianoWidth = whiteKeys.length * WHITE_KEY_WIDTH;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] z-20">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="text-center flex-1 mx-4">
          <h1 className="text-white font-bold truncate">{song.title}</h1>
          <p className="text-white/50 text-xs">{song.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">{progress}%</span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Sound Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Score Display */}
      <div className="flex justify-center gap-6 py-3 bg-[#111]">
        <div className="text-center">
          <p className="text-2xl font-black text-emerald-400">{score.correct}</p>
          <p className="text-[10px] text-white/40 uppercase">Correct</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">{accuracy}%</p>
          <p className="text-[10px] text-white/40 uppercase">Accuracy</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-orange-400">
            {combo > 0 ? `${combo}x` : '-'}
          </p>
          <p className="text-[10px] text-white/40 uppercase">Combo</p>
        </div>
      </div>

      {/* Falling Notes Area */}
      <div className="flex-1 relative bg-gradient-to-b from-[#111] to-[#0a0a0a] overflow-hidden">
        {(isPlaying || isDemo) && (currentNote || currentDemoNote) ? (
          <>
            {/* Demo mode indicator */}
            {isDemo && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="px-4 py-2 rounded-full bg-purple-500/90 text-white font-medium flex items-center gap-2">
                  <span className="animate-pulse">🎧</span>
                  <span>Listening to Demo...</span>
                </div>
              </div>
            )}

            {/* Falling notes - synced with piano scroll */}
            <div
              ref={fallingNotesRef}
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ overflowX: 'hidden' }}
            >
              <div style={{ width: pianoWidth, height: '100%', position: 'relative' }}>
                {/* Guide lines for each white key */}
                {whiteKeys.map((key, i) => (
                  <div
                    key={key.midiNote}
                    className="absolute top-0 bottom-0 w-px bg-white/5"
                    style={{ left: (i + 1) * WHITE_KEY_WIDTH }}
                  />
                ))}

                {/* Falling notes */}
                {upcomingNotes.map((note, index) => {
                  const xPos = getNotePosition(note.midiNote);
                  const isCurrentNote = index === 0;
                  const noteColor = getNoteColor(note.midiNote);
                  const activeIndex = isDemo ? demoNoteIndex : currentNoteIndex;

                  return (
                    <div
                      key={`${note.midiNote}-${index}-${activeIndex}`}
                      className={`absolute flex items-center justify-center transition-all duration-150 ${isCurrentNote ? 'z-10' : ''}`}
                      style={{
                        left: xPos - 24,
                        bottom: isCurrentNote ? 20 : 80 + (index - 1) * 70,
                        opacity: isCurrentNote ? 1 : 0.7 - (index * 0.1),
                        transform: `scale(${isCurrentNote ? 1.1 : 0.9 - (index * 0.05)})`,
                      }}
                    >
                      <div
                        className={`
                          w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg
                          ${isCurrentNote && !isDemo ? 'animate-bounce' : ''}
                          ${isCurrentNote && isDemo ? 'animate-pulse' : ''}
                        `}
                        style={{
                          backgroundColor: feedback === 'correct' && isCurrentNote ? '#22c55e' :
                                         feedback === 'wrong' && isCurrentNote ? '#ef4444' :
                                         isDemo && isCurrentNote ? '#a855f7' :
                                         noteColor,
                          boxShadow: isCurrentNote ? `0 0 30px ${isDemo ? '#a855f790' : noteColor + '90'}, 0 4px 20px rgba(0,0,0,0.5)` : '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <span className="text-sm">{note.label}</span>
                      </div>

                      {/* Connector line to key */}
                      {isCurrentNote && (
                        <div
                          className="absolute top-full w-0.5 bg-gradient-to-b from-white/40 to-transparent"
                          style={{ height: 20, left: '50%', transform: 'translateX(-50%)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feedback overlay (practice mode only) */}
            {feedback && !isDemo && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className={`
                  px-6 py-2 rounded-full font-bold text-lg
                  ${feedback === 'correct' ? 'bg-emerald-500 text-white' : ''}
                  ${feedback === 'wrong' ? 'bg-red-500 text-white' : ''}
                  ${feedback === 'early' ? 'bg-yellow-500 text-black' : ''}
                  ${feedback === 'late' ? 'bg-orange-500 text-white' : ''}
                `}>
                  {feedback === 'correct' && (combo >= 5 ? `🔥 ${combo}x Combo!` : 'Perfect!')}
                  {feedback === 'wrong' && 'Wrong!'}
                  {feedback === 'early' && 'Too Early!'}
                  {feedback === 'late' && 'Too Late!'}
                </div>
              </div>
            )}

            {/* Note counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/40 text-sm">
              {isDemo ? (
                <>Note {demoNoteIndex + 1} of {totalNotes}</>
              ) : (
                <>Note {currentNoteIndex + 1} of {totalNotes}</>
              )}
            </div>
          </>
        ) : mode === 'intro' && !showReward ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                boxShadow: '0 0 60px rgba(249, 115, 22, 0.4)',
              }}
            >
              <span className="text-5xl">🎵</span>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">{currentSectionName}</h2>
            <p className="text-white/50 mb-1">{totalNotes} notes to play</p>
            <p className="text-white/30 text-sm">Listen to the demo first, or start practicing!</p>
          </div>
        ) : null}
      </div>

      {/* Piano */}
      <div className="bg-[#0a0a0a] border-t border-white/10">
        <div
          ref={pianoRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={handlePianoScroll}
        >
          <div
            className="relative select-none touch-none"
            style={{ width: pianoWidth, height: '150px' }}
          >
            {/* White Keys */}
            <div className="absolute inset-0 flex">
              {whiteKeys.map((key) => {
                const isPressed = pressedKeys.has(key.midiNote);
                const isDemoPlaying = isDemo && demoHighlightedNote === key.midiNote;
                const isExpected = isPlaying && currentNote?.midiNote === key.midiNote;
                const noteColor = getNoteColor(key.midiNote);

                return (
                  <button
                    key={key.midiNote}
                    className={`
                      relative h-full rounded-b-lg border-x border-b border-white/20
                      transition-all duration-75 flex flex-col items-center justify-end pb-2
                      ${isPressed || isDemoPlaying ? 'translate-y-1' : ''}
                    `}
                    style={{
                      width: WHITE_KEY_WIDTH,
                      flexShrink: 0,
                      background: isDemoPlaying
                        ? `linear-gradient(to bottom, #a855f760, #a855f7)`
                        : isExpected
                        ? `linear-gradient(to bottom, ${noteColor}60, ${noteColor})`
                        : isPressed
                        ? `linear-gradient(to bottom, #444, #333)`
                        : 'linear-gradient(to bottom, #fafafa, #e5e5e5)',
                      boxShadow: isDemoPlaying
                        ? `0 0 30px #a855f790, inset 0 -4px 0 rgba(0,0,0,0.1)`
                        : isExpected
                        ? `0 0 25px ${noteColor}80, inset 0 -4px 0 rgba(0,0,0,0.1)`
                        : isPressed
                        ? 'inset 0 2px 8px rgba(0,0,0,0.3)'
                        : 'inset 0 -4px 0 rgba(0,0,0,0.1)',
                    }}
                    onMouseDown={() => handleNotePlay(key.midiNote)}
                    onMouseUp={() => handleNoteRelease(key.midiNote)}
                    onMouseLeave={() => pressedKeys.has(key.midiNote) && handleNoteRelease(key.midiNote)}
                    onTouchStart={(e) => { e.preventDefault(); handleNotePlay(key.midiNote); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleNoteRelease(key.midiNote); }}
                  >
                    <span className={`
                      text-[10px] font-medium
                      ${isDemoPlaying ? 'text-white font-bold' : isExpected ? 'text-white font-bold' : isPressed ? 'text-white/60' : 'text-neutral-400'}
                    `}>
                      {key.noteName}
                      {key.noteName === 'C' && <span className="text-[8px]">{key.octave}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Black Keys */}
            <div className="absolute inset-0 flex pointer-events-none">
              {whiteKeys.map((whiteKey, index) => {
                const blackKey = blackKeys.find(b => b.midiNote === whiteKey.midiNote + 1);
                if (!blackKey) return <div key={index} style={{ width: WHITE_KEY_WIDTH, flexShrink: 0 }} />;

                const isPressed = pressedKeys.has(blackKey.midiNote);
                const isDemoPlaying = isDemo && demoHighlightedNote === blackKey.midiNote;
                const isExpected = isPlaying && currentNote?.midiNote === blackKey.midiNote;
                const noteColor = getNoteColor(blackKey.midiNote);

                return (
                  <div key={index} className="relative" style={{ width: WHITE_KEY_WIDTH, flexShrink: 0 }}>
                    <button
                      className={`
                        absolute top-0 right-0 translate-x-1/2 rounded-b-md
                        pointer-events-auto z-10 transition-all duration-75
                      `}
                      style={{
                        width: 28,
                        height: isPressed || isDemoPlaying ? '58%' : '60%',
                        background: isDemoPlaying
                          ? `linear-gradient(to bottom, #a855f7, #a855f7dd)`
                          : isExpected
                          ? `linear-gradient(to bottom, ${noteColor}, ${noteColor}dd)`
                          : isPressed
                          ? '#555'
                          : 'linear-gradient(to bottom, #333, #111)',
                        boxShadow: isDemoPlaying
                          ? `0 0 25px #a855f790`
                          : isExpected
                          ? `0 0 20px ${noteColor}90`
                          : isPressed
                          ? 'inset 0 2px 4px rgba(0,0,0,0.5)'
                          : '0 4px 8px rgba(0,0,0,0.5)',
                      }}
                      onMouseDown={() => handleNotePlay(blackKey.midiNote)}
                      onMouseUp={() => handleNoteRelease(blackKey.midiNote)}
                      onMouseLeave={() => pressedKeys.has(blackKey.midiNote) && handleNoteRelease(blackKey.midiNote)}
                      onTouchStart={(e) => { e.preventDefault(); handleNotePlay(blackKey.midiNote); }}
                      onTouchEnd={(e) => { e.preventDefault(); handleNoteRelease(blackKey.midiNote); }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      {mode === 'intro' && !showReward && (
        <div className="p-4 pb-8 bg-[#0a0a0a]">
          <div className="flex gap-3">
            {/* Listen Demo Button */}
            <button
              onClick={startDemo}
              className="flex-1 py-4 px-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all active:scale-[0.98] flex flex-col items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <span className="text-sm font-semibold">Listen First</span>
            </button>

            {/* Start Practice Button */}
            <button
              onClick={startPractice}
              className="flex-[2] py-4 px-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white hover:opacity-90 transition-all active:scale-[0.98] flex flex-col items-center gap-1 shadow-lg shadow-orange-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold">Start Practice</span>
            </button>
          </div>
        </div>
      )}

      {isDemo && (
        <div className="p-4 pb-8 bg-[#0a0a0a]">
          <button
            onClick={stopDemo}
            className="w-full py-3.5 bg-white/5 border border-white/10 rounded-xl text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span>Skip Demo</span>
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="p-4 pb-8 bg-[#0a0a0a]">
          <button
            onClick={stopPractice}
            className="w-full py-3.5 bg-white/5 border border-white/10 rounded-xl text-white/70 font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span>Stop Practice</span>
          </button>
        </div>
      )}

      {/* Reward Modal */}
      {showReward && (
        <RewardModal
          score={accuracy}
          xp={earnedXP}
          gems={earnedGems}
          combo={maxCombo}
          streakDay={gamificationStats?.currentStreak || 0}
          onClose={() => navigate('/songs')}
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Audio Settings Panel */}
      <AudioSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
