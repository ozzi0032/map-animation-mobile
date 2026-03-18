import api from './axiosInstance';
import { ENDPOINTS } from '../constants/endpoints';

export interface ProjectItem {
  id: number;
  title: string;
  description: string | null;
  animationType: string;
  userPrompt: string;
  aspectRatio: string;
  isFavorite: boolean;
  jobStatus: string;
  completedAt: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  videoWidth: number | null;
  videoHeight: number | null;
  downloadCounter: number;
  modifiedTimeAgo: string;
  isCompleted: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  canOpenPreview: boolean;
}

export interface ProjectDetail extends ProjectItem {
  canDownload: boolean;
  canCreateTemplate: boolean;
  canFavorite: boolean;
  canRename: boolean;
  canDelete: boolean;
  canCopyPrompt: boolean;
}

export interface ProjectListParams {
  filterType?: 'all' | 'favorites';
  jobStatus?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProjectListResult {
  items: ProjectItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
}

export const projectApi = {
  getAll: async (params: ProjectListParams = {}): Promise<ProjectListResult> => {
    const res = await api.get(ENDPOINTS.projects.list, { params });
    return res.data.data;
  },

  getDetail: async (id: number): Promise<ProjectDetail> => {
    const res = await api.get(ENDPOINTS.projects.detail(id));
    return res.data.data;
  },

  getStatus: async (
    id: number
  ): Promise<{
    projectId: number;
    jobStatus: string;
    isTerminal: boolean;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  }> => {
    const res = await api.get(ENDPOINTS.projects.status(id));
    return res.data.data;
  },

  toggleFavorite: async (id: number): Promise<{ projectId: number; isFavorite: boolean }> => {
    const res = await api.patch(ENDPOINTS.projects.favorite(id));
    return res.data.data;
  },

  rename: async (id: number, title: string): Promise<void> => {
    await api.patch(ENDPOINTS.projects.rename(id), { title });
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(ENDPOINTS.projects.delete(id));
  },

  trackDownload: async (id: number): Promise<{ projectId: number; downloadCount: number }> => {
    const res = await api.post(ENDPOINTS.projects.download(id));
    return res.data.data;
  },

  createTemplate: async (
    id: number,
    title: string,
    description?: string
  ): Promise<{ templateId: number; projectId: number }> => {
    const res = await api.post(ENDPOINTS.projects.createTemplate(id), { title, description });
    return res.data.data;
  },
};
