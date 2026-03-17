import api from './axiosInstance';
import { ENDPOINTS } from '../constants/endpoints';

export interface CreditsInfo {
  isAdmin: boolean;
  isPaidUser: boolean;
  isFreeUser: boolean;
  hasAvailableCredits: boolean;
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  expiryDate: string;
  daysUntilExpiry: number;
  packageName: string | null;
  billingCycle: string | null;
  maxAnimationDurationSeconds: number;
}

export interface ResolutionOption {
  value: string;
  display: string;
  order: number;
  isAllowed: boolean;
}

export interface FpsOption {
  value: number;
  display: string;
}

export interface AspectRatioConfig {
  aspectRatio: string;
  resolutions: ResolutionOption[];
  fpsOptions: FpsOption[];
}

export interface GeneratePayload {
  prompt: string;
  animationType: string;
  mapType?: string;
  videoResolution: string;
  fps: number;
  aspectRatio: string;
  isRetry?: boolean;
  animationProjectId?: number;
}

export interface GenerateResult {
  projectId: number;
  message: string;
  jobStatus: string;
  pollIntervalSeconds: number;
}

export const animationApi = {
  getCredits: async (): Promise<CreditsInfo> => {
    const res = await api.get(ENDPOINTS.animation.credits);
    return res.data.data;
  },

  getResolutionConfig: async (): Promise<AspectRatioConfig[]> => {
    const res = await api.get(ENDPOINTS.animation.resolutionConfig);
    return res.data.data;
  },

  generate: async (payload: GeneratePayload): Promise<GenerateResult> => {
    const res = await api.post(ENDPOINTS.animation.generate, payload);
    return res.data.data;
  },
};
