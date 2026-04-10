import { create } from "zustand";
import {
  Channel,
  Document,
  DmConversation,
  Notification,
  User,
  Workspace,
} from "@/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  documents: Document[];
  members: User[];
  dmConversations: DmConversation[];
  notifications: Notification[];
  unreadCounts: Record<string, number>; // channelId → count

  // Setters
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setChannels: (channels: Channel[]) => void;
  setDocuments: (documents: Document[]) => void;
  setMembers: (members: User[]) => void;
  setDmConversations: (convs: DmConversation[]) => void;
  setNotifications: (notifs: Notification[]) => void;

  // Incrementals
  addChannel: (channel: Channel) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Unread
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  channels: [],
  documents: [],
  members: [],
  dmConversations: [],
  notifications: [],
  unreadCounts: {},

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setChannels: (channels) => set({ channels }),
  setDocuments: (documents) => set({ documents }),
  setMembers: (members) => set({ members }),
  setDmConversations: (dmConversations) => set({ dmConversations }),
  setNotifications: (notifications) => set({ notifications }),

  addChannel: (channel) => set((s) => ({ channels: [...s.channels, channel] })),
  addDocument: (document) =>
    set((s) => ({ documents: [document, ...s.documents] })),
  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),
  addNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications] })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  incrementUnread: (channelId) =>
    set((s) => ({
      unreadCounts: {
        ...s.unreadCounts,
        [channelId]: (s.unreadCounts[channelId] ?? 0) + 1,
      },
    })),
  clearUnread: (channelId) =>
    set((s) => {
      const next = { ...s.unreadCounts };
      delete next[channelId];
      return { unreadCounts: next };
    }),
}));
