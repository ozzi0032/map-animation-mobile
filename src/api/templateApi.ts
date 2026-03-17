import api from './axiosInstance';
import { ENDPOINTS } from '../constants/endpoints';

export interface FeaturedTemplate {
  id: number;
  title: string;
  animationType: string;
  aspectRatio: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  videoWidth: number;
  videoHeight: number;
  viewCounter: number;
  likedCounter: number;
  usedCounter: number;
  isLikedByCurrentUser: boolean;
}

export interface TemplateItem {
  id: number;
  title: string;
  description: string | null;
  animationType: string;
  userPrompt: string;
  aspectRatio: string;
  isFavorite: boolean;
  isPublic: boolean;
  isSystem: boolean;
  isFeatured: boolean;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  videoWidth: number;
  videoHeight: number;
  modifiedTimeAgo: string;
  isNew: boolean;
  viewCounter: number;
  usedCounter: number;
  likedCounter: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
}

export interface TemplateListParams {
  filterType?: 'all' | 'favorites' | 'system' | 'public';
  searchTerm?: string;
  sortBy?: 'name' | 'date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TemplateListResult {
  items: TemplateItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
}

export const templateApi = {
  getFeatured: async (): Promise<FeaturedTemplate[]> => {
    const res = await api.get(ENDPOINTS.templates.featured);
    return res.data.data;
  },

  getAll: async (params: TemplateListParams = {}): Promise<TemplateListResult> => {
    const res = await api.get(ENDPOINTS.templates.all, { params });
    return res.data.data;
  },

  getDetail: async (id: number): Promise<TemplateItem> => {
    const res = await api.get(ENDPOINTS.templates.detail(id));
    return res.data.data;
  },

  recordView: async (id: number): Promise<void> => {
    await api.post(ENDPOINTS.templates.view(id));
  },

  recordUse: async (id: number): Promise<void> => {
    await api.post(ENDPOINTS.templates.use(id));
  },

  toggleLike: async (id: number): Promise<{ isLiked: boolean; likedCount: number }> => {
    const res = await api.post(ENDPOINTS.templates.like(id));
    return res.data.data;
  },
};
