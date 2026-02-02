/**
 * Authentication API
 *
 * OTP-based phone authentication and user management.
 */

import { apiClient, setAuthToken, clearAuthToken } from './client';
import type { GamificationStats } from './gamification';

export interface User {
  id: number;
  phone: string | null;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  preferredInstrument: string;
  skillLevel: string;
  preferredLanguage: string;
  streakDays: number;
  totalPracticeMinutes: number;
  lessonsCompleted: number;
  songsLearned: number;
  isPremium: boolean;
  createdAt: string;
  gamification?: GamificationStats;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser?: boolean;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  userExists: boolean;
  otp?: string; // Only in dev mode
}

export const authApi = {
  /**
   * Send OTP to phone number
   */
  async sendOTP(phone: string): Promise<SendOTPResponse> {
    const response = await apiClient.post('auth/otp/send', {
      json: { phone },
    });
    return response.json();
  },

  /**
   * Verify OTP and login/register
   */
  async verifyOTP(phone: string, code: string, name?: string): Promise<AuthResponse> {
    const response = await apiClient.post('auth/otp/verify', {
      json: { phone, code, name },
    });
    const data = await response.json<AuthResponse>();

    // Store the token
    setAuthToken(data.accessToken);

    return data;
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get('auth/me');
    return response.json();
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await apiClient.patch('auth/profile', {
      json: updates,
    });
    return response.json();
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('auth/logout');
    } finally {
      clearAuthToken();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await apiClient.post('auth/refresh', {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    const data = await response.json<{ accessToken: string }>();
    setAuthToken(data.accessToken);
    return data;
  },
};
