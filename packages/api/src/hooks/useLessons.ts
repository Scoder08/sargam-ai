/**
 * React Query Hooks for Lessons
 * 
 * These hooks work identically on web and React Native.
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryOptions 
} from '@tanstack/react-query';
import type { Lesson, LessonModule, LessonProgress } from '@sargam/types';
import { lessonApi, type LessonFilters } from '../endpoints/lessons';

// Query keys factory
export const lessonKeys = {
  all: ['lessons'] as const,
  modules: () => [...lessonKeys.all, 'modules'] as const,
  module: (id: string) => [...lessonKeys.modules(), id] as const,
  lists: () => [...lessonKeys.all, 'list'] as const,
  list: (filters?: LessonFilters) => [...lessonKeys.lists(), filters] as const,
  details: () => [...lessonKeys.all, 'detail'] as const,
  detail: (id: string) => [...lessonKeys.details(), id] as const,
  progress: (id: string) => [...lessonKeys.detail(id), 'progress'] as const,
  recommended: () => [...lessonKeys.all, 'recommended'] as const,
  recent: () => [...lessonKeys.all, 'recent'] as const,
};

/**
 * Fetch all lesson modules
 */
export function useLessonModules(
  instrument?: string,
  options?: Omit<UseQueryOptions<LessonModule[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.modules(),
    queryFn: () => lessonApi.getModules(instrument as any),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch a single module
 */
export function useLessonModule(
  moduleId: string,
  options?: Omit<UseQueryOptions<LessonModule>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.module(moduleId),
    queryFn: () => lessonApi.getModule(moduleId),
    enabled: !!moduleId,
    ...options,
  });
}

/**
 * Fetch a single lesson
 */
export function useLesson(
  lessonId: string,
  options?: Omit<UseQueryOptions<Lesson>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.detail(lessonId),
    queryFn: () => lessonApi.getLesson(lessonId),
    enabled: !!lessonId,
    ...options,
  });
}

/**
 * Fetch lesson progress
 */
export function useLessonProgress(
  lessonId: string,
  options?: Omit<UseQueryOptions<LessonProgress>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.progress(lessonId),
    queryFn: () => lessonApi.getProgress(lessonId),
    enabled: !!lessonId,
    ...options,
  });
}

/**
 * Fetch recommended lessons
 */
export function useRecommendedLessons(
  limit: number = 5,
  options?: Omit<UseQueryOptions<Lesson[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.recommended(),
    queryFn: () => lessonApi.getRecommended(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Fetch recent lessons
 */
export function useRecentLessons(
  limit: number = 5,
  options?: Omit<UseQueryOptions<Lesson[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lessonKeys.recent(),
    queryFn: () => lessonApi.getRecent(limit),
    ...options,
  });
}

/**
 * Complete a lesson section
 */
export function useCompleteSectionMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sectionId: string) => lessonApi.completeSection(lessonId, sectionId),
    onSuccess: (data) => {
      // Update progress cache
      queryClient.setQueryData(lessonKeys.progress(lessonId), data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: lessonKeys.recent() });
    },
  });
}

/**
 * Update lesson progress
 */
export function useUpdateProgressMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<LessonProgress>) => lessonApi.updateProgress(lessonId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(lessonKeys.progress(lessonId), data);
    },
  });
}
