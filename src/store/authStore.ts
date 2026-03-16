import { create } from 'zustand';
import { tokenUtils } from '../utils/tokenUtils';
import { authApi } from '../api/authApi';
import type { User, RegisterPayload, RegisterResult } from '../api/authApi';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const accessToken = await tokenUtils.getAccessToken();
      if (!accessToken) {
        set({ isInitialized: true, isAuthenticated: false });
        return;
      }

      if (tokenUtils.isTokenExpired(accessToken)) {
        const refreshToken = await tokenUtils.getRefreshToken();
        if (!refreshToken) {
          await tokenUtils.clearAllTokens();
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }
        // Axios interceptor will refresh on the first API call below
      }

      const decoded = tokenUtils.decodeToken(accessToken);
      if (!decoded) {
        await tokenUtils.clearAllTokens();
        set({ isInitialized: true, isAuthenticated: false });
        return;
      }

      // Fetch current user from GET /auth/me
      try {
        const user = await authApi.getMe();
        set({ user, isAuthenticated: true, isInitialized: true });
      } catch {
        await tokenUtils.clearAllTokens();
        set({ isInitialized: true, isAuthenticated: false });
      }
    } catch {
      set({ isInitialized: true, isAuthenticated: false });
    }
  },

  loginWithCredentials: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const tokenData = await authApi.login({ email, password });
      await tokenUtils.saveAccessToken(tokenData.accessToken);
      await tokenUtils.saveRefreshToken(tokenData.refreshToken);
      set({ user: tokenData.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(payload);
      if (result.kind === 'autologin') {
        // Server returned tokens — auto-login the user
        await tokenUtils.saveAccessToken(result.tokens.accessToken);
        await tokenUtils.saveRefreshToken(result.tokens.refreshToken);
        set({ user: result.tokens.user, isAuthenticated: true, isLoading: false });
      } else {
        // Email confirmation required — not authenticated yet
        set({ isLoading: false });
      }
      return result;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      const message = await authApi.forgotPassword(email);
      set({ isLoading: false });
      return message;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await tokenUtils.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Continue local logout even if server call fails
    } finally {
      await tokenUtils.clearAllTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: false });
    }
  },

  setUser: (user: User) => set({ user }),
}));
