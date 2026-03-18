import { create } from 'zustand';
import {
  projectApi,
  type ProjectItem,
  type ProjectDetail,
  type ProjectListParams,
} from '../api/projectApi';

const PAGE_SIZE = 20;

interface ProjectStore {
  // ── List state ──
  projects: ProjectItem[];
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;

  // ── Filters ──
  filter: 'all' | 'favorites';
  searchTerm: string;

  // ── Detail modal ──
  selectedProject: ProjectDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  // ── Actions ──
  setFilter: (filter: 'all' | 'favorites') => void;
  setSearchTerm: (term: string) => void;
  loadProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  loadMoreProjects: () => Promise<void>;
  openDetail: (id: number) => Promise<void>;
  closeDetail: () => void;
  toggleFavorite: (id: number) => Promise<void>;
  renameProject: (id: number, title: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // ── SignalR patch ──
  patchProjectStatus: (id: number, jobStatus: string, updates: Partial<ProjectItem>) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  totalCount: 0,
  currentPage: 1,
  hasNextPage: false,
  loading: false,
  refreshing: false,
  loadingMore: false,
  error: null,

  filter: 'all',
  searchTerm: '',

  selectedProject: null,
  detailLoading: false,
  detailError: null,

  setFilter: (filter) => {
    set({ filter, projects: [], currentPage: 1, hasNextPage: false });
    get().loadProjects();
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term, projects: [], currentPage: 1, hasNextPage: false });
    get().loadProjects();
  },

  loadProjects: async () => {
    const { filter, searchTerm } = get();
    set({ loading: true, error: null });
    try {
      const params: ProjectListParams = {
        filterType: filter,
        page: 1,
        pageSize: PAGE_SIZE,
        ...(searchTerm ? { searchTerm } : {}),
      };
      const result = await projectApi.getAll(params);
      set({
        projects: result.items,
        totalCount: result.totalCount,
        currentPage: 1,
        hasNextPage: result.hasNextPage,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message ?? 'Failed to load projects' });
    }
  },

  refreshProjects: async () => {
    const { filter, searchTerm } = get();
    set({ refreshing: true, error: null });
    try {
      const params: ProjectListParams = {
        filterType: filter,
        page: 1,
        pageSize: PAGE_SIZE,
        ...(searchTerm ? { searchTerm } : {}),
      };
      const result = await projectApi.getAll(params);
      set({
        projects: result.items,
        totalCount: result.totalCount,
        currentPage: 1,
        hasNextPage: result.hasNextPage,
        refreshing: false,
      });
    } catch {
      set({ refreshing: false });
    }
  },

  loadMoreProjects: async () => {
    const { hasNextPage, loadingMore, loading, refreshing, filter, searchTerm, currentPage, projects } =
      get();
    if (!hasNextPage || loadingMore || loading || refreshing) return;
    set({ loadingMore: true });
    try {
      const nextPage = currentPage + 1;
      const params: ProjectListParams = {
        filterType: filter,
        page: nextPage,
        pageSize: PAGE_SIZE,
        ...(searchTerm ? { searchTerm } : {}),
      };
      const result = await projectApi.getAll(params);
      set({
        projects: [...projects, ...result.items],
        totalCount: result.totalCount,
        currentPage: nextPage,
        hasNextPage: result.hasNextPage,
        loadingMore: false,
      });
    } catch {
      set({ loadingMore: false });
    }
  },

  openDetail: async (id) => {
    set({ detailLoading: true, detailError: null, selectedProject: null });
    try {
      const detail = await projectApi.getDetail(id);
      set({ selectedProject: detail, detailLoading: false });
    } catch (err: any) {
      set({ detailError: err?.message ?? 'Failed to load project', detailLoading: false });
    }
  },

  closeDetail: () => {
    set({ selectedProject: null, detailError: null });
  },

  toggleFavorite: async (id) => {
    const { projects, selectedProject } = get();
    const prevFav = projects.find((p) => p.id === id)?.isFavorite ?? false;

    // Optimistic update
    set({
      projects: projects.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
      selectedProject:
        selectedProject?.id === id
          ? { ...selectedProject, isFavorite: !selectedProject.isFavorite }
          : selectedProject,
    });

    try {
      const result = await projectApi.toggleFavorite(id);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, isFavorite: result.isFavorite } : p
        ),
        selectedProject:
          state.selectedProject?.id === id
            ? { ...state.selectedProject, isFavorite: result.isFavorite }
            : state.selectedProject,
      }));
    } catch {
      // Rollback
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, isFavorite: prevFav } : p)),
        selectedProject:
          state.selectedProject?.id === id
            ? { ...state.selectedProject, isFavorite: prevFav }
            : state.selectedProject,
      }));
    }
  },

  renameProject: async (id, title) => {
    const { projects, selectedProject } = get();
    const prevTitle = projects.find((p) => p.id === id)?.title ?? '';

    // Optimistic update
    set({
      projects: projects.map((p) => (p.id === id ? { ...p, title } : p)),
      selectedProject:
        selectedProject?.id === id ? { ...selectedProject, title } : selectedProject,
    });

    try {
      await projectApi.rename(id, title);
    } catch {
      // Rollback
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, title: prevTitle } : p)),
        selectedProject:
          state.selectedProject?.id === id
            ? { ...state.selectedProject, title: prevTitle }
            : state.selectedProject,
      }));
      throw new Error('Rename failed');
    }
  },

  deleteProject: async (id) => {
    const { projects } = get();
    const deletedProject = projects.find((p) => p.id === id);

    // Optimistic remove
    set({ projects: projects.filter((p) => p.id !== id) });

    try {
      await projectApi.delete(id);
    } catch {
      // Rollback
      if (deletedProject) {
        set((state) => ({ projects: [deletedProject, ...state.projects] }));
      }
      throw new Error('Delete failed');
    }
  },

  patchProjectStatus: (id, jobStatus, updates) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, jobStatus, ...updates } : p)),
      selectedProject:
        state.selectedProject?.id === id
          ? { ...state.selectedProject, jobStatus, ...updates }
          : state.selectedProject,
    }));
  },
}));
