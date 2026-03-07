"use client";

import { create } from "zustand";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

// UI-only state — no business logic, no persistence
interface ChatState {
  drawerOpen: boolean;
  selectedConversationId: string | null;
  activeModel: string;
  activeProvider: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  selectConversation: (id: string | null) => void;
  setModel: (model: string) => void;
  setProvider: (provider: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  drawerOpen: false,
  selectedConversationId: null,
  activeModel: DEFAULT_MODEL,
  activeProvider: DEFAULT_PROVIDER,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  selectConversation: (id) => set({ selectedConversationId: id }),
  setModel: (model) => set({ activeModel: model }),
  setProvider: (provider) => set({ activeProvider: provider }),
}));
