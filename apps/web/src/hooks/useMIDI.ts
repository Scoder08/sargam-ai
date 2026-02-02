import { useState, useEffect, useCallback, useRef } from 'react';

interface MIDINote {
  note: number;
  velocity: number;
  timestamp: number;
}

interface UseMIDIReturn {
  isSupported: boolean;
  isConnected: boolean;
  devices: string[];
  selectedDevice: string | null;
  lastNote: MIDINote | null;
  error: string | null;
  connect: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
}

export function useMIDI(): UseMIDIReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<MIDINote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Check for Web MIDI API support
  useEffect(() => {
    setIsSupported('requestMIDIAccess' in navigator);
  }, []);

  // Handle MIDI message
  const handleMIDIMessage = useCallback((event: MIDIMessageEvent) => {
    const [status, note, velocity] = event.data || [];

    // Note On (144) or Note Off (128)
    if (status >= 144 && status < 160 && velocity > 0) {
      // Note On
      setLastNote({
        note,
        velocity,
        timestamp: Date.now() - sessionStartRef.current,
      });
    }
  }, []);

  // Connect to MIDI
  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web MIDI API is not supported in this browser');
      return;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccessRef.current = midiAccess;

      // Get available input devices
      const inputDevices: string[] = [];
      midiAccess.inputs.forEach((input) => {
        inputDevices.push(input.name || input.id);
      });

      setDevices(inputDevices);

      if (inputDevices.length === 0) {
        setError('No MIDI devices found. Connect a MIDI keyboard and try again.');
        return;
      }

      // Auto-connect to first device
      const firstInput = midiAccess.inputs.values().next().value;
      if (firstInput) {
        firstInput.onmidimessage = handleMIDIMessage;
        setSelectedDevice(firstInput.name || firstInput.id);
        setIsConnected(true);
        setError(null);
      }

      // Listen for device changes
      midiAccess.onstatechange = (e) => {
        const event = e as MIDIConnectionEvent;
        if (event.port.type === 'input') {
          const newDevices: string[] = [];
          midiAccess.inputs.forEach((input) => {
            newDevices.push(input.name || input.id);
          });
          setDevices(newDevices);

          if (newDevices.length === 0) {
            setIsConnected(false);
            setSelectedDevice(null);
          }
        }
      };
    } catch (err) {
      setError('Failed to access MIDI devices. Please grant permission.');
      console.error('MIDI error:', err);
    }
  }, [isSupported, handleMIDIMessage]);

  // Select a specific device
  const selectDevice = useCallback((deviceName: string) => {
    if (!midiAccessRef.current) return;

    midiAccessRef.current.inputs.forEach((input) => {
      input.onmidimessage = null; // Clear previous listeners
    });

    midiAccessRef.current.inputs.forEach((input) => {
      if (input.name === deviceName || input.id === deviceName) {
        input.onmidimessage = handleMIDIMessage;
        setSelectedDevice(deviceName);
        setIsConnected(true);
      }
    });
  }, [handleMIDIMessage]);

  // Reset session start time
  const resetSessionStart = useCallback(() => {
    sessionStartRef.current = Date.now();
  }, []);

  return {
    isSupported,
    isConnected,
    devices,
    selectedDevice,
    lastNote,
    error,
    connect,
    selectDevice,
  };
}

// Keyboard fallback for testing without MIDI
export function useKeyboardAsMIDI() {
  const [lastNote, setLastNote] = useState<MIDINote | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const keyToMidi: Record<string, number> = {
      'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65,
      't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71,
      'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const midi = keyToMidi[e.key.toLowerCase()];
      if (midi) {
        setLastNote({
          note: midi,
          velocity: 100,
          timestamp: Date.now() - sessionStartRef.current,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { lastNote };
}
