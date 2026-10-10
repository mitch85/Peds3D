import { create } from 'zustand';

export type Panel = 'food' | 'toy' | 'shop' | 'diary' | 'settings' | null;

export interface Toast {
  id: number;
  text: string;
}

export interface Emote {
  icon: string;
  kind: 'thought' | 'speech';
}

interface UiStore {
  panel: Panel;
  toasts: Toast[];
  /** True while the pet plays an action sequence (eating, washing, ...). */
  busy: boolean;
  emote: Emote | null;
  openPanel(panel: Panel): void;
  toast(text: string): void;
  dismissToast(id: number): void;
  setBusy(busy: boolean): void;
  setEmote(emote: Emote | null): void;
}

let toastId = 0;

export const useUiStore = create<UiStore>((set, get) => ({
  panel: null,
  toasts: [],
  busy: false,
  emote: null,
  openPanel: (panel) => set({ panel }),
  toast(text) {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-2), { id, text }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setBusy: (busy) => {
    if (get().busy !== busy) set({ busy });
  },
  setEmote: (emote) => {
    const cur = get().emote;
    if (cur?.icon === emote?.icon && cur?.kind === emote?.kind) return;
    set({ emote });
  },
}));
