import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudio } from '../../hooks/useAudio';

interface PianoProps {
  startOctave?: number;
  octaves?: number;
  activeNotes?: number[];
  expectedNote?: number | null;
  onNotePlay?: (midiNote: number) => void;
  onNoteRelease?: (midiNote: number) => void;
  showLabels?: boolean;
  highlightMode?: 'none' | 'expected' | 'feedback';
  feedbackType?: 'correct' | 'wrong' | 'early' | 'late' | null;
  enableSound?: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function Piano({
  startOctave = 4,
  octaves = 2,
  activeNotes = [],
  expectedNote = null,
  onNotePlay,
  onNoteRelease,
  showLabels = true,
  highlightMode = 'none',
  feedbackType = null,
  enableSound = true,
}: PianoProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const pianoRef = useRef<HTMLDivElement>(null);
  const { playNote, stopNote, initAudio, isReady } = useAudio();

  // Initialize audio on first interaction
  useEffect(() => {
    if (enableSound && !isReady) {
      // Will initialize on first key press
    }
  }, [enableSound, isReady]);

  // Generate keys for the piano
  const keys = [];
  for (let octave = startOctave; octave < startOctave + octaves; octave++) {
    for (let note = 0; note < 12; note++) {
      const midiNote = (octave + 1) * 12 + note;
      const noteName = NOTE_NAMES[note];
      const isBlack = noteName.includes('#');
      keys.push({ midiNote, noteName, octave, isBlack });
    }
  }

  // Add the final C
  const finalMidi = (startOctave + octaves + 1) * 12;
  keys.push({ midiNote: finalMidi, noteName: 'C', octave: startOctave + octaves, isBlack: false });

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const handleKeyDown = useCallback(async (midiNote: number) => {
    // Initialize audio if not ready (on first interaction)
    if (enableSound && !isReady) {
      await initAudio();
    }

    setPressedKeys((prev) => new Set(prev).add(midiNote));

    // Play sound
    if (enableSound) {
      playNote(midiNote, 100);
    }

    // Callback
    onNotePlay?.(midiNote);
  }, [onNotePlay, enableSound, playNote, initAudio, isReady]);

  const handleKeyUp = useCallback((midiNote: number) => {
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });

    // Stop sound
    if (enableSound) {
      stopNote(midiNote);
    }

    onNoteRelease?.(midiNote);
  }, [onNoteRelease, enableSound, stopNote]);

  // Keyboard support
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': startOctave * 12 + 12, // C
      'w': startOctave * 12 + 13, // C#
      's': startOctave * 12 + 14, // D
      'e': startOctave * 12 + 15, // D#
      'd': startOctave * 12 + 16, // E
      'f': startOctave * 12 + 17, // F
      't': startOctave * 12 + 18, // F#
      'g': startOctave * 12 + 19, // G
      'y': startOctave * 12 + 20, // G#
      'h': startOctave * 12 + 21, // A
      'u': startOctave * 12 + 22, // A#
      'j': startOctave * 12 + 23, // B
      'k': startOctave * 12 + 24, // C (next octave)
    };

    const onKeyDown = async (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi && !e.repeat) {
        // Initialize audio if not ready
        if (enableSound && !isReady) {
          await initAudio();
        }

        setPressedKeys((prev) => new Set(prev).add(midi));

        // Play sound
        if (enableSound) {
          playNote(midi, 100);
        }

        onNotePlay?.(midi);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const midi = keyMap[e.key.toLowerCase()];
      if (midi) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });

        // Stop sound
        if (enableSound) {
          stopNote(midi);
        }

        onNoteRelease?.(midi);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startOctave, onNotePlay, onNoteRelease, enableSound, playNote, stopNote, initAudio, isReady]);

  const getKeyColor = (midiNote: number, isBlack: boolean) => {
    const isPressed = pressedKeys.has(midiNote) || activeNotes.includes(midiNote);
    const isExpected = expectedNote === midiNote;

    // Feedback colors
    if (isPressed && feedbackType) {
      if (feedbackType === 'correct') return 'bg-green-400';
      if (feedbackType === 'wrong') return 'bg-red-400';
      if (feedbackType === 'early' || feedbackType === 'late') return 'bg-yellow-400';
    }

    // Expected note highlight
    if (isExpected && highlightMode === 'expected') {
      return isBlack ? 'bg-purple-600' : 'bg-purple-200';
    }

    // Pressed state
    if (isPressed) {
      return isBlack ? 'bg-neutral-600' : 'bg-orange-100';
    }

    // Default
    return isBlack ? 'bg-neutral-900' : 'bg-white';
  };

  const whiteKeyWidth = 100 / whiteKeys.length;

  return (
    <div
      ref={pianoRef}
      className="relative select-none touch-none"
      style={{ height: '180px' }}
    >
      {/* White Keys */}
      <div className="absolute inset-0 flex">
        {whiteKeys.map((key) => {
          const isPressed = pressedKeys.has(key.midiNote) || activeNotes.includes(key.midiNote);
          const isExpected = expectedNote === key.midiNote;

          return (
            <button
              key={key.midiNote}
              className={`
                relative flex-1 rounded-b-lg border border-neutral-300
                transition-all duration-75
                ${getKeyColor(key.midiNote, false)}
                ${isPressed ? 'translate-y-0.5 shadow-inner' : 'shadow-md hover:bg-neutral-50'}
                ${isExpected && highlightMode === 'expected' ? 'ring-2 ring-purple-400 ring-inset' : ''}
              `}
              onMouseDown={() => handleKeyDown(key.midiNote)}
              onMouseUp={() => handleKeyUp(key.midiNote)}
              onMouseLeave={() => handleKeyUp(key.midiNote)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleKeyDown(key.midiNote);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleKeyUp(key.midiNote);
              }}
            >
              {showLabels && (
                <span className={`
                  absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium
                  ${isPressed ? 'text-orange-700' : 'text-neutral-400'}
                `}>
                  {key.noteName}
                  {key.noteName === 'C' && <span className="text-[10px]">{key.octave}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Black Keys */}
      <div className="absolute inset-0 flex pointer-events-none">
        {whiteKeys.map((whiteKey, index) => {
          // Find if there's a black key after this white key
          const blackKey = blackKeys.find(
            (b) => b.midiNote === whiteKey.midiNote + 1
          );

          if (!blackKey) return <div key={index} style={{ width: `${whiteKeyWidth}%` }} />;

          const isPressed = pressedKeys.has(blackKey.midiNote) || activeNotes.includes(blackKey.midiNote);
          const isExpected = expectedNote === blackKey.midiNote;

          return (
            <div
              key={index}
              className="relative"
              style={{ width: `${whiteKeyWidth}%` }}
            >
              <button
                className={`
                  absolute top-0 right-0 translate-x-1/2 w-[60%] h-[60%] rounded-b-md
                  pointer-events-auto z-10
                  transition-all duration-75
                  ${getKeyColor(blackKey.midiNote, true)}
                  ${isPressed ? 'h-[58%] shadow-inner' : 'shadow-lg'}
                  ${isExpected && highlightMode === 'expected' ? 'ring-2 ring-purple-400' : ''}
                `}
                onMouseDown={() => handleKeyDown(blackKey.midiNote)}
                onMouseUp={() => handleKeyUp(blackKey.midiNote)}
                onMouseLeave={() => handleKeyUp(blackKey.midiNote)}
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
  );
}

// Helper to convert MIDI to note name
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}
