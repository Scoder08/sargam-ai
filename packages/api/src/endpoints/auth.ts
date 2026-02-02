/**
 * Auth API Endpoints
 */

import { apiClient, setAuthToken } from '../client';
import type { User, UserProfile } from '@sargam/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post('auth/login', { json: data }).json<AuthResponse>();
    setAuthToken(response.token);
    return response;
  },

  /**
   * Sign up a new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post('auth/signup', { json: data }).json<AuthResponse>();
    setAuthToken(response.token);
    return response;
  },

  /**
   * Get current user
   */
  async me(): Promise<UserProfile> {
    return apiClient.get('auth/me').json<UserProfile>();
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('auth/logout');
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post('auth/forgot-password', { json: { email } }).json();
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.post('auth/reset-password', { json: { token, password } }).json();
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.patch('auth/profile', { json: data }).json<UserProfile>();
  },
};
