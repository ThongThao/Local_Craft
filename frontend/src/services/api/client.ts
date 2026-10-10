export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

const ACCESS_TOKEN_KEY = 'lc_access_token';
const REFRESH_TOKEN_KEY = 'lc_refresh_token';

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (access: string, refresh?: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const url = `${BASE_URL}${API_PREFIX}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = restOptions.body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    let response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && requiresAuth) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${BASE_URL}${API_PREFIX}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.data?.access) {
            setTokens(refreshData.data.access, refreshData.data.refresh);
            requestHeaders['Authorization'] = `Bearer ${refreshData.data.access}`;
            response = await fetch(url, {
              ...restOptions,
              headers: requestHeaders,
            });
          } else {
            clearTokens();
          }
        } catch {
          clearTokens();
        }
      }
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      let errorMsg = data.message || 'Có lỗi xảy ra khi xử lý yêu cầu.';
      if (data.errors && typeof data.errors === 'object') {
        const fieldDetails = Object.values(data.errors)
          .flat()
          .filter(Boolean);
        if (fieldDetails.length > 0) {
          errorMsg = fieldDetails.join(' • ');
        }
      }
      throw new ApiError(errorMsg, response.status, data.errors);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err.message || 'Không thể kết nối đến máy chủ LocalCraft. Vui lòng kiểm tra mạng.',
      0
    );
  }
}
