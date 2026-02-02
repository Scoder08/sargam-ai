/**
 * API Client
 * 
 * Base HTTP client for all API calls.
 * Uses ky (tiny fetch wrapper) for better DX.
 */

import ky, { type KyInstance, type Options } from 'ky';

// API configuration
const API_URL = typeof window !== 'undefined' 
  ? (window as any).__SARGAM_API_URL__ || 'http://localhost:8000'
  : process.env.VITE_API_URL || 'http://localhost:8000';

const API_VERSION = 'v1';

// Create base client
const createClient = (options?: Options): KyInstance => {
  return ky.create({
    prefixUrl: `${API_URL}/api/${API_VERSION}`,
    timeout: 30000,
    retry: {
      limit: 2,
      methods: ['get'],
      statusCodes: [408, 500, 502, 503, 504],
    },
    hooks: {
      beforeRequest: [
        (request) => {
          // Add auth token if available
          const token = getAuthToken();
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        },
      ],
      afterResponse: [
        async (_request, _options, response) => {
          // Handle 401 - token expired
          if (response.status === 401) {
            // Clear auth state
            clearAuthToken();
            // Optionally redirect to login
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:expired'));
            }
          }
          return response;
        },
      ],
    },
    ...options,
  });
};

// Auth token management (works with both localStorage and AsyncStorage)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem('sargam_auth_token', token);
    } else {
      localStorage.removeItem('sargam_auth_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  
  if (typeof window !== 'undefined' && window.localStorage) {
    authToken = localStorage.getItem('sargam_auth_token');
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('sargam_auth_token');
  }
}

// Export configured client
export const apiClient = createClient();

// Helper for JSON responses
export async function fetchJson<T>(
  url: string,
  options?: Options
): Promise<T> {
  const response = await apiClient(url, options);
  return response.json<T>();
}

// Export for custom client creation (useful for testing)
export { createClient };
