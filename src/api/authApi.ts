import api from './axiosInstance';
import { ENDPOINTS } from '../constants/endpoints';

// ─── Envelope ────────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: string[] | null;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  profilePictureUrl: string | null;
  emailConfirmed: boolean;
  roles: string[];
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// ─── Auth payloads & responses ────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Auto-login path — server returns tokens immediately */
export interface RegisterAutoLoginData {
  tokens: TokenData;
  paymentUrl: string | null;
}

/** Email-confirmation-required path */
export interface RegisterConfirmationData {
  requiresConfirmation: true;
  email: string;
}

export type RegisterResult =
  | { kind: 'autologin'; tokens: TokenData; paymentUrl: string | null }
  | { kind: 'confirmation'; email: string };

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Register a new user.
   * Returns either auto-login token data or a confirmation-required signal.
   */
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const response = await api.post<ApiResponse<RegisterAutoLoginData | RegisterConfirmationData>>(
      ENDPOINTS.auth.register,
      payload
    );
    const body = response.data;
    if (!body.success || !body.data) {
      throw new Error(
        body.errors?.join(', ') ?? body.message ?? 'Registration failed.'
      );
    }

    if ('requiresConfirmation' in body.data) {
      return { kind: 'confirmation', email: body.data.email };
    }
    return {
      kind: 'autologin',
      tokens: body.data.tokens,
      paymentUrl: body.data.paymentUrl,
    };
  },

  async login(payload: LoginPayload): Promise<TokenData> {
    const response = await api.post<ApiResponse<TokenData>>(
      ENDPOINTS.auth.login,
      payload
    );
    const body = response.data;
    if (!body.success || !body.data) {
      throw new Error(body.message ?? 'Invalid email or password.');
    }
    return body.data;
  },

  async forgotPassword(email: string): Promise<string> {
    const response = await api.post<ApiResponse<null>>(
      ENDPOINTS.auth.forgotPassword,
      { email }
    );
    return (
      response.data.message ??
      'If that email is registered, a reset link has been sent.'
    );
  },

  async resetPassword(payload: {
    email: string;
    code: string;
    password: string;
    confirmPassword: string;
  }): Promise<string> {
    const response = await api.post<ApiResponse<null>>(
      ENDPOINTS.auth.resetPassword,
      payload
    );
    const body = response.data;
    if (!body.success) {
      throw new Error(
        body.errors?.join(', ') ?? body.message ?? 'Password reset failed.'
      );
    }
    return body.message ?? 'Password reset successful.';
  },

  async resendConfirmation(email: string): Promise<string> {
    const response = await api.post<ApiResponse<null>>(
      ENDPOINTS.auth.resendConfirmation,
      { email }
    );
    return response.data.message ?? 'Confirmation email sent.';
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post(ENDPOINTS.auth.logout, { refreshToken });
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>(ENDPOINTS.auth.me);
    const body = response.data;
    if (!body.success || !body.data) {
      throw new Error(body.message ?? 'Unauthorized');
    }
    return body.data;
  },
};
