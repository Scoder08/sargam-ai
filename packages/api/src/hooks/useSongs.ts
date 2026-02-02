/**
 * React Query Hooks for Songs
 *
 * These hooks work identically on web and React Native.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions
} from '@tanstack/react-query';
import type { Song, SongTutorial, SongProgress, SongFilter } from '@sargam/types';
import { songApi } from '../endpoints/songs';

// Query keys factory
export const songKeys = {
  all: ['songs'] as const,
  lists: () => [...songKeys.all, 'list'] as const,
  list: (filters?: SongFilter) => [...songKeys.lists(), filters] as const,
  details: () => [...songKeys.all, 'detail'] as const,
  detail: (id: string) => [...songKeys.details(), id] as const,
  tutorial: (id: string, version?: string) => [...songKeys.detail(id), 'tutorial', version] as const,
  progress: (id: string) => [...songKeys.detail(id), 'progress'] as const,
  popular: (limit?: number) => [...songKeys.all, 'popular', limit] as const,
  new: (limit?: number) => [...songKeys.all, 'new', limit] as const,
  search: (query: string) => [...songKeys.all, 'search', query] as const,
  learned: () => [...songKeys.all, 'learned'] as const,
  favorites: () => [...songKeys.all, 'favorites'] as const,
  myCreations: () => [...songKeys.all, 'my-creations'] as const,
  unlocked: () => [...songKeys.all, 'unlocked'] as const,
};

/**
 * Fetch all songs (paginated)
 */
export function useSongs(
  filters?: SongFilter & { page?: number; pageSize?: number },
  options?: Omit<UseQueryOptions<Song[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.list(filters),
    queryFn: async () => {
      // Default to fetching 50 songs to ensure we get all
      const queryFilters = { pageSize: 50, ...filters };
      const response = await songApi.getSongs(queryFilters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch a single song by ID
 */
export function useSong(
  songId: string,
  options?: Omit<UseQueryOptions<Song>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.detail(songId),
    queryFn: () => songApi.getSong(songId),
    enabled: !!songId,
    ...options,
  });
}

/**
 * Fetch song tutorial (notes, sections, chords)
 */
export function useSongTutorial(
  songId: string,
  version?: string,
  options?: Omit<UseQueryOptions<SongTutorial>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.tutorial(songId, version),
    queryFn: () => songApi.getTutorial(songId, version),
    enabled: !!songId,
    ...options,
  });
}

/**
 * Fetch popular songs
 */
export function usePopularSongs(
  limit: number = 10,
  options?: Omit<UseQueryOptions<Song[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.popular(limit),
    queryFn: () => songApi.getPopular(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch new songs
 */
export function useNewSongs(
  limit: number = 10,
  options?: Omit<UseQueryOptions<Song[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.new(limit),
    queryFn: () => songApi.getNew(limit),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Search songs
 */
export function useSearchSongs(
  query: string,
  limit: number = 20,
  options?: Omit<UseQueryOptions<Song[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.search(query),
    queryFn: () => songApi.searchSongs(query, limit),
    enabled: query.length >= 2,
    ...options,
  });
}

/**
 * Fetch song progress
 */
export function useSongProgress(
  songId: string,
  options?: Omit<UseQueryOptions<SongProgress>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.progress(songId),
    queryFn: () => songApi.getProgress(songId),
    enabled: !!songId,
    ...options,
  });
}

/**
 * Update song progress mutation
 */
export function useUpdateSongProgressMutation(songId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SongProgress>) => songApi.updateProgress(songId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(songKeys.progress(songId), data);
    },
  });
}

/**
 * Add to favorites mutation
 */
export function useAddFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (songId: string) => songApi.addFavorite(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.favorites() });
    },
  });
}

/**
 * Remove from favorites mutation
 */
export function useRemoveFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (songId: string) => songApi.removeFavorite(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.favorites() });
    },
  });
}

/**
 * Fetch songs created by the current user
 */
export function useMyCreations(
  options?: Omit<UseQueryOptions<Song[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.myCreations(),
    queryFn: () => songApi.getMyCreations(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Song Unlocking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch user's unlocked song IDs
 */
export function useUnlockedSongs(
  options?: Omit<UseQueryOptions<{ unlockedIds: number[]; purchasedIds: number[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: songKeys.unlocked(),
    queryFn: () => songApi.getUnlockedSongs(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Unlock a song by spending gems
 */
export function useUnlockSongMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (songId: number) => songApi.unlockSong(songId),
    onSuccess: () => {
      // Invalidate unlocked songs and gamification stats (for gem balance)
      queryClient.invalidateQueries({ queryKey: songKeys.unlocked() });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Analysis & Song Creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze audio file to extract melody
 */
export function useAnalyzeAudioMutation() {
  return useMutation({
    mutationFn: (audioFile: File) => songApi.analyzeAudio(audioFile),
  });
}

/**
 * Create song from audio file
 */
export function useCreateSongFromAudioMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ audioFile, metadata }: { audioFile: File; metadata: { title: string; artist: string; movie?: string; difficulty?: string } }) =>
      songApi.createFromAudio(audioFile, metadata as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}

/**
 * Fetch song patterns for recognition
 */
export function useSongPatterns(
  options?: Omit<UseQueryOptions<any[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...songKeys.all, 'patterns'] as const,
    queryFn: () => songApi.getSongPatterns(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Recognize song from played notes
 */
export function useRecognizeSongMutation() {
  return useMutation({
    mutationFn: (notes: number[]) => songApi.recognizeSong(notes),
  });
}

/**
 * Recognize song from audio recording (AudD API)
 */
export function useRecognizeAudioMutation() {
  return useMutation({
    mutationFn: (audioBlob: Blob) => songApi.recognizeAudio(audioBlob),
  });
}
