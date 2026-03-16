"use client";

import { create } from "zustand";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

// UI-only state — no business logic, no persistence
export interface ChatState {
  drawerOpen: boolean;
  selectedConversationId: string | null;
  activeModel: string;
  activeProvider: string;
  streamingMessageId: string | null;
  imageMode: boolean;
  imageWidth: number;
  imageHeight: number;
  previewMode: boolean;
  referenceImage: string | null;
  referenceImageName: string | null;
  imageDenoise: number;
  activeImageProfileId: string | null;
  activeImageProfileName: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  selectConversation: (id: string | null) => void;
  setModel: (model: string) => void;
  setProvider: (provider: string) => void;
  setStreamingMessageId: (id: string | null) => void;
  toggleImageMode: () => void;
  setImageDimensions: (width: number, height: number) => void;
  togglePreviewMode: () => void;
  setReferenceImage: (dataUrl: string | null, name: string | null) => void;
  setImageDenoise: (value: number) => void;
  clearReferenceImage: () => void;
  setActiveImageProfile: (id: string | null, name: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  drawerOpen: false,
  selectedConversationId: null,
  activeModel: DEFAULT_MODEL,
  activeProvider: DEFAULT_PROVIDER,
  streamingMessageId: null,
  imageMode: false,
  imageWidth: 1024,
  imageHeight: 1024,
  previewMode: false,
  referenceImage: null,
  referenceImageName: null,
  imageDenoise: 0.65,
  activeImageProfileId: null,
  activeImageProfileName: null,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  selectConversation: (id) => set({ selectedConversationId: id }),
  setModel: (model) => set({ activeModel: model }),
  setProvider: (provider) => set({ activeProvider: provider }),
  setStreamingMessageId: (id) => set({ streamingMessageId: id }),
  toggleImageMode: () => set((s) => ({
    imageMode: !s.imageMode,
    ...(s.imageMode ? { referenceImage: null, referenceImageName: null } : {}),
  })),
  setImageDimensions: (width, height) => set({ imageWidth: width, imageHeight: height }),
  togglePreviewMode: () => set((s) => ({ previewMode: !s.previewMode })),
  setReferenceImage: (dataUrl, name) => set({ referenceImage: dataUrl, referenceImageName: name }),
  setImageDenoise: (value) => set({ imageDenoise: value }),
  clearReferenceImage: () => set({ referenceImage: null, referenceImageName: null }),
  setActiveImageProfile: (id, name) => set({ activeImageProfileId: id, activeImageProfileName: name }),
}));
