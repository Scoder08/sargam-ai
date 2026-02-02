/**
 * Audio Settings Store
 *
 * Manages piano sound settings with persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AudioSettings {
  // Sound Character
  oscillatorType: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'fatsawtooth';

  // Volume & Tone
  volume: number; // -20 to 0 dB
  brightness: number; // 0 to 100 (controls filter frequency)

  // Envelope (ADSR)
  attack: number; // 0.001 to 0.5
  decay: number; // 0.1 to 2.0
  sustain: number; // 0 to 1
  release: number; // 0.1 to 2.0

  // Effects
  reverbAmount: number; // 0 to 100 (wet %)
  reverbDecay: number; // 0.5 to 5.0 seconds
}

interface AudioSettingsState {
  settings: AudioSettings;
  updateSettings: (updates: Partial<AudioSettings>) => void;
  resetToDefaults: () => void;
}

// Presets - tuned for pleasant, musical sounds
export const AUDIO_PRESETS = {
  piano: {
    oscillatorType: 'triangle' as const, // Softer than sawtooth
    volume: -8,
    brightness: 70, // Balanced, not too harsh
    attack: 0.005, // Quick but not clicky
    decay: 1.2, // Longer decay like real piano
    sustain: 0.2, // Low sustain for piano-like fade
    release: 0.8, // Natural release
    reverbAmount: 25, // Room ambience
    reverbDecay: 2.0,
  },
  soft: {
    oscillatorType: 'sine' as const,
    volume: -10,
    brightness: 45,
    attack: 0.02,
    decay: 1.5,
    sustain: 0.3,
    release: 1.0,
    reverbAmount: 35,
    reverbDecay: 3.0,
  },
  bright: {
    oscillatorType: 'triangle' as const,
    volume: -6,
    brightness: 85,
    attack: 0.002,
    decay: 0.6,
    sustain: 0.15,
    release: 0.5,
    reverbAmount: 20,
    reverbDecay: 1.5,
  },
  electric: {
    oscillatorType: 'fatsawtooth' as const, // Rich for electric
    volume: -12,
    brightness: 55,
    attack: 0.001,
    decay: 0.4,
    sustain: 0.4,
    release: 0.4,
    reverbAmount: 15,
    reverbDecay: 1.0,
  },
};

const defaultSettings: AudioSettings = AUDIO_PRESETS.piano;

export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetToDefaults: () =>
        set({ settings: defaultSettings }),
    }),
    {
      name: 'sargam-audio-settings',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);

// Selectors
export const selectAudioSettings = (state: AudioSettingsState) => state.settings;
