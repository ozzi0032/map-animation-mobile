export const BASE_URL = 'https://6397-2401-ba80-aa00-6e86-944e-e429-c627-f5e2.ngrok-free.app/api/v1';

export const ENDPOINTS = {
  auth: {
    register: '/authapi/register',
    login: '/authapi/login',
    refresh: '/authapi/refresh',
    logout: '/authapi/logout',
    forgotPassword: '/authapi/forgot-password',
    resetPassword: '/authapi/reset-password',
    resendConfirmation: '/authapi/resend-confirmation',
    me: '/authapi/me',
  },
  animation: {
    generate: '/animation/generate',
    credits: '/animation/credits',
    resolutionConfig: '/animation/resolution-config',
    supportedFps: '/animation/supported-fps',
  },
  projects: {
    list: '/projects',
    detail: (id: number) => `/projects/${id}`,
    status: (id: number) => `/projects/${id}/status`,
    favorite: (id: number) => `/projects/${id}/favorite`,
    rename: (id: number) => `/projects/${id}/rename`,
    delete: (id: number) => `/projects/${id}`,
    download: (id: number) => `/projects/${id}/download`,
    createTemplate: (id: number) => `/projects/${id}/template`,
  },
  templates: {
    featured: '/templates/featured',
    all: '/templates/all',
    favorites: '/templates/favorites',
    detail: (id: number) => `/templates/${id}`,
    view: (id: number) => `/templates/${id}/view`,
    use: (id: number) => `/templates/${id}/use`,
    like: (id: number) => `/templates/${id}/like`,
    favorite: (id: number) => `/templates/${id}/favorite`,
  },
  subscriptions: {
    me: '/subscriptions/me',
    cancel: '/subscriptions/cancel',
  },
};
