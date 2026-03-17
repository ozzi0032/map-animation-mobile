import { create } from 'zustand';
import { templateApi, type FeaturedTemplate, type TemplateItem } from '../api/templateApi';

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

  // ── Cross-tab pending prompt (Templates → Create) ──
  pendingPrompt: string | null;
  pendingTemplateId: number | null;

  // ── Actions ──
  loadFeatured: () => Promise<void>;
  toggleLike: (id: number, currentIsLiked: boolean, currentCount: number) => Promise<void>;
  recordView: (id: number) => void;
  recordUse: (id: number) => void;
  setPendingPrompt: (prompt: string, templateId: number) => void;
  clearPendingPrompt: () => void;

  // ── Like state helpers ──
  getLikeState: (id: number, fallbackIsLiked: boolean, fallbackCount: number) => LikeState;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  featured: [],
  featuredLoading: false,
  featuredError: null,
  likeStates: {},
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
    templateApi.recordView(id).catch(() => {});
  },

  recordUse: (id) => {
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
}));
