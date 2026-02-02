import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Feedback {
  result: 'correct' | 'wrong_note' | 'early' | 'late';
  expectedNote: number | null;
  playedNote: number;
  timingDiff: number;
  scoreDelta: number;
  message: string;
}

interface SessionStats {
  notesPlayed: number;
  notesCorrect: number;
  notesWrong: number;
  timingErrors: number;
  currentScore: number;
  progress: number;
  currentNoteIndex: number;
  totalNotes: number;
}

interface SessionResult {
  sessionId: number;
  overallScore: number;
  accuracy: number;
  timing: number;
  grade: string;
  message: string;
  durationSeconds: number;
  breakdown: {
    correct: number;
    timingErrors: number;
    wrongNotes: number;
    totalExpected: number;
  };
}

interface UsePracticeSocketReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  sessionId: string | null;
  lastFeedback: Feedback | null;
  stats: SessionStats | null;
  sessionResult: SessionResult | null;
  error: string | null;

  authenticate: (token: string) => void;
  startSession: (params: {
    sessionType: string;
    lessonId?: number;
    songId?: number;
    expectedNotes: Array<{ midiNote: number; startTime: number; duration?: number }>;
    tempo?: number;
  }) => void;
  sendNote: (midiNote: number, velocity: number, timestamp: number) => void;
  updateNotes: (expectedNotes: Array<{ midiNote: number; startTime: number; duration?: number }>, resetProgress?: boolean) => void;
  endSession: () => void;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function usePracticeSocket(): UsePracticeSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setIsAuthenticated(false);
      setSessionId(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection error. Please check your internet connection.');
    });

    // Auth events
    socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setIsAuthenticated(true);
      setError(null);
    });

    socket.on('auth_error', (data) => {
      console.error('Auth error:', data);
      setError(data.message);
      setIsAuthenticated(false);
    });

    // Session events
    socket.on('session_started', (data) => {
      console.log('Session started:', data);
      setSessionId(data.sessionId);
      setStats({
        notesPlayed: 0,
        notesCorrect: 0,
        notesWrong: 0,
        timingErrors: 0,
        currentScore: 0,
        progress: 0,
        currentNoteIndex: 0,
        totalNotes: data.totalNotes,
      });
      setSessionResult(null);
      setLastFeedback(null);
    });

    socket.on('feedback', (data: Feedback) => {
      setLastFeedback(data);
    });

    socket.on('stats_update', (data: SessionStats) => {
      setStats(data);
    });

    socket.on('session_ended', (data: SessionResult) => {
      console.log('Session ended:', data);
      setSessionResult(data);
      setSessionId(null);
    });

    socket.on('notes_updated', () => {
      console.log('Notes updated');
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message);
    });

    socket.on('pong', () => {
      // Keep-alive response
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, []);

  const authenticate = useCallback((token: string) => {
    socketRef.current?.emit('authenticate', { token });
  }, []);

  const startSession = useCallback((params: {
    sessionType: string;
    lessonId?: number;
    songId?: number;
    expectedNotes: Array<{ midiNote: number; startTime: number; duration?: number }>;
    tempo?: number;
  }) => {
    socketRef.current?.emit('start_session', params);
  }, []);

  const sendNote = useCallback((midiNote: number, velocity: number, timestamp: number) => {
    socketRef.current?.emit('note_played', { midiNote, velocity, timestamp });
  }, []);

  const updateNotes = useCallback((
    expectedNotes: Array<{ midiNote: number; startTime: number; duration?: number }>,
    resetProgress: boolean = false
  ) => {
    socketRef.current?.emit('update_notes', { expectedNotes, resetProgress });
  }, []);

  const endSession = useCallback(() => {
    socketRef.current?.emit('end_session');
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sessionId,
    lastFeedback,
    stats,
    sessionResult,
    error,
    authenticate,
    startSession,
    sendNote,
    updateNotes,
    endSession,
  };
}
