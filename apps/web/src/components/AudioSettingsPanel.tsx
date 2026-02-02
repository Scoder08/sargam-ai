import { useState } from 'react';
import { useAudioSettingsStore, AUDIO_PRESETS } from '@sargam/core';

interface AudioSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AudioSettingsPanel({ isOpen, onClose }: AudioSettingsPanelProps) {
  const { settings, updateSettings, resetToDefaults } = useAudioSettingsStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets = [
    { name: 'Piano', key: 'piano' as const },
    { name: 'Soft', key: 'soft' as const },
    { name: 'Bright', key: 'bright' as const },
    { name: 'Electric', key: 'electric' as const },
  ];

  const applyPreset = (presetKey: keyof typeof AUDIO_PRESETS) => {
    updateSettings(AUDIO_PRESETS[presetKey]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl p-6 pb-10 animate-slide-up">
        {/* Handle bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Sound Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Presets */}
        <div className="mb-5">
          <p className="text-sm text-white/50 mb-2">Quick Presets</p>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset.key)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white/70 hover:bg-purple-500/40 hover:text-purple-300 transition-colors active:scale-95"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Volume</span>
            <span className="text-sm text-purple-400 font-medium">{Math.round(((settings.volume + 20) / 20) * 100)}%</span>
          </div>
          <input
            type="range"
            min="-20"
            max="0"
            step="1"
            value={settings.volume}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
          />
        </div>

        {/* Brightness */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Brightness</span>
            <span className="text-sm text-purple-400 font-medium">{settings.brightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.brightness}
            onChange={(e) => updateSettings({ brightness: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>Warm</span>
            <span>Bright</span>
          </div>
        </div>

        {/* Reverb */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Reverb</span>
            <span className="text-sm text-purple-400 font-medium">{settings.reverbAmount}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={settings.reverbAmount}
            onChange={(e) => updateSettings({ reverbAmount: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
          />
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </button>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="pt-4 border-t border-white/10 space-y-4">
            {/* Sound Type */}
            <div>
              <p className="text-sm text-white/70 mb-2">Sound Type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['sine', 'triangle', 'fatsawtooth'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateSettings({ oscillatorType: type })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      settings.oscillatorType === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {type === 'sine' ? 'Mellow' : type === 'triangle' ? 'Soft' : 'Rich'}
                  </button>
                ))}
              </div>
            </div>

            {/* Attack */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Attack</span>
                <span className="text-sm text-purple-400">{settings.attack.toFixed(3)}s</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.005"
                value={settings.attack}
                onChange={(e) => updateSettings({ attack: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
              />
            </div>

            {/* Decay */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Decay</span>
                <span className="text-sm text-purple-400">{settings.decay.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={settings.decay}
                onChange={(e) => updateSettings({ decay: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
              />
            </div>

            {/* Sustain */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Sustain</span>
                <span className="text-sm text-purple-400">{Math.round(settings.sustain * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sustain}
                onChange={(e) => updateSettings({ sustain: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
              />
            </div>

            {/* Release */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Release</span>
                <span className="text-sm text-purple-400">{settings.release.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={settings.release}
                onChange={(e) => updateSettings({ release: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none bg-white/10 accent-purple-500"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-purple-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset to Defaults
            </button>
          </div>
        )}

        <style>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
