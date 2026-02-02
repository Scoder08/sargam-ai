/**
 * Lessons API Endpoints
 */

import { apiClient } from '../client';
import type { 
  Lesson, 
  LessonModule, 
  LessonProgress,
  InstrumentType,
  SkillLevel,
  PaginatedResponse 
} from '@sargam/types';

export interface LessonFilters {
  instrument?: InstrumentType;
  skillLevel?: SkillLevel;
  moduleId?: string;
  page?: number;
  pageSize?: number;
}

export const lessonApi = {
  /**
   * Get all lesson modules
   */
  async getModules(instrument?: InstrumentType): Promise<LessonModule[]> {
    const searchParams = instrument ? { instrument } : undefined;
    return apiClient.get('lessons/modules', { searchParams }).json<LessonModule[]>();
  },

  /**
   * Get a single module by ID
   */
  async getModule(moduleId: string): Promise<LessonModule> {
    return apiClient.get(`lessons/modules/${moduleId}`).json<LessonModule>();
  },

  /**
   * Get paginated lessons with filters
   */
  async getLessons(filters?: LessonFilters): Promise<PaginatedResponse<Lesson>> {
    return apiClient.get('lessons', { searchParams: filters as any }).json<PaginatedResponse<Lesson>>();
  },

  /**
   * Get a single lesson by ID
   */
  async getLesson(lessonId: string): Promise<Lesson> {
    return apiClient.get(`lessons/${lessonId}`).json<Lesson>();
  },

  /**
   * Get user's progress for a lesson
   */
  async getProgress(lessonId: string): Promise<LessonProgress> {
    return apiClient.get(`lessons/${lessonId}/progress`).json<LessonProgress>();
  },

  /**
   * Update lesson progress
   */
  async updateProgress(
    lessonId: string, 
    data: Partial<LessonProgress>
  ): Promise<LessonProgress> {
    return apiClient.patch(`lessons/${lessonId}/progress`, { json: data }).json<LessonProgress>();
  },

  /**
   * Mark a section as complete
   */
  async completeSection(
    lessonId: string, 
    sectionId: string
  ): Promise<LessonProgress> {
    return apiClient.post(`lessons/${lessonId}/sections/${sectionId}/complete`).json<LessonProgress>();
  },

  /**
   * Get recommended lessons for user
   */
  async getRecommended(limit: number = 5): Promise<Lesson[]> {
    return apiClient.get('lessons/recommended', { searchParams: { limit } }).json<Lesson[]>();
  },

  /**
   * Get user's recent lessons
   */
  async getRecent(limit: number = 5): Promise<Lesson[]> {
    return apiClient.get('lessons/recent', { searchParams: { limit } }).json<Lesson[]>();
  },
};
