/**
 * React Query Hooks for Admin API
 *
 * Admin-only hooks for managing tutorials, users, and platform stats.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions
} from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
interface AdminStats {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    premium: number;
  };
  songs: {
    total: number;
    free: number;
    userCreated: number;
  };
  practice: {
    totalSessions: number;
    sessionsToday: number;
    sessionsThisWeek: number;
  };
  topSongs: Array<{
    id: number;
    title: string;
    artist: string;
    playCount: number;
  }>;
}

interface AdminUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isPremium: boolean;
  isAdmin: boolean;
  createdAt: string;
  gems: number;
  xp: number;
  level: number;
  streak: number;
}

interface AdminTutorial {
  id: number;
  title: string;
  titleHindi?: string;
  artist: string;
  movie?: string;
  year?: number;
  tempo: number;
  key: string;
  duration: number;
  genre: string;
  difficulty: string;
  instruments: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  playCount: number;
  isPopular: boolean;
  isFree: boolean;
  createdByUserId?: number;
  createdAt?: string;
  melodyPattern?: {
    notes: number[];
    intervals: number[];
    tempo: number;
    key: string;
  };
}

interface CreateTutorialInput {
  title: string;
  titleHindi?: string;
  artist?: string;
  movie?: string;
  year?: number;
  tempo?: number;
  key?: string;
  duration?: number;
  genre?: string;
  difficulty?: string;
  instruments?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isPopular?: boolean;
  isFree?: boolean;
  notes?: number[];
  intervals?: number[];
  sections?: any[];
  chords?: any[];
  videoUrl?: string;
  rawInput?: string;
  useAI?: boolean;
  context?: string;
}

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  tutorials: () => [...adminKeys.all, 'tutorials'] as const,
  tutorialList: (params?: { page?: number; search?: string; difficulty?: string }) =>
    [...adminKeys.tutorials(), 'list', params] as const,
  tutorialDetail: (id: number) => [...adminKeys.tutorials(), 'detail', id] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params?: { page?: number; search?: string }) =>
    [...adminKeys.users(), 'list', params] as const,
  userDetail: (id: number) => [...adminKeys.users(), 'detail', id] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Stats
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdminStats(
  options?: Omit<UseQueryOptions<AdminStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get('admin/stats').json<AdminStats>();
      return response;
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tutorial Management
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdminTutorials(
  params?: { page?: number; perPage?: number; search?: string; difficulty?: string },
  options?: Omit<UseQueryOptions<{ tutorials: AdminTutorial[]; pagination: any }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.tutorialList(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.perPage) searchParams.set('perPage', String(params.perPage));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.difficulty) searchParams.set('difficulty', params.difficulty);

      const response = await apiClient
        .get(`admin/tutorials?${searchParams.toString()}`)
        .json<{ tutorials: AdminTutorial[]; pagination: any }>();
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

export function useAdminTutorial(
  id: number,
  options?: Omit<UseQueryOptions<AdminTutorial>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.tutorialDetail(id),
    queryFn: async () => {
      const response = await apiClient.get(`admin/tutorials/${id}`).json<AdminTutorial>();
      return response;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateTutorialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTutorialInput) => {
      const response = await apiClient.post('admin/tutorials', { json: data }).json();
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorials() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

export function useUpdateTutorialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateTutorialInput> }) => {
      const response = await apiClient.put(`admin/tutorials/${id}`, { json: data }).json();
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorials() });
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorialDetail(id) });
    },
  });
}

export function useDeleteTutorialMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`admin/tutorials/${id}`).json();
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorials() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

export function useParseTutorialMutation() {
  return useMutation({
    mutationFn: async (data: { rawInput: string; title?: string; artist?: string; context?: string }) => {
      const response = await apiClient.post('admin/tutorials/parse', { json: data }).json();
      return response as { parsed: any; message: string };
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdminUsers(
  params?: { page?: number; perPage?: number; search?: string },
  options?: Omit<UseQueryOptions<{ users: AdminUser[]; pagination: any }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.userList(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.perPage) searchParams.set('perPage', String(params.perPage));
      if (params?.search) searchParams.set('search', params.search);

      const response = await apiClient
        .get(`admin/users?${searchParams.toString()}`)
        .json<{ users: AdminUser[]; pagination: any }>();
      return response;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useAdminUser(
  id: number,
  options?: Omit<UseQueryOptions<AdminUser & { gamification: any; stats: any }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.userDetail(id),
    queryFn: async () => {
      const response = await apiClient.get(`admin/users/${id}`).json();
      return response as AdminUser & { gamification: any; stats: any };
    },
    enabled: !!id,
    ...options,
  });
}

export function useAddUserGemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: number; amount: number; reason?: string }) => {
      const response = await apiClient
        .post(`admin/users/${userId}/gems`, { json: { amount, reason } })
        .json();
      return response;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useSetUserPremiumMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isPremium, days }: { userId: number; isPremium: boolean; days?: number }) => {
      const response = await apiClient
        .post(`admin/users/${userId}/premium`, { json: { isPremium, days } })
        .json();
      return response;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useSetUserAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const response = await apiClient
        .post(`admin/users/${userId}/admin`, { json: { isAdmin } })
        .json();
      return response;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiClient.delete(`admin/users/${userId}`).json();
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}
