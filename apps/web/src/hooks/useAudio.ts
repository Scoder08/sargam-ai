import { useRef, useCallback, useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useAudioSettingsStore, type AudioSettings } from '@sargam/core';

interface UseAudioReturn {
  isReady: boolean;
  isLoading: boolean;
  playNote: (midiNote: number, velocity?: number) => void;
  stopNote: (midiNote: number) => void;
  stopAll: () => void;
  initAudio: () => Promise<void>;
}

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

// Convert MIDI note to Tone.js note format (e.g., "C4", "F#5")
function midiToToneNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteName = NOTE_NAMES[noteIndex];
  return `${noteName}${octave}`;
}

// Map oscillator type to Tone.js format
function getOscillatorConfig(type: AudioSettings['oscillatorType']) {
  switch (type) {
    case 'fatsawtooth':
      return { type: 'fatsawtooth' as const, count: 3, spread: 10 };
    case 'sine':
      return { type: 'sine' as const };
    case 'triangle':
      return { type: 'triangle' as const };
    case 'square':
      return { type: 'square' as const };
    case 'sawtooth':
      return { type: 'sawtooth' as const };
    default:
      return { type: 'fatsawtooth' as const, count: 3, spread: 10 };
  }
}

export function useAudio(): UseAudioReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const compressorRef = useRef<Tone.Compressor | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const activeNotesRef = useRef<Set<string>>(new Set());
  const initPromiseRef = useRef<Promise<void> | null>(null);
  // Flag to cancel pending async note plays when stopAll is called
  const playbackCancelledRef = useRef(false);

  // Get settings from store
  const settings = useAudioSettingsStore((state) => state.settings);

  // Initialize audio context and piano synth
  const initAudio = useCallback(async () => {
    // Return existing promise if already initializing
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    if (isReady) return;

    const initPromise = (async () => {
      setIsLoading(true);
      try {
        // Start Tone.js audio context immediately
        await Tone.start();

        // Create compressor for consistent volume (connects directly to destination first)
        const compressor = new Tone.Compressor({
          threshold: -20,
          ratio: 4,
          attack: 0.003,
          release: 0.25,
        }).toDestination();
        compressorRef.current = compressor;

        // Create lowpass filter for brightness control
        const filterFreq = 200 + (settings.brightness / 100) * 4800;
        const filter = new Tone.Filter({
          frequency: filterFreq,
          type: 'lowpass',
          rolloff: -12,
        }).connect(compressor);
        filterRef.current = filter;

        // Create synth with settings - INSTANT, no waiting
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: getOscillatorConfig(settings.oscillatorType),
          envelope: {
            attack: settings.attack,
            decay: settings.decay,
            sustain: settings.sustain,
            release: settings.release,
          },
        }).connect(filter);

        synth.volume.value = settings.volume;
        synthRef.current = synth;

        // Mark as ready BEFORE reverb generation so playback works immediately
        setIsReady(true);
        console.log('Piano synth initialized (instant)');

        // Generate reverb in background AFTER synth is ready
        // This adds reverb effect after a moment, but doesn't block playback
        if (settings.reverbAmount > 0) {
          const reverb = new Tone.Reverb({
            decay: settings.reverbDecay,
            wet: settings.reverbAmount / 100,
          }).toDestination();

          // Generate reverb asynchronously
          reverb.generate().then(() => {
            reverbRef.current = reverb;
            // Reconnect compressor through reverb for better sound
            compressor.disconnect();
            compressor.connect(reverb);
            console.log('Reverb added');
          });
        }
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      } finally {
        setIsLoading(false);
        initPromiseRef.current = null;
      }
    })();

    initPromiseRef.current = initPromise;
    return initPromise;
  }, [isReady, settings]);

  // Track previous oscillator type to detect changes requiring synth recreation
  const prevOscillatorTypeRef = useRef<AudioSettings['oscillatorType']>(settings.oscillatorType);

  // Update synth settings when they change
  useEffect(() => {
    if (!synthRef.current || !isReady) return;

    try {
      // Update volume
      synthRef.current.volume.value = settings.volume;

      // Update filter brightness
      if (filterRef.current) {
        const filterFreq = 200 + (settings.brightness / 100) * 4800;
        filterRef.current.frequency.value = filterFreq;
      }

      // Update reverb
      if (reverbRef.current) {
        reverbRef.current.wet.value = settings.reverbAmount / 100;
      }

      // Update envelope settings (ADSR) - applies to new notes immediately
      synthRef.current.set({
        envelope: {
          attack: settings.attack,
          decay: settings.decay,
          sustain: settings.sustain,
          release: settings.release,
        },
      });

      // If oscillator type changed, recreate the synth voices
      if (prevOscillatorTypeRef.current !== settings.oscillatorType) {
        prevOscillatorTypeRef.current = settings.oscillatorType;
        // Update oscillator type for new notes
        synthRef.current.set({
          oscillator: getOscillatorConfig(settings.oscillatorType),
        });
      }
    } catch (error) {
      console.error('Failed to update audio settings:', error);
    }
  }, [settings, isReady]);

  // Play a note
  const playNote = useCallback((midiNote: number, velocity: number = 100) => {
    // Reset cancelled flag when playing
    playbackCancelledRef.current = false;

    // Start audio on first interaction if synth not ready
    if (!synthRef.current) {
      initAudio().then(() => {
        // Check if playback was cancelled while waiting for init (e.g., demo was stopped)
        if (playbackCancelledRef.current || !synthRef.current) return;

        const noteName = midiToToneNote(midiNote);
        const vel = Math.min(velocity / 127, 1);
        synthRef.current.triggerAttack(noteName, Tone.now(), vel);
        activeNotesRef.current.add(noteName);
      });
      return;
    }

    const noteName = midiToToneNote(midiNote);
    const vel = Math.min(velocity / 127, 1);

    // Stop the note first if it's already playing
    if (activeNotesRef.current.has(noteName)) {
      synthRef.current.triggerRelease(noteName);
    }

    synthRef.current.triggerAttack(noteName, Tone.now(), vel);
    activeNotesRef.current.add(noteName);
  }, [initAudio]);

  // Stop a specific note
  const stopNote = useCallback((midiNote: number) => {
    if (!synthRef.current) return;

    const noteName = midiToToneNote(midiNote);
    synthRef.current.triggerRelease(noteName);
    activeNotesRef.current.delete(noteName);
  }, []);

  // Stop all notes
  const stopAll = useCallback(() => {
    // Set cancelled flag to prevent any pending async note plays
    playbackCancelledRef.current = true;

    if (!synthRef.current) return;

    synthRef.current.releaseAll();
    activeNotesRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.releaseAll();
        synthRef.current.dispose();
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (compressorRef.current) {
        compressorRef.current.dispose();
      }
      if (filterRef.current) {
        filterRef.current.dispose();
      }
    };
  }, []);

  return {
    isReady,
    isLoading,
    playNote,
    stopNote,
    stopAll,
    initAudio,
  };
}

// Hook for playing a metronome click
export function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  const start = useCallback(async (bpm: number = 120) => {
    await Tone.start();

    if (!synthRef.current) {
      synthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: {
          attack: 0.001,
          decay: 0.3,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination();
      synthRef.current.volume.value = -12;
    }

    Tone.getTransport().bpm.value = bpm;

    if (loopRef.current) {
      loopRef.current.dispose();
    }

    loopRef.current = new Tone.Loop((time) => {
      synthRef.current?.triggerAttackRelease('C2', '16n', time);
    }, '4n').start(0);

    Tone.getTransport().start();
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    if (loopRef.current) {
      loopRef.current.stop();
    }
    setIsPlaying(false);
  }, []);

  const setBpm = useCallback((bpm: number) => {
    Tone.getTransport().bpm.value = bpm;
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (loopRef.current) {
        loopRef.current.dispose();
      }
    };
  }, [stop]);

  return { isPlaying, start, stop, setBpm };
}
