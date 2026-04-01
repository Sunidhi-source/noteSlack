import { create } from "zustand";
import { Channel, Document, Workspace } from "@/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  currentChannel: Channel | null;
  currentDocument: Document | null;
  channels: Channel[];
  documents: Document[];

  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDocument: (document: Document | null) => void;
  setChannels: (channels: Channel[]) => void;
  setDocuments: (documents: Document[]) => void;
  addChannel: (channel: Channel) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  currentChannel: null,
  currentDocument: null,
  channels: [],
  documents: [],

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setChannels: (channels) => set({ channels }),
  setDocuments: (documents) => set({ documents }),
  addChannel: (channel) => set((s) => ({ channels: [...s.channels, channel] })),
  addDocument: (document) =>
    set((s) => ({ documents: [...s.documents, document] })),
  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),
}));
