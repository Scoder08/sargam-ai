/**
 * React Query Hooks for Authentication
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { authApi, type User } from '../auth';
import { getAuthToken, clearAuthToken } from '../client';

// Query keys factory
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get current user with gamification stats
 */
export function useUser(
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  const token = getAuthToken();

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: authApi.getMe,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    ...options,
  });
}

/**
 * Update user profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<User>) => authApi.updateProfile(updates),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.user(), updatedUser);
    },
  });
}

/**
 * Logout user
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      clearAuthToken();
    },
  });
}

/**
 * Send OTP
 */
export function useSendOTPMutation() {
  return useMutation({
    mutationFn: authApi.sendOTP,
  });
}

/**
 * Verify OTP
 */
export function useVerifyOTPMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phone, code, name }: { phone: string; code: string; name?: string }) =>
      authApi.verifyOTP(phone, code, name),
    onSuccess: (data) => {
      // Cache user data
      queryClient.setQueryData(authKeys.user(), data.user);
    },
  });
}
