import { apiClient, setTokens, clearTokens, ApiResponse } from './client';

export interface UserProfile {
  user_id: number;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birth_date?: string;
  address?: string;
  status: string;
  roles: string[];
  created_at?: string;
}

export interface AuthTokens {
  access: string;
  refresh?: string;
}

export interface LoginResponseData {
  tokens: AuthTokens;
  user: UserProfile;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birth_date?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<ApiResponse<{ user: UserProfile }>> => {
    return apiClient('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  verifyEmail: async (payload: VerifyEmailPayload): Promise<ApiResponse<LoginResponseData>> => {
    const res = await apiClient<LoginResponseData>('/auth/verify-email/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
    if (res.data?.tokens?.access) {
      setTokens(res.data.tokens.access, res.data.tokens.refresh);
    }
    return res;
  },

  resendVerificationOtp: async (email: string): Promise<ApiResponse<null>> => {
    return apiClient('/auth/resend-verification-otp/', {
      method: 'POST',
      body: JSON.stringify({ email }),
      requiresAuth: false,
    });
  },

  login: async (payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> => {
    const res = await apiClient<LoginResponseData>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
    if (res.data?.tokens?.access) {
      setTokens(res.data.tokens.access, res.data.tokens.refresh);
    }
    return res;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    try {
      await apiClient('/auth/logout/', {
        method: 'POST',
        requiresAuth: true,
      });
    } finally {
      clearTokens();
    }
    return { success: true, message: 'Đăng xuất thành công', data: null };
  },

  getMe: async (): Promise<ApiResponse<UserProfile>> => {
    return apiClient<UserProfile>('/auth/me/', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  updateMe: async (payload: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> => {
    return apiClient<UserProfile>('/auth/me/', {
      method: 'PUT',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<ApiResponse<null>> => {
    return apiClient('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<ApiResponse<null>> => {
    return apiClient('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  resendResetOtp: async (email: string): Promise<ApiResponse<null>> => {
    return apiClient('/auth/resend-reset-otp/', {
      method: 'POST',
      body: JSON.stringify({ email }),
      requiresAuth: false,
    });
  },
};
