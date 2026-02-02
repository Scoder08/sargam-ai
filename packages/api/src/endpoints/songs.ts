/**
 * Songs API Endpoints
 */

import { apiClient, getAuthToken } from '../client';
import type {
  Song,
  SongTutorial,
  SongFilter,
  SongProgress,
  PaginatedResponse
} from '@sargam/types';

export const songApi = {
  /**
   * Get paginated songs with filters
   */
  async getSongs(filters?: SongFilter & { page?: number; pageSize?: number }): Promise<PaginatedResponse<Song>> {
    return apiClient.get('songs', { searchParams: filters as any }).json<PaginatedResponse<Song>>();
  },

  /**
   * Get a single song by ID
   */
  async getSong(songId: string): Promise<Song> {
    return apiClient.get(`songs/${songId}`).json<Song>();
  },

  /**
   * Search songs by query
   */
  async searchSongs(query: string, limit: number = 20): Promise<Song[]> {
    return apiClient.get('songs/search', { searchParams: { q: query, limit } }).json<Song[]>();
  },

  /**
   * Get popular songs
   */
  async getPopular(limit: number = 10): Promise<Song[]> {
    return apiClient.get('songs/popular', { searchParams: { limit } }).json<Song[]>();
  },

  /**
   * Get recently added songs
   */
  async getNew(limit: number = 10): Promise<Song[]> {
    return apiClient.get('songs/new', { searchParams: { limit } }).json<Song[]>();
  },

  /**
   * Get tutorial for a song
   */
  async getTutorial(songId: string, version?: string): Promise<SongTutorial> {
    const searchParams = version ? { version } : undefined;
    return apiClient.get(`songs/${songId}/tutorial`, { searchParams }).json<SongTutorial>();
  },

  /**
   * Get user's progress for a song
   */
  async getProgress(songId: string): Promise<SongProgress> {
    return apiClient.get(`songs/${songId}/progress`).json<SongProgress>();
  },

  /**
   * Update song progress
   */
  async updateProgress(
    songId: string, 
    data: Partial<SongProgress>
  ): Promise<SongProgress> {
    return apiClient.patch(`songs/${songId}/progress`, { json: data }).json<SongProgress>();
  },

  /**
   * Get user's learned songs
   */
  async getLearned(): Promise<Song[]> {
    return apiClient.get('songs/learned').json<Song[]>();
  },

  /**
   * Add song to favorites
   */
  async addFavorite(songId: string): Promise<void> {
    await apiClient.post(`songs/${songId}/favorite`);
  },

  /**
   * Remove song from favorites
   */
  async removeFavorite(songId: string): Promise<void> {
    await apiClient.delete(`songs/${songId}/favorite`);
  },

  /**
   * Get user's favorite songs
   */
  async getFavorites(): Promise<Song[]> {
    return apiClient.get('songs/favorites').json<Song[]>();
  },

  /**
   * Get songs created by the current user
   */
  async getMyCreations(): Promise<Song[]> {
    return apiClient.get('songs/my-creations').json<Song[]>();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Song Unlocking
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Unlock a song by spending gems
   */
  async unlockSong(songId: number): Promise<UnlockSongResult> {
    return apiClient.post(`songs/${songId}/unlock`).json<UnlockSongResult>();
  },

  /**
   * Get user's unlocked song IDs
   */
  async getUnlockedSongs(): Promise<UnlockedSongsResponse> {
    return apiClient.get('songs/unlocked').json<UnlockedSongsResponse>();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Audio Analysis & Song Creation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze audio file to extract melody
   */
  async analyzeAudio(audioFile: File): Promise<AudioAnalysisResult> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`http://localhost:8000/api/v1/songs/analyze-audio`, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Analysis failed');
    }

    return response.json();
  },

  /**
   * Create a new song from uploaded audio
   */
  async createFromAudio(audioFile: File, metadata: SongMetadata): Promise<CreateSongResult> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('title', metadata.title);
    formData.append('artist', metadata.artist);
    if (metadata.movie) formData.append('movie', metadata.movie);
    formData.append('difficulty', metadata.difficulty || 'beginner');

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`http://localhost:8000/api/v1/songs/create-from-audio`, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Song creation failed');
    }

    return response.json();
  },

  /**
   * Recognize song from played notes
   */
  async recognizeSong(notes: number[]): Promise<RecognitionResult> {
    return apiClient.post('songs/recognize', { json: { notes } }).json<RecognitionResult>();
  },

  /**
   * Get all song patterns for client-side recognition
   */
  async getSongPatterns(): Promise<SongPattern[]> {
    return apiClient.get('songs/patterns').json<SongPattern[]>();
  },

  /**
   * Recognize song from audio recording using AudD API
   */
  async recognizeAudio(audioBlob: Blob): Promise<AudioRecognitionResult> {
    const formData = new FormData();

    // Use correct filename based on the blob's actual MIME type
    const mimeType = audioBlob.type || 'audio/webm';
    let filename = 'recording.webm';
    if (mimeType.includes('wav')) filename = 'recording.wav';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) filename = 'recording.mp3';
    else if (mimeType.includes('ogg')) filename = 'recording.ogg';
    else if (mimeType.includes('mp4') || mimeType.includes('m4a')) filename = 'recording.m4a';

    formData.append('audio', audioBlob, filename);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`http://localhost:8000/api/v1/songs/recognize-audio`, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Recognition failed');
    }

    return response.json();
  },
};

// Types for audio analysis
export interface AudioAnalysisResult {
  success: boolean;
  tempo: number;
  key: string;
  duration: number;
  noteCount: number;
  notes: ExtractedNote[];
  melodyPattern: MelodyPattern;
}

export interface ExtractedNote {
  midiNote: number;
  duration: number;
  time: number;
  index: number;
}

export interface MelodyPattern {
  intervals: number[];
  notes: number[];
  tempo: number;
  key: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  movie?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CreateSongResult {
  success: boolean;
  song: Song;
  tutorialId: number;
  noteCount: number;
}

export interface RecognitionResult {
  matches: SongMatch[];
  notesAnalyzed: number;
}

export interface SongMatch {
  song_id: number;
  title: string;
  artist: string;
  confidence: number;
}

export interface SongPattern {
  songId: number;
  title: string;
  artist: string;
  intervals: number[];
  notes: number[];
  rhythm?: string[];  // Rhythm pattern: 'S' (short), 'M' (medium), 'L' (long), 'X' (extra long)
  time_intervals?: number[];  // Time differences between notes in ms
  tempo?: number;
  key?: string;
}

// Types for audio-based recognition (AudD + Claude AI fallback)
export interface AudioRecognitionResult {
  success: boolean;
  recognized?: {
    title: string;
    artist: string;
    album?: string;
    release_date?: string;
    spotify?: Record<string, unknown>;
  };
  localMatch?: Song;
  source?: 'audd' | 'claude' | 'openai';  // Which service identified the song
  confidence?: 'high' | 'medium' | 'low';  // Claude's confidence level
  suggestions?: Array<{  // Claude's alternative suggestions
    title: string;
    artist: string;
    reason?: string;
  }>;
  analysis?: string;  // Claude's melody analysis
  error?: string;
  message?: string;
}

// Types for song unlocking
export interface UnlockSongResult {
  success: boolean;
  songId: number;
  gemsSpent: number;
  gemsRemaining: number;
  song: Song;
}

export interface UnlockedSongsResponse {
  unlockedIds: number[];
  purchasedIds: number[];
}
