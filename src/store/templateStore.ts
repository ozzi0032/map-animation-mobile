import { create } from 'zustand';
import { templateApi, type FeaturedTemplate } from '../api/templateApi';

interface LikeState {
  isLiked: boolean;
  likedCount: number;
}

interface TemplateStore {
  // ── Featured templates (Create screen carousel) ──
  featured: FeaturedTemplate[];
  featuredLoading: boolean;
  featuredError: string | null;

  // ── Optimistic like states keyed by template id ──
  likeStates: Record<number, LikeState>;

  // ── Optimistic counter deltas keyed by template id ──
  viewDeltas: Record<number, number>;
  useDeltas: Record<number, number>;

  // ── Cross-tab pending prompt (Templates → Create) ──
  pendingPrompt: string | null;
  pendingTemplateId: number | null;

  // ── Actions ──
  loadFeatured: () => Promise<void>;
  toggleLike: (id: number, currentIsLiked: boolean, currentCount: number) => Promise<void>;
  recordView: (id: number) => void;
  /** Update local viewDelta only — use when the server already recorded the view (e.g. via GET detail) */
  bumpViewDelta: (id: number) => void;
  /** Reset view/use deltas for a template — call before applying fresh getDetail data so stale deltas don't stack on a new base */
  resetDeltas: (id: number) => void;
  recordUse: (id: number) => void;
  setPendingPrompt: (prompt: string, templateId: number) => void;
  clearPendingPrompt: () => void;

  // ── State helpers ──
  getLikeState: (id: number, fallbackIsLiked: boolean, fallbackCount: number) => LikeState;
  getCounters: (id: number, baseView: number, baseUse: number) => { viewCounter: number; usedCounter: number };
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  featured: [],
  featuredLoading: false,
  featuredError: null,
  likeStates: {},
  viewDeltas: {},
  useDeltas: {},
  pendingPrompt: null,
  pendingTemplateId: null,

  loadFeatured: async () => {
    set({ featuredLoading: true, featuredError: null });
    try {
      const data = await templateApi.getFeatured();
      set({ featured: data, featuredLoading: false });
    } catch (error: any) {
      set({
        featuredError: error?.message ?? 'Failed to load templates',
        featuredLoading: false,
      });
    }
  },

  toggleLike: async (id, currentIsLiked, currentCount) => {
    // Optimistic update
    const optimisticIsLiked = !currentIsLiked;
    const optimisticCount = Math.max(0, optimisticIsLiked ? currentCount + 1 : currentCount - 1);

    set((state) => ({
      likeStates: {
        ...state.likeStates,
        [id]: { isLiked: optimisticIsLiked, likedCount: optimisticCount },
      },
    }));

    try {
      const result = await templateApi.toggleLike(id);
      // Sync with server truth
      set((state) => ({
        likeStates: {
          ...state.likeStates,
          [id]: { isLiked: result.isLiked, likedCount: result.likedCount },
        },
      }));
    } catch {
      // Rollback to original values
      set((state) => ({
        likeStates: {
          ...state.likeStates,
          [id]: { isLiked: currentIsLiked, likedCount: currentCount },
        },
      }));
    }
  },

  recordView: (id) => {
    set((state) => ({
      viewDeltas: { ...state.viewDeltas, [id]: (state.viewDeltas[id] ?? 0) + 1 },
    }));
    templateApi.recordView(id).catch(() => {});
  },

  bumpViewDelta: (id) => {
    set((state) => ({
      viewDeltas: { ...state.viewDeltas, [id]: (state.viewDeltas[id] ?? 0) + 1 },
    }));
  },

  resetDeltas: (id) => {
    set((state) => {
      const viewDeltas = { ...state.viewDeltas };
      const useDeltas = { ...state.useDeltas };
      delete viewDeltas[id];
      delete useDeltas[id];
      return { viewDeltas, useDeltas };
    });
  },

  recordUse: (id) => {
    set((state) => ({
      useDeltas: { ...state.useDeltas, [id]: (state.useDeltas[id] ?? 0) + 1 },
    }));
    templateApi.recordUse(id).catch(() => {});
  },

  setPendingPrompt: (prompt, templateId) => {
    set({ pendingPrompt: prompt, pendingTemplateId: templateId });
  },

  clearPendingPrompt: () => {
    set({ pendingPrompt: null, pendingTemplateId: null });
  },

  getLikeState: (id, fallbackIsLiked, fallbackCount) => {
    const stored = get().likeStates[id];
    if (stored !== undefined) return stored;
    return { isLiked: fallbackIsLiked, likedCount: fallbackCount };
  },

  getCounters: (id, baseView, baseUse) => {
    const { viewDeltas, useDeltas } = get();
    return {
      viewCounter: baseView + (viewDeltas[id] ?? 0),
      usedCounter: baseUse + (useDeltas[id] ?? 0),
    };
  },
}));
